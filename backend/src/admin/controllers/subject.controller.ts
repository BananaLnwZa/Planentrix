import { Request, Response } from "express";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";

interface SubjectRow extends RowDataPacket {
  curriculum_subject_id: number;
  subject_id: string;
  subject_name: string;
  credits: number;
  subject_type_id: number;
  subject_type_name: string;
  department_id: number;
  department_code: string;
  department_name: string;
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  academic_year: number;
  term: number;
  is_required: 0 | 1;
  is_active: 0 | 1;
}

interface SubjectPayload {
  subject_id?: string;
  subject_name: string;
  credits: number;
  subject_type_id: number;
  curriculum_subject_id?: number;
  department_id: number;
  academic_year: number;
  term: number;
  is_required: boolean;
}

const subjectSelect = `SELECT
  cs.curriculum_subject_id,
  s.subject_id,
  s.subject_name,
  CAST(s.credits AS UNSIGNED) AS credits,
  s.subject_type_id,
  st.subject_type_name,
  cs.department_id,
  d.department_code,
  d.department_name,
  f.faculty_id,
  f.faculty_code,
  f.faculty_name,
  cs.year_level AS academic_year,
  cs.semester_no AS term,
  cs.is_required,
  (s.is_active = 1 AND cs.is_active = 1) AS is_active
FROM subjects s
INNER JOIN subject_types st ON st.subject_type_id = s.subject_type_id
INNER JOIN curriculum_subjects cs ON cs.subject_id = s.subject_id
INNER JOIN departments d ON d.department_id = cs.department_id
INNER JOIN faculties f ON f.faculty_id = d.faculty_id`;

const isAdmin = (req: Request, res: Response): boolean => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing admin ID" });
    return false;
  }
  if (req.user.role !== "university_staff") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return false;
  }
  return true;
};

const serializeSubject = (subject: SubjectRow) => ({
  ...subject,
  is_required: Boolean(subject.is_required),
  is_active: Boolean(subject.is_active),
});

const validateSubjectPayload = (
  body: Record<string, unknown>,
  requireSubjectId: boolean,
): { data?: SubjectPayload; message?: string } => {
  const subjectId = String(body.subject_id ?? "").trim().toUpperCase();
  const subjectName = String(body.subject_name ?? "").trim();
  const credits = Number(body.credits);
  const subjectTypeId = Number(body.subject_type_id);
  const curriculumSubjectId = Number(body.curriculum_subject_id);
  const departmentId = Number(body.department_id);
  const academicYear = Number(body.academic_year);
  const term = Number(body.term);
  const isRequired = body.is_required;

  if (requireSubjectId && !/^[A-Z0-9_-]{1,20}$/.test(subjectId)) {
    return { message: "รหัสวิชาต้องมี 1–20 ตัว และใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข _ หรือ -" };
  }
  if (!subjectName || subjectName.length > 200) {
    return { message: "ชื่อวิชาต้องมีความยาว 1–200 ตัวอักษร" };
  }
  if (!Number.isInteger(credits) || credits < 1 || credits > 9) {
    return { message: "หน่วยกิตต้องเป็นจำนวนเต็มระหว่าง 1–9" };
  }
  if (!Number.isInteger(subjectTypeId) || subjectTypeId <= 0) {
    return { message: "ประเภทวิชาไม่ถูกต้อง" };
  }
  if (!requireSubjectId && (!Number.isInteger(curriculumSubjectId) || curriculumSubjectId <= 0)) {
    return { message: "ข้อมูลหลักสูตรของวิชาไม่ถูกต้อง" };
  }
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return { message: "กรุณาเลือกสาขาวิชา" };
  }
  if (!Number.isInteger(academicYear) || academicYear < 1 || academicYear > 4) {
    return { message: "ชั้นปีต้องอยู่ระหว่าง 1–4" };
  }
  if (!Number.isInteger(term) || term < 1 || term > 3) {
    return { message: "ภาคเรียนต้องอยู่ระหว่าง 1–3" };
  }
  if (typeof isRequired !== "boolean") {
    return { message: "กรุณาระบุว่าเป็นวิชาบังคับหรือวิชาเลือก" };
  }

  return {
    data: {
      ...(requireSubjectId ? { subject_id: subjectId } : {}),
      ...(!requireSubjectId ? { curriculum_subject_id: curriculumSubjectId } : {}),
      subject_name: subjectName,
      credits,
      subject_type_id: subjectTypeId,
      department_id: departmentId,
      academic_year: academicYear,
      term,
      is_required: isRequired,
    },
  };
};

