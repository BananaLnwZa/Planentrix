import type { Request, Response } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import db from "../../config/db";

type TermStatus = "draft" | "active" | "completed" | "archived";
type SectionStatus = "draft" | "open" | "closed" | "completed" | "cancelled";

interface TermRow extends RowDataPacket {
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  start_date: string;
  end_date: string;
  midterm_start_date: string | null;
  midterm_end_date: string | null;
  final_start_date: string | null;
  final_end_date: string | null;
  status: TermStatus;
}

interface SubjectOptionRow extends RowDataPacket {
  subject_id: string;
  subject_name: string;
  department_ids: string;
}

interface InstructorOptionRow extends RowDataPacket {
  admin_id: number;
  admin_name: string;
  first_name: string;
  last_name: string;
  department_id: number;
  department_name: string;
  faculty_name: string;
}

interface SectionRow extends RowDataPacket {
  section_id: number;
  subject_id: string;
  subject_name: string;
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  section_number: string;
  capacity: number | null;
  status: SectionStatus;
  created_at: string;
  updated_at: string;
}

interface AssignmentRow extends RowDataPacket {
  section_id: number;
  instructor_id: number;
  instructor_role: "owner" | "co_instructor";
  admin_name: string;
  first_name: string;
  last_name: string;
  department_name: string | null;
}

interface SectionPayload {
  subjectId: string;
  academicTermId: number;
  sectionNumber: string;
  capacity: number | null;
  status: SectionStatus;
  ownerInstructorId: number;
  coInstructorIds: number[];
}

const termSelect = `SELECT
  academic_term_id,
  academic_year,
  semester_no,
  DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
  DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
  DATE_FORMAT(midterm_start_date, '%Y-%m-%d') AS midterm_start_date,
  DATE_FORMAT(midterm_end_date, '%Y-%m-%d') AS midterm_end_date,
  DATE_FORMAT(final_start_date, '%Y-%m-%d') AS final_start_date,
  DATE_FORMAT(final_end_date, '%Y-%m-%d') AS final_end_date,
  status
FROM academic_terms`;

const sectionSelect = `SELECT
  section.section_id,
  section.subject_id,
  subject.subject_name,
  section.academic_term_id,
  term.academic_year,
  term.semester_no,
  section.section_number,
  section.capacity,
  section.status,
  section.created_at,
  section.updated_at
FROM course_sections section
INNER JOIN subjects subject ON subject.subject_id = section.subject_id
INNER JOIN academic_terms term
  ON term.academic_term_id = section.academic_term_id`;

const isAdmin = (req: Request, res: Response): number | null => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing admin ID" });
    return null;
  }
  if (req.user.role !== "university_staff") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return null;
  }
  return req.user.id;
};

const parseDate = (value: unknown): string | null => {
  const date = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
};

const parseNullableDatePair = (
  startValue: unknown,
  endValue: unknown,
): { start: string | null; end: string | null; valid: boolean } => {
  const rawStart = String(startValue ?? "").trim();
  const rawEnd = String(endValue ?? "").trim();
  if (!rawStart && !rawEnd) return { start: null, end: null, valid: true };
  const start = parseDate(rawStart);
  const end = parseDate(rawEnd);
  return {
    start,
    end,
    valid: Boolean(start && end && start <= end),
  };
};

const parseSectionPayload = (
  body: Record<string, unknown>,
): { data?: SectionPayload; message?: string } => {
  const subjectId = String(body.subject_id ?? "").trim().toUpperCase();
  const academicTermId = Number(body.academic_term_id);
  const sectionNumber = String(body.section_number ?? "").trim();
  const capacityValue = body.capacity;
  const capacity =
    capacityValue === null || capacityValue === undefined || capacityValue === ""
      ? null
      : Number(capacityValue);
  const status = String(body.status ?? "open") as SectionStatus;
  const ownerInstructorId = Number(body.owner_instructor_id);
  const coInstructorIds = Array.isArray(body.co_instructor_ids)
    ? [...new Set(body.co_instructor_ids.map(Number))]
    : [];

  if (!/^[A-Z0-9_-]{1,20}$/.test(subjectId)) {
    return { message: "กรุณาเลือกวิชา" };
  }
  if (!Number.isInteger(academicTermId) || academicTermId <= 0) {
    return { message: "กรุณาเลือกภาคการศึกษา" };
  }
  if (!sectionNumber || sectionNumber.length > 20) {
    return { message: "หมายเลขกลุ่มเรียนต้องมีความยาว 1-20 ตัวอักษร" };
  }
  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { message: "จำนวนรับต้องเป็นจำนวนเต็มมากกว่า 0" };
  }
  if (!["draft", "open", "closed", "completed", "cancelled"].includes(status)) {
    return { message: "สถานะกลุ่มเรียนไม่ถูกต้อง" };
  }
  if (!Number.isInteger(ownerInstructorId) || ownerInstructorId <= 0) {
    return { message: "กรุณาเลือกอาจารย์เจ้าของวิชา" };
  }
  if (
    coInstructorIds.some(
      (id) => !Number.isInteger(id) || id <= 0 || id === ownerInstructorId,
    )
  ) {
    return { message: "ข้อมูลอาจารย์ผู้สอนร่วมไม่ถูกต้อง" };
  }

  return {
    data: {
      subjectId,
      academicTermId,
      sectionNumber,
      capacity,
      status,
      ownerInstructorId,
      coInstructorIds,
    },
  };
};

