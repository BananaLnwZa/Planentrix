import { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

interface SubjectRow extends RowDataPacket {
  subject_id: string;
  subject_name: string;
  credits: number;
  classroom: string;
  teacher_name: string;
  schedule_day: number;
  start_time: string;
  end_time: string;
  term: number;
  academic_year: number;
  subject_type_id: number;
  subject_type_name: string;
  is_active: 0 | 1;
}

interface SubjectTypeRow extends RowDataPacket {
  subject_type_id: number;
  subject_type_name: string;
}

interface SubjectPayload {
  subject_id?: string;
  subject_name: string;
  credits: number;
  classroom: string;
  teacher_name: string;
  schedule_day: number;
  start_time: string;
  end_time: string;
  term: number;
  academic_year: number;
  subject_type_id: number;
}

const subjectSelect = `SELECT
  s.subject_id,
  s.subject_name,
  CAST(s.credits AS DOUBLE) AS credits,
  s.classroom,
  s.teacher_name,
  s.schedule_day,
  TIME_FORMAT(s.start_time, '%H:%i') AS start_time,
  TIME_FORMAT(s.end_time, '%H:%i') AS end_time,
  s.term,
  s.academic_year,
  s.subject_type_id,
  st.subject_type_name,
  s.is_active
FROM subjects s
INNER JOIN subject_types st ON st.subject_type_id = s.subject_type_id`;

const isAdmin = (req: Request, res: Response): boolean => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing admin ID" });
    return false;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return false;
  }

  return true;
};

const serializeSubject = (subject: SubjectRow) => ({
  ...subject,
  is_active: Boolean(subject.is_active),
});

const normalizeTime = (value: unknown): string => String(value ?? "").slice(0, 5);

const validateSubjectPayload = (
  body: Record<string, unknown>,
  requireSubjectId: boolean,
): { data?: SubjectPayload; message?: string } => {
  const subjectId = String(body.subject_id ?? "").trim();
  const subjectName = String(body.subject_name ?? "").trim();
  const classroom = String(body.classroom ?? "").trim();
  const teacherName = String(body.teacher_name ?? "").trim();
  const creditsText = String(body.credits ?? "").trim();
  const credits = Number(body.credits);
  const scheduleDay = Number(body.schedule_day);
  const startTime = normalizeTime(body.start_time);
  const endTime = normalizeTime(body.end_time);
  const term = Number(body.term);
  const academicYear = Number(body.academic_year);
  const subjectTypeId = Number(body.subject_type_id);

  if (requireSubjectId && !/^[A-Za-z0-9_-]{1,20}$/.test(subjectId)) {
    return { message: "รหัสวิชาต้องมี 1-20 ตัว และใช้ได้เฉพาะตัวอักษร ตัวเลข _ หรือ -" };
  }

  if (!subjectName || subjectName.length > 100) {
    return { message: "ชื่อวิชาต้องมีความยาว 1-100 ตัวอักษร" };
  }

  if (
    !/^[0-9](?:\.\d{1,2})?$/.test(creditsText) ||
    !Number.isFinite(credits) ||
    credits <= 0 ||
    credits > 9.99
  ) {
    return {
      message:
        "หน่วยกิตต้องอยู่ระหว่าง 0.01-9.99 และมีทศนิยมไม่เกิน 2 ตำแหน่ง",
    };
  }

  if (!classroom || classroom.length > 10) {
    return { message: "ห้องเรียนต้องมีความยาว 1-10 ตัวอักษร" };
  }

  if (!teacherName || teacherName.length > 100) {
    return { message: "ชื่อผู้สอนต้องมีความยาว 1-100 ตัวอักษร" };
  }

  if (!Number.isInteger(scheduleDay) || scheduleDay < 1 || scheduleDay > 7) {
    return { message: "วันเรียนไม่ถูกต้อง" };
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
    return { message: "เวลาเรียนไม่ถูกต้อง" };
  }

  if (startTime >= endTime) {
    return { message: "เวลาเลิกเรียนต้องอยู่หลังเวลาเริ่มเรียน" };
  }

  if (!Number.isInteger(term) || term < 1 || term > 3) {
    return { message: "เทอมต้องอยู่ระหว่าง 1-3" };
  }

  if (!Number.isInteger(academicYear) || academicYear < 1 || academicYear > 8) {
    return { message: "ชั้นปีต้องอยู่ระหว่าง 1-8" };
  }

  if (!Number.isInteger(subjectTypeId) || subjectTypeId <= 0) {
    return { message: "ประเภทวิชาไม่ถูกต้อง" };
  }

  return {
    data: {
      ...(requireSubjectId ? { subject_id: subjectId } : {}),
      subject_name: subjectName,
      credits,
      classroom,
      teacher_name: teacherName,
      schedule_day: scheduleDay,
      start_time: startTime,
      end_time: endTime,
      term,
      academic_year: academicYear,
      subject_type_id: subjectTypeId,
    },
  };
};

const subjectTypeExists = async (subjectTypeId: number): Promise<boolean> => {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT subject_type_id FROM subject_types WHERE subject_type_id = ? LIMIT 1",
    [subjectTypeId],
  );
  return rows.length > 0;
};

