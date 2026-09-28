import type { Request, Response } from "express";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
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

interface CurriculumSubjectRow extends RowDataPacket {
  subject_id: string;
  subject_name: string;
}

interface SectionCandidateRow extends RowDataPacket {
  section_id: number;
  subject_id: string;
  subject_name: string;
  section_number: string;
  capacity: number | null;
  enrolled_count: number;
}

interface SectionInstructorRow extends RowDataPacket {
  section_id: number;
  instructor_id: number;
  instructor_role: "owner" | "co_instructor";
  first_name: string;
  last_name: string;
  admin_name: string;
}

interface SectionMeetingRow extends RowDataPacket {
  class_meeting_id: number;
  section_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  classroom: string | null;
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

const termSelectionInput = (source: Record<string, unknown>) => ({
  yearLevel: Number(source.year_level),
  academicYear: Number(source.academic_year),
  semesterNo: Number(source.semester_no),
});

const validTermSelectionInput = ({
  yearLevel,
  academicYear,
  semesterNo,
}: ReturnType<typeof termSelectionInput>) =>
  Number.isInteger(yearLevel) &&
  yearLevel >= 1 &&
  yearLevel <= 4 &&
  Number.isInteger(academicYear) &&
  academicYear >= 2000 &&
  academicYear <= 9999 &&
  [1, 2].includes(semesterNo);

const findAcademicTerm = async (
  academicYear: number,
  semesterNo: number,
  connection: typeof db | PoolConnection = db,
) => {
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
  return academicTerms[0] ?? null;
};

const findUserDepartment = async (
  userId: number,
  connection: typeof db | PoolConnection = db,
) => {
  const [users] = await connection.query<UserDepartmentRow[]>(
    "SELECT department_id FROM user WHERE user_id = ? LIMIT 1",
    [userId],
  );
  return users[0] ?? null;
};

export const getAvailableTermSections = async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req, res);
  if (userId === null) return;

  const input = termSelectionInput(req.query as Record<string, unknown>);
  if (!validTermSelectionInput(input)) {
    return res.status(400).json({
      message: "กรุณาระบุชั้นปี ปีการศึกษา และเทอมให้ถูกต้อง",
    });
  }

  try {
    const academicTerm = await findAcademicTerm(
      input.academicYear,
      input.semesterNo,
    );
    if (!academicTerm) {
      return res.status(404).json({
        message: "ยังไม่มีปีการศึกษาและเทอมนี้ในระบบ กรุณาติดต่อผู้ดูแลระบบ",
      });
    }
    const user = await findUserDepartment(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const [subjects] = await db.query<CurriculumSubjectRow[]>(
      `SELECT DISTINCT subject.subject_id, subject.subject_name
       FROM curriculum_subjects curriculum
       INNER JOIN subjects subject
         ON subject.subject_id = curriculum.subject_id
        AND subject.is_active = 1
       WHERE curriculum.department_id = ?
         AND curriculum.year_level = ?
         AND curriculum.semester_no = ?
         AND curriculum.is_active = 1
       ORDER BY subject.subject_id`,
      [user.department_id, input.yearLevel, input.semesterNo],
    );

    const [sections] = await db.query<SectionCandidateRow[]>(
      `SELECT
         section.section_id,
         subject.subject_id,
         subject.subject_name,
         section.section_number,
         section.capacity,
         COUNT(enrollment.enrollment_id) AS enrolled_count
       FROM curriculum_subjects curriculum
       INNER JOIN subjects subject
         ON subject.subject_id = curriculum.subject_id
        AND subject.is_active = 1
       INNER JOIN course_sections section
         ON section.subject_id = curriculum.subject_id
        AND section.academic_term_id = ?
        AND section.status = 'open'
       LEFT JOIN enrollments enrollment
         ON enrollment.section_id = section.section_id
        AND enrollment.status = 'enrolled'
       WHERE curriculum.department_id = ?
         AND curriculum.year_level = ?
         AND curriculum.semester_no = ?
         AND curriculum.is_active = 1
       GROUP BY section.section_id, subject.subject_id, subject.subject_name,
         section.section_number, section.capacity
       ORDER BY subject.subject_id, section.section_number, section.section_id`,
      [
        academicTerm.academic_term_id,
        user.department_id,
        input.yearLevel,
        input.semesterNo,
      ],
    );

    const sectionIds = sections.map((section) => Number(section.section_id));
    let instructors: SectionInstructorRow[] = [];
    let meetings: SectionMeetingRow[] = [];
    if (sectionIds.length > 0) {
      const placeholders = sectionIds.map(() => "?").join(", ");
      [instructors] = await db.query<SectionInstructorRow[]>(
        `SELECT assignment.section_id, assignment.instructor_id,
           assignment.instructor_role, instructor.first_name,
           instructor.last_name, instructor.admin_name
         FROM section_instructors assignment
         INNER JOIN admin instructor
           ON instructor.admin_id = assignment.instructor_id
         WHERE assignment.section_id IN (${placeholders})
         ORDER BY assignment.section_id,
           FIELD(assignment.instructor_role, 'owner', 'co_instructor'),
           instructor.first_name, instructor.last_name`,
        sectionIds,
      );
      [meetings] = await db.query<SectionMeetingRow[]>(
        `SELECT class_meeting_id, section_id, day_of_week,
           TIME_FORMAT(start_time, '%H:%i') AS start_time,
           TIME_FORMAT(end_time, '%H:%i') AS end_time, classroom
         FROM class_meetings
         WHERE section_id IN (${placeholders})
         ORDER BY section_id,
           FIELD(day_of_week, 'monday', 'tuesday', 'wednesday',
             'thursday', 'friday', 'saturday', 'sunday'),
           start_time`,
        sectionIds,
      );
    }

    return res.json({
      message: "Available course sections retrieved successfully",
      academic_term_id: Number(academicTerm.academic_term_id),
      subjects: subjects.map((subject) => ({
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        sections: sections
          .filter((section) => section.subject_id === subject.subject_id)
          .map((section) => ({
            ...section,
            section_id: Number(section.section_id),
            capacity:
              section.capacity === null ? null : Number(section.capacity),
            enrolled_count: Number(section.enrolled_count),
            is_full:
              section.capacity !== null &&
              Number(section.enrolled_count) >= Number(section.capacity),
            instructors: instructors.filter(
              (instructor) =>
                Number(instructor.section_id) === Number(section.section_id),
            ),
            meetings: meetings.filter(
              (meeting) =>
                Number(meeting.section_id) === Number(section.section_id),
            ),
          })),
      })),
    });
  } catch (error) {
    console.error("getAvailableTermSections error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
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
  const rawSectionIds = Array.isArray(req.body.section_ids)
    ? req.body.section_ids
    : [];
  const sectionIds = [
    ...new Set(
      rawSectionIds
        .map((sectionId: unknown) => Number(sectionId))
        .filter(
          (sectionId: number) =>
            Number.isInteger(sectionId) && sectionId > 0,
        ),
    ),
  ];

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
    !validDate(finalEnd) ||
    sectionIds.length !== rawSectionIds.length ||
    sectionIds.length === 0
  ) {
    return res.status(400).json({
      message:
        "กรุณาระบุชั้นปี ปีการศึกษา เทอม ช่วงวันสอบ และเลือกกลุ่มเรียนให้ครบ",
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

    const academicTerm = await findAcademicTerm(
      academicYear,
      semesterNo,
      connection,
    );
    if (!academicTerm) {
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

    const [curriculumSubjects] = await connection.query<CurriculumSubjectRow[]>(
      `SELECT DISTINCT subject.subject_id, subject.subject_name
       FROM curriculum_subjects curriculum
       INNER JOIN subjects subject
         ON subject.subject_id = curriculum.subject_id
        AND subject.is_active = 1
       WHERE curriculum.department_id = ?
         AND curriculum.year_level = ?
         AND curriculum.semester_no = ?
         AND curriculum.is_active = 1
       ORDER BY subject.subject_id`,
      [users[0].department_id, yearLevel, semesterNo],
    );
    const placeholders = sectionIds.map(() => "?").join(", ");
    const [selectedSections] = await connection.query<SectionCandidateRow[]>(
      `SELECT section.section_id, section.subject_id, subject.subject_name,
         section.section_number, section.capacity, 0 AS enrolled_count
       FROM course_sections section
       INNER JOIN subjects subject
         ON subject.subject_id = section.subject_id
        AND subject.is_active = 1
       INNER JOIN curriculum_subjects curriculum
         ON curriculum.subject_id = section.subject_id
        AND curriculum.department_id = ?
        AND curriculum.year_level = ?
        AND curriculum.semester_no = ?
        AND curriculum.is_active = 1
       WHERE section.section_id IN (${placeholders})
         AND section.academic_term_id = ?
         AND section.status = 'open'
       FOR UPDATE`,
      [
        users[0].department_id,
        yearLevel,
        semesterNo,
        ...sectionIds,
        academicTerm.academic_term_id,
      ],
    );

    const selectedById = new Map(
      selectedSections.map((section) => [Number(section.section_id), section]),
    );
    const uniqueSelectedSections = [...selectedById.values()];
    const selectedSubjectIds = new Set(
      uniqueSelectedSections.map((section) => section.subject_id),
    );
    const requiredSubjectIds = new Set(
      curriculumSubjects.map((subject) => subject.subject_id),
    );
    const validSelection =
      selectedById.size === sectionIds.length &&
      selectedSubjectIds.size === uniqueSelectedSections.length &&
      selectedSubjectIds.size === requiredSubjectIds.size &&
      [...requiredSubjectIds].every((subjectId) =>
        selectedSubjectIds.has(subjectId),
      );
    if (!validSelection) {
      await connection.rollback();
      return res.status(409).json({
        message:
          "กรุณาเลือกหนึ่งกลุ่มเรียนที่เปิดอยู่ให้ครบทุกวิชาในหลักสูตร",
      });
    }

    const [enrollmentCounts] = await connection.query<RowDataPacket[]>(
      `SELECT section_id, COUNT(*) AS enrolled_count
       FROM enrollments
       WHERE section_id IN (${placeholders}) AND status = 'enrolled'
       GROUP BY section_id`,
      sectionIds,
    );
    const enrollmentCountBySection = new Map(
      enrollmentCounts.map((row) => [
        Number(row.section_id),
        Number(row.enrolled_count),
      ]),
    );
    const fullSection = uniqueSelectedSections.find(
      (section) =>
        section.capacity !== null &&
        (enrollmentCountBySection.get(Number(section.section_id)) ?? 0) >=
          Number(section.capacity),
    );
    if (fullSection) {
      await connection.rollback();
      return res.status(409).json({
        message: `${fullSection.subject_name} กลุ่ม ${fullSection.section_number} เต็มแล้ว กรุณาเลือกกลุ่มอื่น`,
      });
    }

    const [selectedMeetings] = await connection.query<SectionMeetingRow[]>(
      `SELECT class_meeting_id, section_id, day_of_week,
         TIME_FORMAT(start_time, '%H:%i') AS start_time,
         TIME_FORMAT(end_time, '%H:%i') AS end_time, classroom
       FROM class_meetings
       WHERE section_id IN (${placeholders})
       ORDER BY day_of_week, start_time`,
      sectionIds,
    );
    for (let index = 0; index < selectedMeetings.length; index += 1) {
      const first = selectedMeetings[index];
      for (
        let comparisonIndex = index + 1;
        comparisonIndex < selectedMeetings.length;
        comparisonIndex += 1
      ) {
        const second = selectedMeetings[comparisonIndex];
        if (
          Number(first.section_id) !== Number(second.section_id) &&
          first.day_of_week === second.day_of_week &&
          first.start_time < second.end_time &&
          first.end_time > second.start_time
        ) {
          const firstSection = selectedById.get(Number(first.section_id));
          const secondSection = selectedById.get(Number(second.section_id));
          await connection.rollback();
          return res.status(409).json({
            message: `เวลาเรียนชนกันระหว่าง ${firstSection?.subject_name} กลุ่ม ${firstSection?.section_number} และ ${secondSection?.subject_name} กลุ่ม ${secondSection?.section_number}`,
          });
        }
      }
    }

    const [termResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO student_terms
         (user_id, academic_term_id, department_id, year_level, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [
        userId,
        academicTerm.academic_term_id,
        users[0].department_id,
        yearLevel,
      ],
    );

    const enrollmentValues = sectionIds.map(() => "(?, ?, NULL, 'enrolled')").join(", ");
    const enrollmentParameters = sectionIds.flatMap((sectionId) => [
      termResult.insertId,
      sectionId,
    ]);
    const [enrollmentResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO enrollments
         (student_term_id, section_id, target_grade_code, status)
       VALUES ${enrollmentValues}`,
      enrollmentParameters,
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