const validateSectionReferences = async (
  connection: PoolConnection,
  payload: SectionPayload,
): Promise<string | null> => {
  const [references] = await connection.query<RowDataPacket[]>(
    `SELECT
       EXISTS(
         SELECT 1 FROM subjects
         WHERE BINARY subject_id = ? AND is_active = 1
       ) AS subject_exists,
       EXISTS(
         SELECT 1 FROM academic_terms
         WHERE academic_term_id = ? AND status IN ('draft', 'active')
       ) AS term_exists`,
    [payload.subjectId, payload.academicTermId],
  );
  if (!Number(references[0]?.subject_exists)) return "ไม่พบวิชาที่เปิดใช้งาน";
  if (!Number(references[0]?.term_exists)) return "ไม่พบภาคการศึกษาที่เลือก";

  const instructorIds = [payload.ownerInstructorId, ...payload.coInstructorIds];
  const placeholders = instructorIds.map(() => "?").join(", ");
  const [instructors] = await connection.query<RowDataPacket[]>(
    `SELECT a.admin_id
     FROM admin a
     WHERE a.admin_id IN (${placeholders})
       AND a.role = 'instructor'
       AND a.status = 'active'
       AND EXISTS (
         SELECT 1
         FROM curriculum_subjects curriculum
         WHERE BINARY curriculum.subject_id = ?
           AND curriculum.department_id = a.department_id
           AND curriculum.is_active = 1
       )`,
    [...instructorIds, payload.subjectId],
  );
  if (instructors.length !== instructorIds.length) {
    return "อาจารย์ต้องเปิดใช้งานและอยู่ในสาขาที่มีวิชานี้ในหลักสูตร";
  }
  return null;
};

const saveAssignments = async (
  connection: PoolConnection,
  sectionId: number,
  payload: SectionPayload,
  adminId: number,
) => {
  await connection.query("DELETE FROM section_instructors WHERE section_id = ?", [
    sectionId,
  ]);
  await connection.query(
    `INSERT INTO section_instructors
      (section_id, instructor_id, instructor_role, assigned_by_admin_id)
     VALUES (?, ?, 'owner', ?)`,
    [sectionId, payload.ownerInstructorId, adminId],
  );
  for (const instructorId of payload.coInstructorIds) {
    await connection.query(
      `INSERT INTO section_instructors
        (section_id, instructor_id, instructor_role, assigned_by_admin_id)
       VALUES (?, ?, 'co_instructor', ?)`,
      [sectionId, instructorId, adminId],
    );
  }
};