type DatabaseConnection = PoolConnection | typeof db;

const validateReferences = async (
  subjectTypeId: number,
  departmentId: number,
  connection: DatabaseConnection = db,
): Promise<string | null> => {
  const [subjectTypes] = await connection.query<RowDataPacket[]>(
    "SELECT subject_type_id FROM subject_types WHERE subject_type_id = ? AND is_active = 1 LIMIT 1",
    [subjectTypeId],
  );
  if (subjectTypes.length === 0) return "ไม่พบประเภทวิชาที่เลือกหรือประเภทถูกปิดใช้งาน";

  const [departments] = await connection.query<RowDataPacket[]>(
    `SELECT d.department_id
     FROM departments d
     INNER JOIN faculties f ON f.faculty_id = d.faculty_id
     WHERE d.department_id = ? AND d.is_active = 1 AND f.is_active = 1
     LIMIT 1`,
    [departmentId],
  );
  return departments.length === 0 ? "ไม่พบสาขาที่เลือกหรือคณะ/สาขาถูกปิดใช้งาน" : null;
};

const getSubjectRow = async (
  subjectId: string,
  curriculumSubjectId: number,
  connection: DatabaseConnection = db,
) => {
  const [rows] = await connection.query<SubjectRow[]>(
    `${subjectSelect}
     WHERE BINARY s.subject_id = ? AND cs.curriculum_subject_id = ?
     LIMIT 1`,
    [subjectId, curriculumSubjectId],
  );
  return rows[0];
};

