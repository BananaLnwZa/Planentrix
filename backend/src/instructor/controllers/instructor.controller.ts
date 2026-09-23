import type { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";
import { importExamFile } from "../../admin/controllers/examimport.controller";

type ExamPeriod = "midterm" | "final";

interface InstructorSubjectRow extends RowDataPacket {
  subject_id: string;
  subject_name: string;
}

interface QuestionBankRow extends RowDataPacket {
  question_bank_id: number;
  subject_id: string;
  subject_name: string;
  owner_instructor_id: number;
  bank_name: string;
  exam_period: ExamPeriod;
  default_draw_count: number;
  time_limit_minutes: number;
  status: "draft" | "published" | "archived";
  question_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

const questionBankSelect = `SELECT
  qb.question_bank_id,
  qb.subject_id,
  s.subject_name,
  qb.owner_instructor_id,
  qb.bank_name,
  qb.exam_period,
  qb.default_draw_count,
  qb.time_limit_minutes,
  qb.status,
  COUNT(q.question_id) AS question_count,
  qb.created_at,
  qb.updated_at
FROM question_banks qb
INNER JOIN subjects s ON s.subject_id = qb.subject_id
LEFT JOIN question q
  ON q.question_bank_id = qb.question_bank_id AND q.is_active = 1`;

const serializeQuestionBank = (bank: QuestionBankRow) => ({
  ...bank,
  question_bank_id: Number(bank.question_bank_id),
  owner_instructor_id: Number(bank.owner_instructor_id),
  default_draw_count: Number(bank.default_draw_count),
  time_limit_minutes: Number(bank.time_limit_minutes),
  question_count: Number(bank.question_count),
});

const requireInstructor = (req: Request, res: Response): number | null => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing instructor ID" });
    return null;
  }
  if (req.user.role !== "instructor") {
    res.status(403).json({ message: "Forbidden: Instructor access required" });
    return null;
  }
  return req.user.id;
};

const getOwnedQuestionBank = async (
  questionBankId: number,
  instructorId: number,
) => {
  const [rows] = await db.query<QuestionBankRow[]>(
    `${questionBankSelect}
     WHERE qb.question_bank_id = ? AND qb.owner_instructor_id = ?
     GROUP BY qb.question_bank_id, qb.subject_id, s.subject_name,
       qb.owner_instructor_id, qb.bank_name, qb.exam_period,
       qb.default_draw_count, qb.time_limit_minutes, qb.status,
       qb.created_at, qb.updated_at
     LIMIT 1`,
    [questionBankId, instructorId],
  );
  return rows[0];
};

export const getInstructorDashboard = (req: Request, res: Response): void => {
  res.json({
    message: "Instructor dashboard is ready",
    instructorId: req.user?.id,
  });
};

export const getInstructorExamWorkspace = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  try {
    const [subjects] = await db.query<InstructorSubjectRow[]>(
      `SELECT DISTINCT
         s.subject_id,
         s.subject_name
       FROM admin a
       INNER JOIN curriculum_subjects cs
         ON cs.department_id = a.department_id AND cs.is_active = 1
       INNER JOIN subjects s
         ON s.subject_id = cs.subject_id AND s.is_active = 1
       WHERE a.admin_id = ?
         AND a.role = 'instructor'
         AND a.status = 'active'
       ORDER BY s.subject_name, s.subject_id`,
      [instructorId],
    );

    const [questionBanks] = await db.query<QuestionBankRow[]>(
      `${questionBankSelect}
       WHERE qb.owner_instructor_id = ? AND qb.status <> 'archived'
       GROUP BY qb.question_bank_id, qb.subject_id, s.subject_name,
         qb.owner_instructor_id, qb.bank_name, qb.exam_period,
         qb.default_draw_count, qb.time_limit_minutes, qb.status,
         qb.created_at, qb.updated_at
       ORDER BY qb.updated_at DESC, qb.question_bank_id DESC`,
      [instructorId],
    );

    return res.json({
      message: "Instructor exam workspace retrieved successfully",
      subjects,
      question_banks: questionBanks.map(serializeQuestionBank),
    });
  } catch (error) {
    console.error("getInstructorExamWorkspace error:", error);
    return res.status(500).json({ message: "Unable to load exam workspace" });
  }
};

