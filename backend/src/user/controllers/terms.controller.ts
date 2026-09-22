import type { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

interface CurrentTermRow extends RowDataPacket {
  term_id: number;
  user_id: number;
  term: number;
  academic_year: number;
  semester: string;
  start_midterm: string | null;
  end_midterm: string | null;
  start_final: string | null;
  end_final: string | null;
  term_status: 0 | 1;
}

interface AcademicTermRow extends RowDataPacket {
  academic_term_id: number;
}

interface UserDepartmentRow extends RowDataPacket {
  department_id: number;
}

const currentTermSelect = `
  SELECT student_term.student_term_id AS term_id,
         student_term.user_id,
         academic_term.semester_no AS term,
         student_term.year_level AS academic_year,
         CAST(academic_term.academic_year AS CHAR) AS semester,
         DATE_FORMAT(academic_term.midterm_start_date, '%Y-%m-%d') AS start_midterm,
         DATE_FORMAT(academic_term.midterm_end_date, '%Y-%m-%d') AS end_midterm,
         DATE_FORMAT(academic_term.final_start_date, '%Y-%m-%d') AS start_final,
         DATE_FORMAT(academic_term.final_end_date, '%Y-%m-%d') AS end_final,
         IF(student_term.status = 'active', 1, 0) AS term_status
  FROM student_terms student_term
  INNER JOIN academic_terms academic_term
    ON academic_term.academic_term_id = student_term.academic_term_id
  WHERE student_term.user_id = ? AND student_term.status = 'active'
  ORDER BY student_term.student_term_id DESC
  LIMIT 1`;

const authenticatedUserId = (req: Request, res: Response): number | null => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing user ID" });
    return null;
  }
  if (req.user.role && req.user.role !== "user") {
    res.status(403).json({ message: "Forbidden: user role required" });
    return null;
  }
  return Number(req.user.id);
};

const validDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const addTerm = async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req, res);
  if (userId === null) return;

  const yearLevel = Number(req.body.academic_year);
  const academicYear = Number(req.body.semester);
  const semesterNo = Number(req.body.term);
  const midtermStart = req.body.start_midterm;
  const midtermEnd = req.body.end_midterm;
  const finalStart = req.body.start_final;
  const finalEnd = req.body.end_final;

  if (
    !Number.isInteger(yearLevel) ||
    yearLevel < 1 ||
    yearLevel > 4 ||
    !Number.isInteger(academicYear) ||
    academicYear < 2000 ||
    academicYear > 9999 ||
    ![1, 2].includes(semesterNo) ||
    !validDate(midtermStart) ||
    !validDate(midtermEnd) ||
    !validDate(finalStart) ||
    !validDate(finalEnd)
  ) {
    return res.status(400).json({
      message: "กรุณาระบุชั้นปี ปีการศึกษา เทอม และช่วงวันสอบให้ถูกต้อง",
    });
  }
  if (midtermEnd <= midtermStart || finalEnd <= finalStart || finalStart <= midtermEnd) {
    return res.status(400).json({ message: "ช่วงวันสอบเรียงลำดับไม่ถูกต้อง" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [activeRows] = await connection.query<CurrentTermRow[]>(
      `${currentTermSelect} FOR UPDATE`,
      [userId],
    );
    if (activeRows[0]) {
      await connection.rollback();
      return res.status(409).json({ message: "มีเทอมที่กำลังใช้งานอยู่แล้ว" });
    }

    const [academicTerms] = await connection.query<AcademicTermRow[]>(
      `SELECT academic_term_id
       FROM academic_terms
       WHERE academic_year = ?
         AND semester_no = ?
         AND status IN ('draft', 'active')
       ORDER BY status = 'active' DESC, academic_term_id DESC
       LIMIT 1`,
      [academicYear, semesterNo],
    );
    if (!academicTerms[0]) {
      await connection.rollback();
      return res.status(404).json({
        message: "ยังไม่มีปีการศึกษาและเทอมนี้ในระบบ กรุณาติดต่อผู้ดูแลระบบ",
      });
    }

    const [users] = await connection.query<UserDepartmentRow[]>(
      "SELECT department_id FROM user WHERE user_id = ? LIMIT 1 FOR UPDATE",
      [userId],
    );
    if (!users[0]) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const [termResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO student_terms
         (user_id, academic_term_id, department_id, year_level, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [
        userId,
        academicTerms[0].academic_term_id,
        users[0].department_id,
        yearLevel,
      ],
    );

    const [enrollmentResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO enrollments
         (student_term_id, section_id, target_grade_code, status)
       SELECT ?, selected.section_id, NULL, 'enrolled'
       FROM (
         SELECT MIN(section.section_id) AS section_id
         FROM curriculum_subjects curriculum
         INNER JOIN course_sections section
           ON section.subject_id = curriculum.subject_id
          AND section.academic_term_id = ?
          AND section.status IN ('open', 'closed')
         WHERE curriculum.department_id = ?
           AND curriculum.year_level = ?
           AND curriculum.semester_no = ?
           AND curriculum.is_active = 1
         GROUP BY curriculum.subject_id
       ) selected`,
      [
        termResult.insertId,
        academicTerms[0].academic_term_id,
        users[0].department_id,
        yearLevel,
        semesterNo,
      ],
    );
    await connection.commit();
    return res.status(201).json({
      message: "Term and enrollments added successfully",
      term_id: termResult.insertId,
      user_id: userId,
      schedule: {
        total_subjects_found: enrollmentResult.affectedRows,
        newly_added: enrollmentResult.affectedRows,
        skipped_count: 0,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("addTerm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};

export const getCurrentTerm = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const [rows] = await db.query<CurrentTermRow[]>(currentTermSelect, [userId]);
    if (!rows[0]) return res.status(404).json({ message: "No current term found" });
    return res.json({
      message: "Current term retrieved successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("getCurrentTerm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const endCurrentTerm = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const [rows] = await db.query<CurrentTermRow[]>(currentTermSelect, [userId]);
    const term = rows[0];
    if (!term) return res.status(404).json({ message: "No current term to end" });

    const [activeSessions] = await db.query<RowDataPacket[]>(
      `SELECT session.study_session_id
       FROM study_sessions session
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = session.enrollment_id
       WHERE enrollment.student_term_id = ?
         AND session.status IN ('running', 'paused', 'interrupted')
       LIMIT 1`,
      [term.term_id],
    );
    if (activeSessions[0]) {
      return res.status(409).json({
        message: "Please finish the active study timer before ending the term",
        study_time_id: activeSessions[0].study_session_id,
      });
    }

    await db.query(
      `UPDATE student_terms
       SET status = 'completed', completed_at = NOW()
       WHERE student_term_id = ? AND user_id = ? AND status = 'active'`,
      [term.term_id, userId],
    );
    return res.json({ message: "Term ended successfully", ended_term: term });
  } catch (error) {
    console.error("endCurrentTerm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