export const getSubjects = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const [subjects] = await db.query<SubjectRow[]>(
      `${subjectSelect}
       ORDER BY cs.year_level ASC, cs.semester_no ASC, s.subject_id ASC`,
    );
    const [subjectTypes] = await db.query<RowDataPacket[]>(
      `SELECT subject_type_id, subject_type_name
       FROM subject_types
       WHERE is_active = 1
       ORDER BY subject_type_name ASC`,
    );
    const [faculties] = await db.query<RowDataPacket[]>(
      `SELECT faculty_id, faculty_code, faculty_name
       FROM faculties
       WHERE is_active = 1
       ORDER BY faculty_name ASC`,
    );
    const [departments] = await db.query<RowDataPacket[]>(
      `SELECT department_id, department_code, department_name, faculty_id
       FROM departments
       WHERE is_active = 1
       ORDER BY department_name ASC`,
    );

    res.json({
      message: "Subjects retrieved successfully",
      subjects: subjects.map(serializeSubject),
      subject_types: subjectTypes,
      faculties,
      departments,
    });
  } catch (error) {
    console.error("getSubjects error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const validation = validateSubjectPayload(req.body, true);
  if (!validation.data) return res.status(400).json({ message: validation.message });
  const subject = validation.data;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const referenceError = await validateReferences(
      subject.subject_type_id,
      subject.department_id,
      connection,
    );
    if (referenceError) {
      await connection.rollback();
      return res.status(400).json({ message: referenceError });
    }

    const [duplicates] = await connection.query<RowDataPacket[]>(
      "SELECT subject_id FROM subjects WHERE BINARY subject_id = ? LIMIT 1 FOR UPDATE",
      [subject.subject_id],
    );
    if (duplicates.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "รหัสวิชานี้มีอยู่ในระบบแล้ว" });
    }

    await connection.query<ResultSetHeader>(
      `INSERT INTO subjects
        (subject_id, subject_name, credits, subject_type_id, is_active, created_by_admin_id)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [subject.subject_id, subject.subject_name, subject.credits, subject.subject_type_id, req.user!.id],
    );
    const [curriculumResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO curriculum_subjects
        (department_id, subject_id, year_level, semester_no, is_required, is_active, created_by_admin_id)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [
        subject.department_id,
        subject.subject_id,
        subject.academic_year,
        subject.term,
        subject.is_required ? 1 : 0,
        req.user!.id,
      ],
    );
    await connection.commit();

    const created = await getSubjectRow(subject.subject_id!, curriculumResult.insertId);
    res.status(201).json({
      message: "Subject created successfully",
      subject: serializeSubject(created),
    });
  } catch (error) {
    await connection.rollback();
    const databaseError = error as { code?: string };
    if (databaseError.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "วิชานี้มีอยู่ในหลักสูตรที่เลือกแล้ว" });
    }
    console.error("createSubject error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const subjectId = String(req.params.subjectId ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,20}$/.test(subjectId)) {
    return res.status(400).json({ message: "รหัสวิชาไม่ถูกต้อง" });
  }
  const validation = validateSubjectPayload(req.body, false);
  if (!validation.data) return res.status(400).json({ message: validation.message });
  const subject = validation.data;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const referenceError = await validateReferences(
      subject.subject_type_id,
      subject.department_id,
      connection,
    );
    if (referenceError) {
      await connection.rollback();
      return res.status(400).json({ message: referenceError });
    }

    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT cs.curriculum_subject_id
       FROM curriculum_subjects cs
       WHERE cs.curriculum_subject_id = ? AND BINARY cs.subject_id = ?
       LIMIT 1 FOR UPDATE`,
      [subject.curriculum_subject_id, subjectId],
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบวิชาที่ต้องการแก้ไข" });
    }

    await connection.query<ResultSetHeader>(
      `UPDATE subjects
       SET subject_name = ?, credits = ?, subject_type_id = ?
       WHERE BINARY subject_id = ?`,
      [subject.subject_name, subject.credits, subject.subject_type_id, subjectId],
    );
    await connection.query<ResultSetHeader>(
      `UPDATE curriculum_subjects
       SET department_id = ?, year_level = ?, semester_no = ?, is_required = ?
       WHERE curriculum_subject_id = ? AND BINARY subject_id = ?`,
      [
        subject.department_id,
        subject.academic_year,
        subject.term,
        subject.is_required ? 1 : 0,
        subject.curriculum_subject_id,
        subjectId,
      ],
    );
    await connection.commit();

    const updated = await getSubjectRow(subjectId, subject.curriculum_subject_id!);
    res.json({
      message: "Subject updated successfully",
      subject: serializeSubject(updated),
    });
  } catch (error) {
    await connection.rollback();
    const databaseError = error as { code?: string };
    if (databaseError.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "วิชานี้มีอยู่ในหลักสูตรที่เลือกแล้ว" });
    }
    console.error("updateSubject error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};

const setSubjectStatus = async (req: Request, res: Response, isActive: boolean) => {
  if (!isAdmin(req, res)) return;
  const subjectId = String(req.params.subjectId ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,20}$/.test(subjectId)) {
    return res.status(400).json({ message: "รหัสวิชาไม่ถูกต้อง" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT curriculum_subject_id FROM curriculum_subjects
       WHERE BINARY subject_id = ? ORDER BY curriculum_subject_id ASC LIMIT 1 FOR UPDATE`,
      [subjectId],
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบวิชาที่ต้องการเปลี่ยนสถานะ" });
    }
    await connection.query(
      "UPDATE subjects SET is_active = ? WHERE BINARY subject_id = ?",
      [isActive ? 1 : 0, subjectId],
    );
    await connection.query(
      "UPDATE curriculum_subjects SET is_active = ? WHERE BINARY subject_id = ?",
      [isActive ? 1 : 0, subjectId],
    );
    await connection.commit();

    const updated = await getSubjectRow(subjectId, Number(existing[0].curriculum_subject_id));
    res.json({
      message: isActive ? "Subject restored successfully" : "Subject deactivated successfully",
      subject: serializeSubject(updated),
    });
  } catch (error) {
    await connection.rollback();
    console.error("setSubjectStatus error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};

export const deleteSubject = async (req: Request, res: Response) =>
  setSubjectStatus(req, res, false);

export const updateSubjectStatus = async (req: Request, res: Response) => {
  if (typeof req.body.is_active !== "boolean") {
    return res.status(400).json({ message: "is_active ต้องเป็น boolean" });
  }
  return setSubjectStatus(req, res, req.body.is_active);
};
