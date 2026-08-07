import { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

const CLASS_SCHEDULE_TYPE_ID = 1;

interface TermRow extends RowDataPacket {
  term_id: number;
  user_id: number;
  term: number;
  semester: string;
  academic_year: number;
  start_midterm: Date | null;
  end_midterm: Date | null;
  start_final: Date | null;
  end_final: Date | null;
  term_status: 0 | 1;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role?: string;
  };
}

const isValidDateString = (value: unknown) => {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// ==============================
// ADD NEW TERM
// ==============================
export const addTerm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const {
      academic_year,
      semester,
      term,
      start_midterm,
      end_midterm,
      start_final,
      end_final,
    } = req.body;

    if (
      !academic_year ||
      !semester ||
      !term ||
      !start_midterm ||
      !end_midterm ||
      !start_final ||
      !end_final
    ) {
      return res.status(400).json({
        message:
          "academic_year, semester, term, start_midterm, end_midterm, start_final, and end_final are required",
      });
    }

    const academicYearNumber = Number(academic_year);
    const termNumber = Number(term);

    if (
      !Number.isInteger(academicYearNumber) ||
      academicYearNumber < 1 ||
      academicYearNumber > 4
    ) {
      return res.status(400).json({
        message: "academic_year must be an integer between 1 and 4",
      });
    }

    if (!Number.isInteger(termNumber) || termNumber < 1 || termNumber > 2) {
      return res.status(400).json({
        message: "term must be an integer between 1 and 2",
      });
    }

    if (typeof semester !== "string" || !/^\d{4}$/.test(semester)) {
      return res.status(400).json({
        message: "semester must contain exactly 4 digits",
      });
    }

    const dateFields = { start_midterm, end_midterm, start_final, end_final };
    for (const [key, value] of Object.entries(dateFields)) {
      if (value !== undefined && value !== null && !isValidDateString(value)) {
        return res.status(400).json({
          message: `${key} must be a valid date in YYYY-MM-DD format`,
        });
      }
    }

    if (end_midterm <= start_midterm) {
      return res.status(400).json({
        message: "end_midterm must be after start_midterm",
      });
    }

    if (end_final <= start_final) {
      return res.status(400).json({
        message: "end_final must be after start_final",
      });
    }

    if (start_final <= end_midterm) {
      return res.status(400).json({
        message: "start_final must be after end_midterm",
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO terms
           (user_id, academic_year, semester, term, start_midterm, end_midterm, start_final, end_final, term_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          userId,
          academicYearNumber,
          semester,
          termNumber,
          start_midterm,
          end_midterm,
          start_final,
          end_final,
        ]
      );

      const [scheduleResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO schedule_time
           (term_id, user_id, schedule_type_id, subject_id, schedule_day, start_time, end_time, classroom, target_score, note)
         SELECT ?, ?, ?, subject_id, schedule_day, start_time, end_time, classroom, NULL, NULL
         FROM subjects
         WHERE term = ? AND academic_year = ? AND is_active = 1`,
        [
          result.insertId,
          userId,
          CLASS_SCHEDULE_TYPE_ID,
          termNumber,
          academicYearNumber,
        ]
      );

      if (scheduleResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          message: "No subjects found for this term/academic_year",
        });
      }

      await connection.commit();

      return res.status(201).json({
        message: "Term and schedule added successfully",
        term_id: result.insertId,
        user_id: userId,
        schedule: {
          total_subjects_found: scheduleResult.affectedRows,
          newly_added: scheduleResult.affectedRows,
          skipped_count: 0,
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("addTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// GET CURRENT TERM (status = 1)
// ==============================
export const getCurrentTerm = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const [rows] = await db.query<TermRow[]>(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    res.json({
      message: "Current term retrieved successfully",
      data: rows[0],
    });
  } catch (err) {
    console.error("getCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// END CURRENT TERM
// (หาเทอมปัจจุบัน status = 1 เองแล้วจบให้)
// ==============================
export const endCurrentTerm = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const [currentTermRows] = await db.query<TermRow[]>(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC
       LIMIT 1`,
      [userId]
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term to end" });
    }

    const currentTerm = currentTermRows[0];

    const [activeStudyRows] = await db.query<RowDataPacket[]>(
      `SELECT study.study_time_id
       FROM study_time study
       INNER JOIN schedule_time schedule
         ON schedule.schedule_time_id = study.schedule_time_id
       WHERE schedule.user_id = ?
         AND schedule.term_id = ?
         AND (
           study.session_status IN ('running', 'paused')
           OR (
             study.session_status = 'interrupted'
             AND study.time_spent IS NULL
           )
         )
       LIMIT 1`,
      [userId, currentTerm.term_id]
    );

    if (activeStudyRows.length > 0) {
      return res.status(409).json({
        message: "Please finish the active study timer before ending the term",
        study_time_id: activeStudyRows[0].study_time_id,
      });
    }

    await db.query(
      `UPDATE terms
       SET term_status = 0
       WHERE term_id = ? AND user_id = ?`,
      [currentTerm.term_id, userId]
    );

    res.json({
      message: "Term ended successfully",
      ended_term: currentTerm,
    });
  } catch (err) {
    console.error("endCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
