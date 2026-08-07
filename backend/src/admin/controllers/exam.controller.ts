import { Request, Response } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import db from "../../config/db";

interface ExamSummaryRow extends RowDataPacket {
  exam_repository_id: number;
  subject_id: string;
  subject_name: string;
  exam_name: string;
  total_score: number;
  total_question: number;
  time_limit: number;
  admin_id: number;
  admin_name: string;
  academic_year: number;
  term: number;
  subject_is_active: 0 | 1;
  part_count: number;
  attempt_count: number;
}

interface ExamPartRow extends RowDataPacket {
  exam_part_id: number;
  exam_repository_id: number;
  part_order: number;
  exam_part_name: string;
  total_question: number;
  part_score: number;
}

interface QuestionRow extends RowDataPacket {
  question_id: number;
  exam_part_id: number;
  question_order: number;
  question_text: string;
  question_score: number;
}

interface ChoiceRow extends RowDataPacket {
  choice_id: number;
  question_id: number;
  choice_order: number;
  choice_text: string;
  is_correct: 0 | 1;
}

interface ActiveSubjectRow extends RowDataPacket {
  subject_id: string;
  subject_name: string;
  academic_year: number;
  term: number;
}

interface IdRow extends RowDataPacket {
  exam_repository_id: number;
}

const examSummarySelect = `SELECT
  er.exam_repository_id,
  er.subject_id,
  s.subject_name,
  er.exam_name,
  CAST(er.total_score AS DOUBLE) AS total_score,
  er.total_question,
  er.time_limit,
  er.admin_id,
  a.admin_name,
  s.academic_year,
  s.term,
  s.is_active AS subject_is_active,
  (SELECT COUNT(*) FROM exam_part ep
   WHERE ep.exam_repository_id = er.exam_repository_id) AS part_count,
  (SELECT COUNT(*) FROM exam_score_history esh
   WHERE esh.exam_repository_id = er.exam_repository_id) AS attempt_count
FROM exam_repository er
INNER JOIN subjects s ON s.subject_id = er.subject_id
INNER JOIN admin a ON a.admin_id = er.admin_id`;

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

const parsePositiveId = (
  value: unknown,
  label: string,
  res: Response,
): number | null => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: `${label} ไม่ถูกต้อง` });
    return null;
  }
  return id;
};

const serializeExam = (exam: ExamSummaryRow) => ({
  ...exam,
  subject_is_active: Boolean(exam.subject_is_active),
  total_score: Number(exam.total_score),
  part_count: Number(exam.part_count),
  attempt_count: Number(exam.attempt_count),
});

const validateScore = (value: unknown): number | null => {
  const text = String(value ?? "").trim();
  const score = Number(text);
  if (
    !/^\d{1,3}(?:\.\d{1,2})?$/.test(text) ||
    !Number.isFinite(score) ||
    score <= 0 ||
    score > 999.99
  ) {
    return null;
  }
  return score;
};

const getExamSummary = async (
  examRepositoryId: number,
): Promise<ExamSummaryRow | undefined> => {
  const [rows] = await db.query<ExamSummaryRow[]>(
    `${examSummarySelect} WHERE er.exam_repository_id = ? LIMIT 1`,
    [examRepositoryId],
  );
  return rows[0];
};