export const getTeachingWorkspace = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const [terms] = await db.query<TermRow[]>(
      `${termSelect} ORDER BY academic_year DESC, semester_no DESC`,
    );
    const [subjects] = await db.query<SubjectOptionRow[]>(
      `SELECT
         subject.subject_id,
         subject.subject_name,
         GROUP_CONCAT(DISTINCT curriculum.department_id
           ORDER BY curriculum.department_id SEPARATOR ',') AS department_ids
       FROM subjects subject
       INNER JOIN curriculum_subjects curriculum
         ON curriculum.subject_id = subject.subject_id
        AND curriculum.is_active = 1
       WHERE subject.is_active = 1
       GROUP BY subject.subject_id, subject.subject_name
       ORDER BY subject.subject_id`,
    );
    const [instructors] = await db.query<InstructorOptionRow[]>(
      `SELECT
         instructor.admin_id,
         instructor.admin_name,
         instructor.first_name,
         instructor.last_name,
         instructor.department_id,
         department.department_name,
         faculty.faculty_name
       FROM admin instructor
       INNER JOIN departments department
         ON department.department_id = instructor.department_id
       INNER JOIN faculties faculty ON faculty.faculty_id = department.faculty_id
       WHERE instructor.role = 'instructor'
         AND instructor.status = 'active'
         AND department.is_active = 1
         AND faculty.is_active = 1
       ORDER BY instructor.first_name, instructor.last_name, instructor.admin_id`,
    );
    const [sections] = await db.query<SectionRow[]>(
      `${sectionSelect}
       ORDER BY term.academic_year DESC, term.semester_no DESC,
         subject.subject_id, section.section_number`,
    );
    const [assignments] = await db.query<AssignmentRow[]>(
      `SELECT
         assignment.section_id,
         assignment.instructor_id,
         assignment.instructor_role,
         instructor.admin_name,
         instructor.first_name,
         instructor.last_name,
         department.department_name
       FROM section_instructors assignment
       INNER JOIN admin instructor
         ON instructor.admin_id = assignment.instructor_id
       LEFT JOIN departments department
         ON department.department_id = instructor.department_id
       ORDER BY assignment.section_id,
         FIELD(assignment.instructor_role, 'owner', 'co_instructor'),
         instructor.first_name, instructor.last_name`,
    );

    const assignmentsBySection = new Map<number, AssignmentRow[]>();
    for (const assignment of assignments) {
      const sectionAssignments = assignmentsBySection.get(assignment.section_id) ?? [];
      sectionAssignments.push(assignment);
      assignmentsBySection.set(assignment.section_id, sectionAssignments);
    }

    return res.json({
      message: "Teaching workspace retrieved successfully",
      academic_terms: terms,
      subjects: subjects.map((subject) => ({
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        department_ids: String(subject.department_ids ?? "")
          .split(",")
          .filter(Boolean)
          .map(Number),
      })),
      instructors,
      sections: sections.map((section) => ({
        ...section,
        capacity: section.capacity === null ? null : Number(section.capacity),
        instructors: assignmentsBySection.get(Number(section.section_id)) ?? [],
      })),
    });
  } catch (error) {
    console.error("getTeachingWorkspace error:", error);
    return res.status(500).json({ message: "ไม่สามารถโหลดข้อมูลการเปิดสอนได้" });
  }
};

export const createAcademicTerm = async (req: Request, res: Response) => {
  const adminId = isAdmin(req, res);
  if (!adminId) return;

  const academicYear = Number(req.body.academic_year);
  const semesterNo = Number(req.body.semester_no);
  const startDate = parseDate(req.body.start_date);
  const endDate = parseDate(req.body.end_date);
  const midterm = parseNullableDatePair(
    req.body.midterm_start_date,
    req.body.midterm_end_date,
  );
  const final = parseNullableDatePair(
    req.body.final_start_date,
    req.body.final_end_date,
  );
  const status = String(req.body.status ?? "active") as TermStatus;

  if (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > 3000) {
    return res.status(400).json({ message: "ปีการศึกษาต้องอยู่ระหว่าง 2000-3000" });
  }
  if (![1, 2, 3].includes(semesterNo)) {
    return res.status(400).json({ message: "ภาคเรียนต้องเป็น 1, 2 หรือ 3" });
  }
  if (!startDate || !endDate || startDate > endDate) {
    return res.status(400).json({ message: "ช่วงวันเปิดภาคการศึกษาไม่ถูกต้อง" });
  }
  if (!midterm.valid || !final.valid) {
    return res.status(400).json({ message: "กรุณากรอกวันเริ่มและสิ้นสุดการสอบให้ครบและถูกต้อง" });
  }
  if (!["draft", "active", "completed", "archived"].includes(status)) {
    return res.status(400).json({ message: "สถานะภาคการศึกษาไม่ถูกต้อง" });
  }

  try {
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO academic_terms
        (academic_year, semester_no, start_date, end_date,
         midterm_start_date, midterm_end_date,
         final_start_date, final_end_date, status, created_by_admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        academicYear,
        semesterNo,
        startDate,
        endDate,
        midterm.start,
        midterm.end,
        final.start,
        final.end,
        status,
        adminId,
      ],
    );
    const [created] = await db.query<TermRow[]>(
      `${termSelect} WHERE academic_term_id = ? LIMIT 1`,
      [result.insertId],
    );
    return res.status(201).json({
      message: "Academic term created successfully",
      academic_term: created[0],
    });
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "ปีการศึกษาและภาคเรียนนี้มีอยู่แล้ว" });
    }
    console.error("createAcademicTerm error:", error);
    return res.status(500).json({ message: "ไม่สามารถสร้างภาคการศึกษาได้" });
  }
};