export const getSubjects = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const [subjects] = await db.query<SubjectRow[]>(
      `${subjectSelect}
       ORDER BY s.academic_year ASC, s.term ASC, s.subject_id ASC`,
    );
    const [subjectTypes] = await db.query<SubjectTypeRow[]>(
      `SELECT subject_type_id, subject_type_name
       FROM subject_types
       ORDER BY subject_type_id ASC`,
    );

    res.json({
      message: "Subjects retrieved successfully",
      subjects: subjects.map(serializeSubject),
      subject_types: subjectTypes,
    });
  } catch (error) {
    console.error("getSubjects error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const validation = validateSubjectPayload(req.body, true);
    if (!validation.data) {
      return res.status(400).json({ message: validation.message });
    }
    const subject = validation.data;

    const [duplicates] = await db.query<RowDataPacket[]>(
      "SELECT subject_id FROM subjects WHERE BINARY subject_id = ? LIMIT 1",
      [subject.subject_id],
    );
    if (duplicates.length > 0) {
      return res.status(409).json({ message: "รหัสวิชานี้มีอยู่ในระบบแล้ว" });
    }

    if (!(await subjectTypeExists(subject.subject_type_id))) {
      return res.status(400).json({ message: "ไม่พบประเภทวิชาที่เลือก" });
    }

    await db.query<ResultSetHeader>(
      `INSERT INTO subjects
        (subject_id, subject_name, credits, classroom, teacher_name,
         schedule_day, start_time, end_time, term, academic_year, subject_type_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subject.subject_id,
        subject.subject_name,
        subject.credits,
        subject.classroom,
        subject.teacher_name,
        subject.schedule_day,
        subject.start_time,
        subject.end_time,
        subject.term,
        subject.academic_year,
        subject.subject_type_id,
      ],
    );

    const [createdRows] = await db.query<SubjectRow[]>(
      `${subjectSelect} WHERE s.subject_id = ? LIMIT 1`,
      [subject.subject_id],
    );

    res.status(201).json({
      message: "Subject created successfully",
      subject: serializeSubject(createdRows[0]),
    });
  } catch (error) {
    console.error("createSubject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const subjectId = String(req.params.subjectId ?? "").trim();
    if (!subjectId || subjectId.length > 20) {
      return res.status(400).json({ message: "รหัสวิชาไม่ถูกต้อง" });
    }

    const validation = validateSubjectPayload(req.body, false);
    if (!validation.data) {
      return res.status(400).json({ message: validation.message });
    }
    const subject = validation.data;

    const [existingRows] = await db.query<RowDataPacket[]>(
      "SELECT subject_id FROM subjects WHERE BINARY subject_id = ? LIMIT 1",
      [subjectId],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบวิชาที่ต้องการแก้ไข" });
    }

    if (!(await subjectTypeExists(subject.subject_type_id))) {
      return res.status(400).json({ message: "ไม่พบประเภทวิชาที่เลือก" });
    }

    await db.query<ResultSetHeader>(
      `UPDATE subjects SET
        subject_name = ?, credits = ?, classroom = ?, teacher_name = ?,
        schedule_day = ?, start_time = ?, end_time = ?, term = ?,
        academic_year = ?, subject_type_id = ?
       WHERE BINARY subject_id = ?`,
      [
        subject.subject_name,
        subject.credits,
        subject.classroom,
        subject.teacher_name,
        subject.schedule_day,
        subject.start_time,
        subject.end_time,
        subject.term,
        subject.academic_year,
        subject.subject_type_id,
        subjectId,
      ],
    );

    const [updatedRows] = await db.query<SubjectRow[]>(
      `${subjectSelect} WHERE BINARY s.subject_id = ? LIMIT 1`,
      [subjectId],
    );

    res.json({
      message: "Subject updated successfully",
      subject: serializeSubject(updatedRows[0]),
    });
  } catch (error) {
    console.error("updateSubject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const subjectId = String(req.params.subjectId ?? "").trim();
    if (!subjectId || subjectId.length > 20) {
      return res.status(400).json({ message: "รหัสวิชาไม่ถูกต้อง" });
    }

    const [existingRows] = await db.query<RowDataPacket[]>(
      "SELECT subject_id FROM subjects WHERE BINARY subject_id = ? LIMIT 1",
      [subjectId],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบวิชาที่ต้องการลบ" });
    }

    await db.query<ResultSetHeader>(
      "UPDATE subjects SET is_active = 0 WHERE BINARY subject_id = ?",
      [subjectId],
    );

    const [updatedRows] = await db.query<SubjectRow[]>(
      `${subjectSelect} WHERE BINARY s.subject_id = ? LIMIT 1`,
      [subjectId],
    );

    res.json({
      message: "Subject deactivated successfully",
      subject: serializeSubject(updatedRows[0]),
    });
  } catch (error) {
    console.error("deleteSubject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSubjectStatus = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const subjectId = String(req.params.subjectId ?? "").trim();
    if (!subjectId || subjectId.length > 20) {
      return res.status(400).json({ message: "รหัสวิชาไม่ถูกต้อง" });
    }

    const isActive = req.body.is_active;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "is_active ต้องเป็น boolean" });
    }

    const [existingRows] = await db.query<RowDataPacket[]>(
      "SELECT subject_id FROM subjects WHERE BINARY subject_id = ? LIMIT 1",
      [subjectId],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบวิชาที่ต้องการเปลี่ยนสถานะ" });
    }

    await db.query<ResultSetHeader>(
      "UPDATE subjects SET is_active = ? WHERE BINARY subject_id = ?",
      [isActive ? 1 : 0, subjectId],
    );

    const [updatedRows] = await db.query<SubjectRow[]>(
      `${subjectSelect} WHERE BINARY s.subject_id = ? LIMIT 1`,
      [subjectId],
    );

    res.json({
      message: isActive
        ? "Subject restored successfully"
        : "Subject deactivated successfully",
      subject: serializeSubject(updatedRows[0]),
    });
  } catch (error) {
    console.error("updateSubjectStatus error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