const hasExamHistory = async (
  connection: PoolConnection,
  examRepositoryId: number,
): Promise<boolean> => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT exam_score_history_id
     FROM exam_score_history
     WHERE exam_repository_id = ?
     LIMIT 1`,
    [examRepositoryId],
  );
  return rows.length > 0;
};

const syncExamTotals = async (
  connection: PoolConnection,
  examRepositoryId: number,
) => {
  await connection.query(
    `UPDATE exam_repository er
     SET
       er.total_question = (
         SELECT COUNT(*)
         FROM question q
         INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
         WHERE ep.exam_repository_id = er.exam_repository_id
       ),
       er.total_score = (
         SELECT COALESCE(SUM(q.question_score), 0)
         FROM question q
         INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
         WHERE ep.exam_repository_id = er.exam_repository_id
       )
     WHERE er.exam_repository_id = ?`,
    [examRepositoryId],
  );
};

const syncPartAndExamTotals = async (
  connection: PoolConnection,
  examPartId: number,
) => {
  const [partRows] = await connection.query<IdRow[]>(
    `SELECT exam_repository_id
     FROM exam_part
     WHERE exam_part_id = ?
     LIMIT 1`,
    [examPartId],
  );
  if (partRows.length === 0) return;

  await connection.query(
    `UPDATE exam_part ep
     SET
       ep.total_question = (
         SELECT COUNT(*) FROM question q WHERE q.exam_part_id = ep.exam_part_id
       ),
       ep.part_score = (
         SELECT COALESCE(SUM(q.question_score), 0)
         FROM question q WHERE q.exam_part_id = ep.exam_part_id
       )
     WHERE ep.exam_part_id = ?`,
    [examPartId],
  );
  await syncExamTotals(connection, partRows[0].exam_repository_id);
};

export const getExams = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const [exams] = await db.query<ExamSummaryRow[]>(
      `${examSummarySelect}
       ORDER BY s.academic_year, s.term, er.exam_repository_id`,
    );
    const [subjects] = await db.query<ActiveSubjectRow[]>(
      `SELECT subject_id, subject_name, academic_year, term
       FROM subjects
       WHERE is_active = 1
       ORDER BY academic_year, term, subject_id`,
    );

    res.json({
      message: "Exams retrieved successfully",
      exams: exams.map(serializeExam),
      subjects,
    });
  } catch (error) {
    console.error("getExams error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getExamDetail = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;
    const examId = parsePositiveId(req.params.examId, "รหัสชุดข้อสอบ", res);
    if (!examId) return;

    const exam = await getExamSummary(examId);
    if (!exam) {
      return res.status(404).json({ message: "ไม่พบชุดข้อสอบ" });
    }

    const [parts] = await db.query<ExamPartRow[]>(
      `SELECT exam_part_id, exam_repository_id, part_order, exam_part_name,
        total_question, CAST(part_score AS DOUBLE) AS part_score
       FROM exam_part
       WHERE exam_repository_id = ?
       ORDER BY part_order, exam_part_id`,
      [examId],
    );
    const [questions] = await db.query<QuestionRow[]>(
      `SELECT q.question_id, q.exam_part_id, q.question_order, q.question_text,
        CAST(q.question_score AS DOUBLE) AS question_score
       FROM question q
       INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
       WHERE ep.exam_repository_id = ?
       ORDER BY ep.part_order, q.question_order, q.question_id`,
      [examId],
    );
    const [choices] = await db.query<ChoiceRow[]>(
      `SELECT c.choice_id, c.question_id, c.choice_order, c.choice_text,
        c.is_correct
       FROM choice c
       INNER JOIN question q ON q.question_id = c.question_id
       INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
       WHERE ep.exam_repository_id = ?
       ORDER BY ep.part_order, q.question_order, c.choice_order, c.choice_id`,
      [examId],
    );

    res.json({
      message: "Exam detail retrieved successfully",
      exam: {
        ...serializeExam(exam),
        parts: parts.map((part) => ({
          ...part,
          part_score: Number(part.part_score),
          questions: questions
            .filter((question) => question.exam_part_id === part.exam_part_id)
            .map((question) => ({
              ...question,
              question_score: Number(question.question_score),
              choices: choices
                .filter((choice) => choice.question_id === question.question_id)
                .map((choice) => ({
                  ...choice,
                  is_correct: Boolean(choice.is_correct),
                })),
            })),
        })),
      },
    });
  } catch (error) {
    console.error("getExamDetail error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createExam = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;
    const subjectId = String(req.body.subject_id ?? "").trim();
    const examName = String(req.body.exam_name ?? "").trim();
    const timeLimit = Number(req.body.time_limit);

    if (!subjectId || subjectId.length > 20) {
      return res.status(400).json({ message: "กรุณาเลือกวิชา" });
    }
    if (!examName || examName.length > 200) {
      return res.status(400).json({ message: "ชื่อชุดข้อสอบต้องมีความยาว 1-200 ตัวอักษร" });
    }
    if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 1440) {
      return res.status(400).json({ message: "เวลาทำข้อสอบต้องอยู่ระหว่าง 1-1440 นาที" });
    }

    const [subjects] = await db.query<RowDataPacket[]>(
      `SELECT subject_id FROM subjects
       WHERE BINARY subject_id = ? AND is_active = 1 LIMIT 1`,
      [subjectId],
    );
    if (subjects.length === 0) {
      return res.status(400).json({ message: "ไม่พบวิชาที่เปิดใช้งานตามที่เลือก" });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO exam_repository
        (subject_id, exam_name, total_score, total_question, time_limit, admin_id)
       VALUES (?, ?, 0, 0, ?, ?)`,
      [subjectId, examName, timeLimit, req.user!.id],
    );
    const exam = await getExamSummary(result.insertId);

    res.status(201).json({
      message: "Exam created successfully",
      exam: exam ? serializeExam(exam) : null,
    });
  } catch (error) {
    console.error("createExam error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;
    const examId = parsePositiveId(req.params.examId, "รหัสชุดข้อสอบ", res);
    if (!examId) return;

    const subjectId = String(req.body.subject_id ?? "").trim();
    const examName = String(req.body.exam_name ?? "").trim();
    const timeLimit = Number(req.body.time_limit);
    const existing = await getExamSummary(examId);
    if (!existing) return res.status(404).json({ message: "ไม่พบชุดข้อสอบ" });

    if (!subjectId || subjectId.length > 20) {
      return res.status(400).json({ message: "กรุณาเลือกวิชา" });
    }
    if (!examName || examName.length > 200) {
      return res.status(400).json({ message: "ชื่อชุดข้อสอบต้องมีความยาว 1-200 ตัวอักษร" });
    }
    if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 1440) {
      return res.status(400).json({ message: "เวลาทำข้อสอบต้องอยู่ระหว่าง 1-1440 นาที" });
    }
    if (existing.attempt_count > 0 && subjectId !== existing.subject_id) {
      return res.status(409).json({ message: "ไม่สามารถเปลี่ยนวิชาได้ เพราะมีประวัติการทำข้อสอบแล้ว" });
    }

    const [subjects] = await db.query<RowDataPacket[]>(
      `SELECT subject_id FROM subjects
       WHERE BINARY subject_id = ? AND (is_active = 1 OR subject_id = ?) LIMIT 1`,
      [subjectId, existing.subject_id],
    );
    if (subjects.length === 0) {
      return res.status(400).json({ message: "ไม่พบวิชาตามที่เลือก" });
    }

    await db.query(
      `UPDATE exam_repository
       SET subject_id = ?, exam_name = ?, time_limit = ?
       WHERE exam_repository_id = ?`,
      [subjectId, examName, timeLimit, examId],
    );
    const updated = await getExamSummary(examId);
    res.json({
      message: "Exam updated successfully",
      exam: updated ? serializeExam(updated) : null,
    });
  } catch (error) {
    console.error("updateExam error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createExamPart = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;
    const examId = parsePositiveId(req.params.examId, "รหัสชุดข้อสอบ", res);
    if (!examId) return;
    const partOrder = Number(req.body.part_order);
    const partName = String(req.body.exam_part_name ?? "").trim();
    if (!Number.isInteger(partOrder) || partOrder < 1 || partOrder > 999) {
      return res.status(400).json({ message: "ลำดับ Part ต้องอยู่ระหว่าง 1-999" });
    }
    if (!partName || partName.length > 200) {
      return res.status(400).json({ message: "ชื่อ Part ต้องมีความยาว 1-200 ตัวอักษร" });
    }
    if (!(await getExamSummary(examId))) {
      return res.status(404).json({ message: "ไม่พบชุดข้อสอบ" });
    }
    const [duplicates] = await db.query<RowDataPacket[]>(
      `SELECT exam_part_id FROM exam_part
       WHERE exam_repository_id = ? AND part_order = ? LIMIT 1`,
      [examId, partOrder],
    );
    if (duplicates.length > 0) {
      return res.status(409).json({ message: "ลำดับ Part นี้มีอยู่แล้ว" });
    }
    await db.query(
      `INSERT INTO exam_part
        (exam_repository_id, part_order, exam_part_name, total_question, part_score)
       VALUES (?, ?, ?, 0, 0)`,
      [examId, partOrder, partName],
    );
    res.status(201).json({ message: "Exam part created successfully" });
  } catch (error) {
    console.error("createExamPart error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateExamPart = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;
    const partId = parsePositiveId(req.params.partId, "รหัส Part", res);
    if (!partId) return;
    const partOrder = Number(req.body.part_order);
    const partName = String(req.body.exam_part_name ?? "").trim();
    if (!Number.isInteger(partOrder) || partOrder < 1 || partOrder > 999) {
      return res.status(400).json({ message: "ลำดับ Part ต้องอยู่ระหว่าง 1-999" });
    }
    if (!partName || partName.length > 200) {
      return res.status(400).json({ message: "ชื่อ Part ต้องมีความยาว 1-200 ตัวอักษร" });
    }
    const [parts] = await db.query<ExamPartRow[]>(
      "SELECT * FROM exam_part WHERE exam_part_id = ? LIMIT 1",
      [partId],
    );
    if (parts.length === 0) return res.status(404).json({ message: "ไม่พบ Part" });
    const [duplicates] = await db.query<RowDataPacket[]>(
      `SELECT exam_part_id FROM exam_part
       WHERE exam_repository_id = ? AND part_order = ? AND exam_part_id <> ? LIMIT 1`,
      [parts[0].exam_repository_id, partOrder, partId],
    );
    if (duplicates.length > 0) return res.status(409).json({ message: "ลำดับ Part นี้มีอยู่แล้ว" });
    await db.query(
      "UPDATE exam_part SET part_order = ?, exam_part_name = ? WHERE exam_part_id = ?",
      [partOrder, partName, partId],
    );
    res.json({ message: "Exam part updated successfully" });
  } catch (error) {
    console.error("updateExamPart error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteExamPart = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const partId = parsePositiveId(req.params.partId, "รหัส Part", res);
  if (!partId) return;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [parts] = await connection.query<ExamPartRow[]>(
      "SELECT * FROM exam_part WHERE exam_part_id = ? FOR UPDATE",
      [partId],
    );
    if (parts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบ Part" });
    }
    const examId = parts[0].exam_repository_id;
    if (await hasExamHistory(connection, examId)) {
      await connection.rollback();
      return res.status(409).json({ message: "ไม่สามารถลบ Part ของข้อสอบที่มีประวัติการทำแล้ว" });
    }
    await connection.query(
      `DELETE c FROM choice c
       INNER JOIN question q ON q.question_id = c.question_id
       WHERE q.exam_part_id = ?`,
      [partId],
    );
    await connection.query("DELETE FROM question WHERE exam_part_id = ?", [partId]);
    await connection.query("DELETE FROM exam_part WHERE exam_part_id = ?", [partId]);
    await syncExamTotals(connection, examId);
    await connection.commit();
    res.json({ message: "Exam part deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("deleteExamPart error:", error);
    res.status(500).json({ message: "Unable to delete exam part" });
  } finally {
    connection.release();
  }
};

export const createQuestion = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const partId = parsePositiveId(req.params.partId, "รหัส Part", res);
  if (!partId) return;
  const order = Number(req.body.question_order);
  const text = String(req.body.question_text ?? "").trim();
  const score = validateScore(req.body.question_score);
  if (!Number.isInteger(order) || order < 1 || order > 9999) {
    return res.status(400).json({ message: "ลำดับคำถามต้องอยู่ระหว่าง 1-9999" });
  }
  if (!text) return res.status(400).json({ message: "กรุณากรอกคำถาม" });
  if (score === null) return res.status(400).json({ message: "คะแนนคำถามไม่ถูกต้อง" });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [parts] = await connection.query<IdRow[]>(
      "SELECT exam_repository_id FROM exam_part WHERE exam_part_id = ? FOR UPDATE",
      [partId],
    );
    if (parts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบ Part" });
    }
    if (await hasExamHistory(connection, parts[0].exam_repository_id)) {
      await connection.rollback();
      return res.status(409).json({
        message: "ไม่สามารถเพิ่มคำถามในข้อสอบที่มีประวัติการทำแล้ว",
      });
    }
    const [duplicates] = await connection.query<RowDataPacket[]>(
      `SELECT question_id FROM question
       WHERE exam_part_id = ? AND question_order = ? LIMIT 1`,
      [partId, order],
    );
    if (duplicates.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "ลำดับคำถามนี้มีอยู่แล้ว" });
    }
    await connection.query(
      `INSERT INTO question
        (exam_part_id, question_order, question_text, question_score)
       VALUES (?, ?, ?, ?)`,
      [partId, order, text, score],
    );
    await syncPartAndExamTotals(connection, partId);
    await connection.commit();
    res.status(201).json({ message: "Question created successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("createQuestion error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const questionId = parsePositiveId(req.params.questionId, "รหัสคำถาม", res);
  if (!questionId) return;
  const order = Number(req.body.question_order);
  const text = String(req.body.question_text ?? "").trim();
  const score = validateScore(req.body.question_score);
  if (!Number.isInteger(order) || order < 1 || order > 9999) {
    return res.status(400).json({ message: "ลำดับคำถามต้องอยู่ระหว่าง 1-9999" });
  }
  if (!text) return res.status(400).json({ message: "กรุณากรอกคำถาม" });
  if (score === null) return res.status(400).json({ message: "คะแนนคำถามไม่ถูกต้อง" });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [questions] = await connection.query<QuestionRow[]>(
      "SELECT * FROM question WHERE question_id = ? FOR UPDATE",
      [questionId],
    );
    if (questions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบคำถาม" });
    }
    const partId = questions[0].exam_part_id;
    const [examRows] = await connection.query<IdRow[]>(
      "SELECT exam_repository_id FROM exam_part WHERE exam_part_id = ? LIMIT 1",
      [partId],
    );
    if (await hasExamHistory(connection, examRows[0].exam_repository_id)) {
      await connection.rollback();
      return res.status(409).json({
        message: "ไม่สามารถแก้คำถามหรือคะแนนของข้อสอบที่มีประวัติการทำแล้ว",
      });
    }
    const [duplicates] = await connection.query<RowDataPacket[]>(
      `SELECT question_id FROM question
       WHERE exam_part_id = ? AND question_order = ? AND question_id <> ? LIMIT 1`,
      [partId, order, questionId],
    );
    if (duplicates.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "ลำดับคำถามนี้มีอยู่แล้ว" });
    }
    await connection.query(
      `UPDATE question
       SET question_order = ?, question_text = ?, question_score = ?
       WHERE question_id = ?`,
      [order, text, score, questionId],
    );
    await syncPartAndExamTotals(connection, partId);
    await connection.commit();
    res.json({ message: "Question updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("updateQuestion error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const questionId = parsePositiveId(req.params.questionId, "รหัสคำถาม", res);
  if (!questionId) return;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [questions] = await connection.query<QuestionRow[]>(
      "SELECT * FROM question WHERE question_id = ? FOR UPDATE",
      [questionId],
    );
    if (questions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบคำถาม" });
    }
    const partId = questions[0].exam_part_id;
    const [examRows] = await connection.query<IdRow[]>(
      "SELECT exam_repository_id FROM exam_part WHERE exam_part_id = ? LIMIT 1",
      [partId],
    );
    if (await hasExamHistory(connection, examRows[0].exam_repository_id)) {
      await connection.rollback();
      return res.status(409).json({ message: "ไม่สามารถลบคำถามของข้อสอบที่มีประวัติการทำแล้ว" });
    }
    await connection.query("DELETE FROM choice WHERE question_id = ?", [questionId]);
    await connection.query("DELETE FROM question WHERE question_id = ?", [questionId]);
    await syncPartAndExamTotals(connection, partId);
    await connection.commit();
    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("deleteQuestion error:", error);
    res.status(500).json({ message: "Unable to delete question" });
  } finally {
    connection.release();
  }
};

export const createChoice = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;
    const questionId = parsePositiveId(req.params.questionId, "รหัสคำถาม", res);
    if (!questionId) return;
    const order = Number(req.body.choice_order);
    const text = String(req.body.choice_text ?? "").trim();
    const isCorrect = req.body.is_correct;
    if (!Number.isInteger(order) || order < 1 || order > 999) {
      return res.status(400).json({ message: "ลำดับตัวเลือกต้องอยู่ระหว่าง 1-999" });
    }
    if (!text) return res.status(400).json({ message: "กรุณากรอกข้อความตัวเลือก" });
    if (typeof isCorrect !== "boolean") {
      return res.status(400).json({ message: "is_correct ต้องเป็น boolean" });
    }
    const [questions] = await db.query<RowDataPacket[]>(
      "SELECT question_id FROM question WHERE question_id = ? LIMIT 1",
      [questionId],
    );
    if (questions.length === 0) return res.status(404).json({ message: "ไม่พบคำถาม" });
    const [duplicates] = await db.query<RowDataPacket[]>(
      `SELECT choice_id FROM choice
       WHERE question_id = ? AND choice_order = ? LIMIT 1`,
      [questionId, order],
    );
    if (duplicates.length > 0) return res.status(409).json({ message: "ลำดับตัวเลือกนี้มีอยู่แล้ว" });
    if (isCorrect) {
      const [correctChoices] = await db.query<RowDataPacket[]>(
        `SELECT choice_id FROM choice
         WHERE question_id = ? AND is_correct = 1 LIMIT 1`,
        [questionId],
      );
      if (correctChoices.length > 0) {
        return res.status(409).json({ message: "คำถามหนึ่งข้อมีคำตอบที่ถูกได้เพียงหนึ่งตัวเลือก" });
      }
    }
    await db.query(
      `INSERT INTO choice (question_id, choice_order, choice_text, is_correct)
       VALUES (?, ?, ?, ?)`,
      [questionId, order, text, isCorrect ? 1 : 0],
    );
    res.status(201).json({ message: "Choice created successfully" });
  } catch (error) {
    console.error("createChoice error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateChoice = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;
    const choiceId = parsePositiveId(req.params.choiceId, "รหัสตัวเลือก", res);
    if (!choiceId) return;
    const order = Number(req.body.choice_order);
    const text = String(req.body.choice_text ?? "").trim();
    const isCorrect = req.body.is_correct;
    if (!Number.isInteger(order) || order < 1 || order > 999) {
      return res.status(400).json({ message: "ลำดับตัวเลือกต้องอยู่ระหว่าง 1-999" });
    }
    if (!text) return res.status(400).json({ message: "กรุณากรอกข้อความตัวเลือก" });
    if (typeof isCorrect !== "boolean") {
      return res.status(400).json({ message: "is_correct ต้องเป็น boolean" });
    }
    const [choices] = await db.query<ChoiceRow[]>(
      "SELECT * FROM choice WHERE choice_id = ? LIMIT 1",
      [choiceId],
    );
    if (choices.length === 0) return res.status(404).json({ message: "ไม่พบตัวเลือก" });
    const [duplicates] = await db.query<RowDataPacket[]>(
      `SELECT choice_id FROM choice
       WHERE question_id = ? AND choice_order = ? AND choice_id <> ? LIMIT 1`,
      [choices[0].question_id, order, choiceId],
    );
    if (duplicates.length > 0) return res.status(409).json({ message: "ลำดับตัวเลือกนี้มีอยู่แล้ว" });
    if (isCorrect) {
      const [correctChoices] = await db.query<RowDataPacket[]>(
        `SELECT choice_id FROM choice
         WHERE question_id = ? AND is_correct = 1 AND choice_id <> ? LIMIT 1`,
        [choices[0].question_id, choiceId],
      );
      if (correctChoices.length > 0) {
        return res.status(409).json({ message: "คำถามหนึ่งข้อมีคำตอบที่ถูกได้เพียงหนึ่งตัวเลือก" });
      }
    }
    await db.query(
      `UPDATE choice SET choice_order = ?, choice_text = ?, is_correct = ?
       WHERE choice_id = ?`,
      [order, text, isCorrect ? 1 : 0, choiceId],
    );
    res.json({ message: "Choice updated successfully" });
  } catch (error) {
    console.error("updateChoice error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteChoice = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const choiceId = parsePositiveId(req.params.choiceId, "รหัสตัวเลือก", res);
  if (!choiceId) return;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [choices] = await connection.query<IdRow[]>(
      `SELECT ep.exam_repository_id
       FROM choice c
       INNER JOIN question q ON q.question_id = c.question_id
       INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
       WHERE c.choice_id = ?
       LIMIT 1 FOR UPDATE`,
      [choiceId],
    );
    if (choices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบตัวเลือก" });
    }
    if (await hasExamHistory(connection, choices[0].exam_repository_id)) {
      await connection.rollback();
      return res.status(409).json({ message: "ไม่สามารถลบตัวเลือกของข้อสอบที่มีประวัติการทำแล้ว" });
    }
    await connection.query("DELETE FROM choice WHERE choice_id = ?", [choiceId]);
    await connection.commit();
    res.json({ message: "Choice deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("deleteChoice error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};