export const createInstructorQuestionBank = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  const subjectId = String(req.body.subject_id ?? "").trim().toUpperCase();
  const bankName = String(req.body.bank_name ?? "").trim();
  const examPeriod = String(req.body.exam_period ?? "") as ExamPeriod;
  const defaultDrawCount = Number(req.body.default_draw_count ?? 10);
  const timeLimitMinutes = Number(req.body.time_limit_minutes ?? 60);

  if (!/^[A-Z0-9_-]{1,20}$/.test(subjectId)) {
    return res.status(400).json({ message: "รหัสวิชาไม่ถูกต้อง" });
  }
  if (!bankName || bankName.length > 200) {
    return res.status(400).json({ message: "ชื่อพาร์ทต้องมีความยาว 1-200 ตัวอักษร" });
  }
  if (examPeriod !== "midterm" && examPeriod !== "final") {
    return res.status(400).json({ message: "ช่วงสอบต้องเป็น midterm หรือ final" });
  }
  if (
    !Number.isInteger(defaultDrawCount) ||
    defaultDrawCount < 1 ||
    defaultDrawCount > 999
  ) {
    return res.status(400).json({ message: "จำนวนข้อเริ่มต้นต้องอยู่ระหว่าง 1-999" });
  }
  if (
    !Number.isInteger(timeLimitMinutes) ||
    timeLimitMinutes < 1 ||
    timeLimitMinutes > 1440
  ) {
    return res.status(400).json({ message: "เวลาทำข้อสอบต้องอยู่ระหว่าง 1-1,440 นาที" });
  }

  try {
    const [eligibleSubjects] = await db.query<RowDataPacket[]>(
      `SELECT s.subject_id
       FROM admin a
       INNER JOIN curriculum_subjects cs
         ON cs.department_id = a.department_id AND cs.is_active = 1
       INNER JOIN subjects s
         ON s.subject_id = cs.subject_id AND s.is_active = 1
       WHERE a.admin_id = ? AND a.role = 'instructor'
         AND BINARY s.subject_id = ?
       LIMIT 1`,
      [instructorId, subjectId],
    );
    if (eligibleSubjects.length === 0) {
      return res.status(403).json({
        message: "ไม่พบรายวิชานี้ในสาขาของอาจารย์หรือรายวิชาถูกปิดใช้งาน",
      });
    }

    const [duplicates] = await db.query<RowDataPacket[]>(
      `SELECT question_bank_id
       FROM question_banks
       WHERE owner_instructor_id = ? AND BINARY subject_id = ?
         AND exam_period = ? AND BINARY bank_name = ?
         AND status <> 'archived'
       LIMIT 1`,
      [instructorId, subjectId, examPeriod, bankName],
    );
    if (duplicates.length > 0) {
      return res.status(409).json({
        message: "มีพาร์ทชื่อนี้ในรายวิชาและช่วงสอบที่เลือกแล้ว",
      });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO question_banks
        (subject_id, owner_instructor_id, bank_name, exam_period,
         default_draw_count, time_limit_minutes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      [
        subjectId,
        instructorId,
        bankName,
        examPeriod,
        defaultDrawCount,
        timeLimitMinutes,
      ],
    );

    const created = await getOwnedQuestionBank(result.insertId, instructorId);
    return res.status(201).json({
      message: "Question bank created successfully",
      question_bank: created ? serializeQuestionBank(created) : null,
    });
  } catch (error) {
    console.error("createInstructorQuestionBank error:", error);
    return res.status(500).json({ message: "Unable to create question bank" });
  }
};

export const deleteInstructorQuestionBank = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  const questionBankId = Number(req.params.bankId);
  if (!Number.isInteger(questionBankId) || questionBankId <= 0) {
    return res.status(400).json({ message: "รหัสพาร์ทไม่ถูกต้อง" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [banks] = await connection.query<RowDataPacket[]>(
      `SELECT question_bank_id FROM question_banks
       WHERE question_bank_id = ? AND owner_instructor_id = ?
       LIMIT 1 FOR UPDATE`,
      [questionBankId, instructorId],
    );
    if (banks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบพาร์ทที่ต้องการลบ" });
    }

    await connection.query(
      `DELETE FROM question WHERE question_bank_id = ?`,
      [questionBankId],
    );
    await connection.query(
      `DELETE FROM question_banks WHERE question_bank_id = ?`,
      [questionBankId],
    );
    await connection.commit();
    return res.json({ message: "Question bank deleted successfully" });
  } catch (error: unknown) {
    await connection.rollback();
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "ไม่สามารถลบพาร์ทที่มีประวัติการทำข้อสอบแล้วได้",
      });
    }
    console.error("deleteInstructorQuestionBank error:", error);
    return res.status(500).json({ message: "Unable to delete question bank" });
  } finally {
    connection.release();
  }
};

export const clearInstructorQuestionBankQuestions = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  const questionBankId = Number(req.params.bankId);
  if (!Number.isInteger(questionBankId) || questionBankId <= 0) {
    return res.status(400).json({ message: "รหัสพาร์ทไม่ถูกต้อง" });
  }

  try {
    const bank = await getOwnedQuestionBank(questionBankId, instructorId);
    if (!bank) {
      return res.status(404).json({ message: "ไม่พบพาร์ทที่ต้องการแก้ไข" });
    }
    await db.query("DELETE FROM question WHERE question_bank_id = ?", [
      questionBankId,
    ]);
    return res.json({ message: "Question bank questions cleared successfully" });
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "ไม่สามารถลบข้อสอบที่มีประวัติการทำแล้วได้",
      });
    }
    console.error("clearInstructorQuestionBankQuestions error:", error);
    return res.status(500).json({ message: "Unable to clear questions" });
  }
};

export const importInstructorExamFile = async (
  req: Request,
  res: Response,
) => {
  req.body.question_bank_id = req.params.bankId;
  return importExamFile(req, res);
};