export const createCourseSection = async (req: Request, res: Response) => {
  const adminId = isAdmin(req, res);
  if (!adminId) return;
  const validation = parseSectionPayload(req.body);
  if (!validation.data) {
    return res.status(400).json({ message: validation.message });
  }
  const payload = validation.data;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const referenceError = await validateSectionReferences(connection, payload);
    if (referenceError) {
      await connection.rollback();
      return res.status(400).json({ message: referenceError });
    }
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO course_sections
        (subject_id, academic_term_id, section_number, capacity,
         status, created_by_admin_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.subjectId,
        payload.academicTermId,
        payload.sectionNumber,
        payload.capacity,
        payload.status,
        adminId,
      ],
    );
    await saveAssignments(connection, result.insertId, payload, adminId);
    await connection.commit();
    return res.status(201).json({
      message: "Course section and instructors created successfully",
      section_id: result.insertId,
    });
  } catch (error: unknown) {
    await connection.rollback();
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "วิชา กลุ่มเรียน และภาคการศึกษานี้มีอยู่แล้ว" });
    }
    console.error("createCourseSection error:", error);
    return res.status(500).json({ message: "ไม่สามารถเปิดกลุ่มเรียนได้" });
  } finally {
    connection.release();
  }
};

export const updateCourseSection = async (req: Request, res: Response) => {
  const adminId = isAdmin(req, res);
  if (!adminId) return;
  const sectionId = Number(req.params.sectionId);
  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    return res.status(400).json({ message: "รหัสกลุ่มเรียนไม่ถูกต้อง" });
  }
  const validation = parseSectionPayload(req.body);
  if (!validation.data) {
    return res.status(400).json({ message: validation.message });
  }
  const payload = validation.data;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT section_id FROM course_sections
       WHERE section_id = ? LIMIT 1 FOR UPDATE`,
      [sectionId],
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบกลุ่มเรียน" });
    }
    const referenceError = await validateSectionReferences(connection, payload);
    if (referenceError) {
      await connection.rollback();
      return res.status(400).json({ message: referenceError });
    }
    await connection.query(
      `UPDATE course_sections
       SET subject_id = ?, academic_term_id = ?, section_number = ?,
           capacity = ?, status = ?
       WHERE section_id = ?`,
      [
        payload.subjectId,
        payload.academicTermId,
        payload.sectionNumber,
        payload.capacity,
        payload.status,
        sectionId,
      ],
    );
    await saveAssignments(connection, sectionId, payload, adminId);
    await connection.commit();
    return res.json({ message: "Course section updated successfully" });
  } catch (error: unknown) {
    await connection.rollback();
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "วิชา กลุ่มเรียน และภาคการศึกษานี้มีอยู่แล้ว" });
    }
    console.error("updateCourseSection error:", error);
    return res.status(500).json({ message: "ไม่สามารถแก้ไขกลุ่มเรียนได้" });
  } finally {
    connection.release();
  }
};

export const updateCourseSectionStatus = async (
  req: Request,
  res: Response,
) => {
  if (!isAdmin(req, res)) return;
  const sectionId = Number(req.params.sectionId);
  const status = String(req.body.status ?? "") as SectionStatus;
  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    return res.status(400).json({ message: "รหัสกลุ่มเรียนไม่ถูกต้อง" });
  }
  if (!["draft", "open", "closed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "สถานะกลุ่มเรียนไม่ถูกต้อง" });
  }
  try {
    const [result] = await db.query<ResultSetHeader>(
      "UPDATE course_sections SET status = ? WHERE section_id = ?",
      [status, sectionId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบกลุ่มเรียน" });
    }
    return res.json({ message: "Course section status updated successfully" });
  } catch (error) {
    console.error("updateCourseSectionStatus error:", error);
    return res.status(500).json({ message: "ไม่สามารถเปลี่ยนสถานะกลุ่มเรียนได้" });
  }
};
