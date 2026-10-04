import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
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
  time_limit_minutes: number;
  status: "draft" | "published" | "archived";
  question_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

interface QuestionBankSettingsLockRow extends RowDataPacket {
  question_bank_id: number;
  time_limit_minutes: number | string;
  status: "draft" | "published" | "archived";
}

interface QuestionDetailRow extends RowDataPacket {
  question_id: number;
  question_text: string;
  question_image_path: string | null;
  question_score: number | string;
}

interface PublishableQuestionRow extends RowDataPacket {
  question_id: number;
  question_score: number | string;
  choice_count: number | string;
  correct_count: number | string;
}

interface ChoiceDetailRow extends RowDataPacket {
  choice_id: number;
  question_id: number;
  choice_order: number;
  choice_text: string;
  choice_image_path: string | null;
  is_correct: number | boolean;
}

interface InstructorQuestionChoiceInput {
  choice_id: number | null;
  choice_order: number;
  choice_text: string;
  choice_image_path: string | null;
  image_path_provided: boolean;
  is_correct: boolean;
}

interface QuestionIdentityRow extends RowDataPacket {
  question_id: number;
  question_image_path: string | null;
}

interface InstructorSectionRow extends RowDataPacket {
  section_id: number;
  subject_id: string;
  subject_name: string;
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  section_number: string;
  capacity: number | null;
  section_status: "draft" | "open" | "closed" | "completed" | "cancelled";
  instructor_role: "owner" | "co_instructor";
  student_count: number;
}

interface InstructorStudentRow extends RowDataPacket {
  section_id: number;
  subject_id: string;
  section_number: string;
  user_id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  enrollment_status: string;
}

interface InstructorExamResultRow extends RowDataPacket {
  exam_attempt_id: number;
  section_id: number;
  user_id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  exam_period: ExamPeriod;
  actual_score: number | string;
  max_score: number | string;
  percentage: number | string;
  weak_topic_count: number;
  submitted_at: Date | string;
}

interface InstructorWeakTopicRow extends RowDataPacket {
  bank_result_id: number;
  exam_attempt_id: number;
  section_id: number;
  user_id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  exam_period: ExamPeriod;
  bank_name: string;
  actual_score: number | string;
  max_score: number | string;
  percentage: number | string;
  submitted_at: Date | string;
}

const questionBankSelect = `SELECT
  qb.question_bank_id,
  qb.subject_id,
  s.subject_name,
  qb.owner_instructor_id,
  qb.bank_name,
  qb.exam_period,
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
  time_limit_minutes: Number(bank.time_limit_minutes),
  question_count: Number(bank.question_count),
});

const validateQuestionScore = (value: unknown): number | null => {
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

const allowedQuestionImageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

const hasValidImageSignature = (buffer: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    );
  }
  if (mimeType === "image/gif") {
    const signature = buffer.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
};

const normalizeQuestionImagePath = (
  value: unknown,
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const withoutQuery = value.trim().split(/[?#]/, 1)[0];
  const filename = withoutQuery.split(/[\\/]/).pop() ?? "";
  const extension = path.extname(filename).toLowerCase();
  if (
    !filename ||
    filename.length > 255 ||
    !/^[A-Za-z0-9._-]+$/.test(filename) ||
    !allowedQuestionImageExtensions.has(extension)
  ) {
    return undefined;
  }
  return filename;
};

const validateInstructorQuestionChoices = (
  value: unknown,
):
  | { valid: true; choices: InstructorQuestionChoiceInput[] }
  | { valid: false; error: string } => {
  if (!Array.isArray(value) || value.length < 2 || value.length > 20) {
    return { valid: false, error: "กรุณากำหนดตัวเลือกจำนวน 2-20 ตัวเลือก" };
  }

  const choices: InstructorQuestionChoiceInput[] = [];
  const usedChoiceIds = new Set<number>();
  for (const [index, rawChoice] of value.entries()) {
    if (!rawChoice || typeof rawChoice !== "object") {
      return { valid: false, error: "ข้อมูลตัวเลือกไม่ถูกต้อง" };
    }

    const input = rawChoice as Record<string, unknown>;
    const rawChoiceId = input.choice_id;
    const choiceId =
      rawChoiceId === undefined || rawChoiceId === null
        ? null
        : Number(rawChoiceId);
    const choiceText = String(input.choice_text ?? "").trim();
    const imagePathProvided = Object.prototype.hasOwnProperty.call(
      input,
      "choice_image_path",
    );
    const choiceImagePath = imagePathProvided
      ? normalizeQuestionImagePath(input.choice_image_path)
      : undefined;
    if (
      choiceId !== null &&
      (!Number.isInteger(choiceId) || choiceId <= 0 || usedChoiceIds.has(choiceId))
    ) {
      return { valid: false, error: "รหัสตัวเลือกไม่ถูกต้อง" };
    }
    if (choiceText.length > 65_535) {
      return { valid: false, error: `ตัวเลือกที่ ${index + 1} ยาวเกินกำหนด` };
    }
    if (imagePathProvided && choiceImagePath === undefined) {
      return { valid: false, error: `รูปตัวเลือกที่ ${index + 1} ไม่ถูกต้อง` };
    }
    if (typeof input.is_correct !== "boolean") {
      return { valid: false, error: "สถานะคำตอบที่ถูกต้องไม่ถูกต้อง" };
    }

    if (choiceId !== null) usedChoiceIds.add(choiceId);
    choices.push({
      choice_id: choiceId,
      choice_order: index + 1,
      choice_text: choiceText,
      choice_image_path: choiceImagePath ?? null,
      image_path_provided: imagePathProvided,
      is_correct: input.is_correct,
    });
  }

  if (choices.filter((choice) => choice.is_correct).length !== 1) {
    return { valid: false, error: "กรุณากำหนดคำตอบที่ถูกต้องเพียง 1 ตัวเลือก" };
  }
  return { valid: true, choices };
};

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
       qb.time_limit_minutes, qb.status,
       qb.created_at, qb.updated_at
     LIMIT 1`,
    [questionBankId, instructorId],
  );
  return rows[0];
};

export const getInstructorDashboard = async (req: Request, res: Response) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  try {
    const [sections] = await db.query<InstructorSectionRow[]>(
      `SELECT
         section.section_id,
         section.subject_id,
         subject.subject_name,
         section.academic_term_id,
         term.academic_year,
         term.semester_no,
         section.section_number,
         section.capacity,
         section.status AS section_status,
         assignment.instructor_role,
         COUNT(CASE WHEN enrollment.status = 'enrolled'
           THEN enrollment.enrollment_id END) AS student_count
       FROM section_instructors assignment
       INNER JOIN course_sections section
         ON section.section_id = assignment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       INNER JOIN academic_terms term
         ON term.academic_term_id = section.academic_term_id
       LEFT JOIN enrollments enrollment
         ON enrollment.section_id = section.section_id
       WHERE assignment.instructor_id = ?
         AND section.status <> 'cancelled'
         AND term.status <> 'archived'
       GROUP BY section.section_id, section.subject_id, subject.subject_name,
         section.academic_term_id, term.academic_year, term.semester_no,
         section.section_number, section.capacity, section.status,
         assignment.instructor_role
       ORDER BY term.academic_year DESC, term.semester_no DESC,
         subject.subject_id, section.section_number`,
      [instructorId],
    );
    const [students] = await db.query<InstructorStudentRow[]>(
      `SELECT
         section.section_id,
         section.subject_id,
         section.section_number,
         student.user_id,
         student.user_name,
         student.first_name,
         student.last_name,
         enrollment.status AS enrollment_status
       FROM section_instructors assignment
       INNER JOIN course_sections section
         ON section.section_id = assignment.section_id
       INNER JOIN enrollments enrollment
         ON enrollment.section_id = section.section_id
        AND enrollment.status = 'enrolled'
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       INNER JOIN user student ON student.user_id = student_term.user_id
       WHERE assignment.instructor_id = ?
         AND section.status <> 'cancelled'
       ORDER BY section.subject_id, section.section_number,
         student.first_name, student.last_name, student.user_id`,
      [instructorId],
    );
    const [examResults] = await db.query<InstructorExamResultRow[]>(
      `SELECT
         attempt.exam_attempt_id,
         section.section_id,
         student.user_id,
         student.user_name,
         student.first_name,
         student.last_name,
         attempt.exam_period,
         attempt.actual_score,
         attempt.max_score,
         ROUND((attempt.actual_score / attempt.max_score) * 100, 2) AS percentage,
         attempt.weak_topic_count,
         attempt.submitted_at
       FROM section_instructors assignment
       INNER JOIN course_sections section
         ON section.section_id = assignment.section_id
       INNER JOIN enrollments enrollment
         ON enrollment.section_id = section.section_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       INNER JOIN user student ON student.user_id = student_term.user_id
       INNER JOIN exam_attempts attempt
         ON attempt.enrollment_id = enrollment.enrollment_id
        AND attempt.status = 'submitted'
       WHERE assignment.instructor_id = ?
         AND section.status <> 'cancelled'
       ORDER BY attempt.submitted_at DESC, attempt.exam_attempt_id DESC`,
      [instructorId],
    );
    const [weakTopics] = await db.query<InstructorWeakTopicRow[]>(
      `SELECT
         bank_result.bank_result_id,
         attempt.exam_attempt_id,
         section.section_id,
         student.user_id,
         student.user_name,
         student.first_name,
         student.last_name,
         attempt.exam_period,
         bank_result.bank_name_snapshot AS bank_name,
         bank_result.actual_score,
         bank_result.max_score,
         bank_result.percentage,
         attempt.submitted_at
       FROM section_instructors assignment
       INNER JOIN course_sections section
         ON section.section_id = assignment.section_id
       INNER JOIN enrollments enrollment
         ON enrollment.section_id = section.section_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       INNER JOIN user student ON student.user_id = student_term.user_id
       INNER JOIN exam_attempts attempt
         ON attempt.enrollment_id = enrollment.enrollment_id
        AND attempt.status = 'submitted'
       INNER JOIN exam_attempt_bank_results bank_result
         ON bank_result.exam_attempt_id = attempt.exam_attempt_id
        AND bank_result.is_weak_topic = 1
       WHERE assignment.instructor_id = ?
         AND section.status <> 'cancelled'
       ORDER BY bank_result.percentage ASC, attempt.submitted_at DESC`,
      [instructorId],
    );

    return res.json({
      message: "Instructor dashboard retrieved successfully",
      sections: sections.map((section) => ({
        ...section,
        section_id: Number(section.section_id),
        academic_term_id: Number(section.academic_term_id),
        capacity: section.capacity === null ? null : Number(section.capacity),
        student_count: Number(section.student_count),
      })),
      students: students.map((student) => ({
        ...student,
        section_id: Number(student.section_id),
        user_id: Number(student.user_id),
      })),
      exam_results: examResults.map((result) => ({
        ...result,
        exam_attempt_id: Number(result.exam_attempt_id),
        section_id: Number(result.section_id),
        user_id: Number(result.user_id),
        actual_score: Number(result.actual_score),
        max_score: Number(result.max_score),
        percentage: Number(result.percentage),
        weak_topic_count: Number(result.weak_topic_count),
      })),
      weak_topics: weakTopics.map((topic) => ({
        ...topic,
        bank_result_id: Number(topic.bank_result_id),
        exam_attempt_id: Number(topic.exam_attempt_id),
        section_id: Number(topic.section_id),
        user_id: Number(topic.user_id),
        actual_score: Number(topic.actual_score),
        max_score: Number(topic.max_score),
        percentage: Number(topic.percentage),
      })),
    });
  } catch (error) {
    console.error("getInstructorDashboard error:", error);
    return res.status(500).json({ message: "ไม่สามารถโหลดพื้นที่ทำงานอาจารย์ได้" });
  }
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
       FROM section_instructors assignment
       INNER JOIN course_sections section
         ON section.section_id = assignment.section_id
        AND section.status IN ('draft', 'open', 'closed')
       INNER JOIN academic_terms term
         ON term.academic_term_id = section.academic_term_id
        AND term.status IN ('draft', 'active')
       INNER JOIN subjects s
         ON s.subject_id = section.subject_id AND s.is_active = 1
       WHERE assignment.instructor_id = ?
       ORDER BY s.subject_name, s.subject_id`,
      [instructorId],
    );

    const [questionBanks] = await db.query<QuestionBankRow[]>(
      `${questionBankSelect}
       WHERE qb.owner_instructor_id = ? AND qb.status <> 'archived'
       GROUP BY qb.question_bank_id, qb.subject_id, s.subject_name,
         qb.owner_instructor_id, qb.bank_name, qb.exam_period,
         qb.time_limit_minutes, qb.status,
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

export const getInstructorQuestionBankDetail = async (
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
      return res.status(404).json({ message: "ไม่พบพาร์ทที่ต้องการดู" });
    }

    const [questions] = await db.query<QuestionDetailRow[]>(
      `SELECT
         question_id,
         question_text,
         question_image_path,
         question_score
       FROM question
       WHERE question_bank_id = ? AND is_active = 1
       ORDER BY question_id`,
      [questionBankId],
    );
    const [choices] = await db.query<ChoiceDetailRow[]>(
      `SELECT
         choice.choice_id,
         choice.question_id,
         choice.choice_order,
         choice.choice_text,
         choice.choice_image_path,
         choice.is_correct
       FROM choice
       INNER JOIN question
         ON question.question_id = choice.question_id
        AND question.question_bank_id = ?
        AND question.is_active = 1
       WHERE choice.is_active = 1
       ORDER BY choice.question_id, choice.choice_order, choice.choice_id`,
      [questionBankId],
    );

    const choicesByQuestion = new Map<number, ChoiceDetailRow[]>();
    for (const choice of choices) {
      const questionId = Number(choice.question_id);
      const currentChoices = choicesByQuestion.get(questionId) ?? [];
      currentChoices.push(choice);
      choicesByQuestion.set(questionId, currentChoices);
    }

    return res.json({
      message: "Question bank detail retrieved successfully",
      question_bank: serializeQuestionBank(bank),
      questions: questions.map((question) => ({
        question_id: Number(question.question_id),
        question_text: question.question_text,
        question_image_path: question.question_image_path,
        question_score: Number(question.question_score),
        choices: (choicesByQuestion.get(Number(question.question_id)) ?? []).map(
          (choice) => ({
            choice_id: Number(choice.choice_id),
            choice_order: Number(choice.choice_order),
            choice_text: choice.choice_text,
            choice_image_path: choice.choice_image_path,
            is_correct: Boolean(choice.is_correct),
          }),
        ),
      })),
    });
  } catch (error) {
    console.error("getInstructorQuestionBankDetail error:", error);
    return res.status(500).json({ message: "Unable to load question bank detail" });
  }
};

export const updateInstructorQuestion = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  const questionBankId = Number(req.params.bankId);
  const questionId = Number(req.params.questionId);
  const questionText = String(req.body.question_text ?? "").trim();
  const questionScore = validateQuestionScore(req.body.question_score);
  const questionImagePathProvided = Object.prototype.hasOwnProperty.call(
    req.body,
    "question_image_path",
  );
  const requestedQuestionImagePath = questionImagePathProvided
    ? normalizeQuestionImagePath(req.body.question_image_path)
    : undefined;
  const choiceValidation = validateInstructorQuestionChoices(req.body.choices);
  if (
    !Number.isInteger(questionBankId) ||
    questionBankId <= 0 ||
    !Number.isInteger(questionId) ||
    questionId <= 0
  ) {
    return res.status(400).json({ message: "รหัสพาร์ทหรือคำถามไม่ถูกต้อง" });
  }
  if (!questionText || questionText.length > 65_535) {
    return res.status(400).json({ message: "กรุณากรอกโจทย์คำถามให้ถูกต้อง" });
  }
  if (questionScore === null) {
    return res.status(400).json({ message: "คะแนนต้องอยู่ระหว่าง 0.01-999.99" });
  }
  if (questionImagePathProvided && requestedQuestionImagePath === undefined) {
    return res.status(400).json({ message: "รูปประกอบคำถามไม่ถูกต้อง" });
  }
  if (!choiceValidation.valid) {
    return res.status(400).json({ message: choiceValidation.error });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [questions] = await connection.query<QuestionIdentityRow[]>(
      `SELECT question.question_id, question.question_image_path
       FROM question
       INNER JOIN question_banks bank
         ON bank.question_bank_id = question.question_bank_id
       WHERE question.question_id = ?
         AND question.question_bank_id = ?
         AND bank.owner_instructor_id = ?
         AND bank.status = 'draft'
         AND question.is_active = 1
       LIMIT 1 FOR UPDATE`,
      [questionId, questionBankId, instructorId],
    );
    if (questions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบคำถามที่ต้องการแก้ไข" });
    }
    const questionImagePath = questionImagePathProvided
      ? requestedQuestionImagePath ?? null
      : questions[0].question_image_path;

    const [existingChoices] = await connection.query<ChoiceDetailRow[]>(
      `SELECT choice_id, question_id, choice_order, choice_text,
         choice_image_path, is_correct
       FROM choice
       WHERE question_id = ? AND is_active = 1
       FOR UPDATE`,
      [questionId],
    );
    const existingChoiceImages = new Map(
      existingChoices.map((choice) => [
        Number(choice.choice_id),
        choice.choice_image_path,
      ]),
    );

    for (const [index, choice] of choiceValidation.choices.entries()) {
      if (
        choice.choice_id !== null &&
        !existingChoiceImages.has(choice.choice_id)
      ) {
        await connection.rollback();
        return res.status(400).json({ message: "พบตัวเลือกที่ไม่อยู่ในคำถามนี้" });
      }
      const preservedImagePath =
        choice.image_path_provided
          ? choice.choice_image_path
          : choice.choice_id === null
            ? null
            : existingChoiceImages.get(choice.choice_id) ?? null;
      if (!choice.choice_text && !preservedImagePath) {
        await connection.rollback();
        return res.status(400).json({
          message: `กรุณากรอกข้อความตัวเลือกที่ ${index + 1}`,
        });
      }
    }

    await connection.query(
      `UPDATE question
       SET question_text = ?, question_image_path = ?, question_score = ?
       WHERE question_id = ?`,
      [questionText, questionImagePath, questionScore, questionId],
    );
    // choices_snapshot preserves submitted attempts, so stale inactive choices can
    // be removed before rebuilding the current unique display order safely.
    await connection.query(
      "DELETE FROM choice WHERE question_id = ? AND is_active = 0",
      [questionId],
    );
    await connection.query(
      "UPDATE choice SET choice_order = choice_order + 100 WHERE question_id = ?",
      [questionId],
    );
    const retainedChoiceIds = choiceValidation.choices.flatMap((choice) =>
      choice.choice_id === null ? [] : [choice.choice_id],
    );
    if (retainedChoiceIds.length) {
      await connection.query(
        "DELETE FROM choice WHERE question_id = ? AND choice_id NOT IN (?)",
        [questionId, retainedChoiceIds],
      );
    } else {
      await connection.query("DELETE FROM choice WHERE question_id = ?", [questionId]);
    }
    for (const choice of choiceValidation.choices) {
      const choiceImagePath =
        choice.image_path_provided
          ? choice.choice_image_path
          : choice.choice_id === null
            ? null
            : existingChoiceImages.get(choice.choice_id) ?? null;
      if (choice.choice_id !== null) {
        await connection.query(
          `UPDATE choice
           SET choice_order = ?, choice_text = ?, choice_image_path = ?,
               is_correct = ?, is_active = 1
           WHERE choice_id = ? AND question_id = ?`,
          [
            choice.choice_order,
            choice.choice_text,
            choiceImagePath,
            choice.is_correct ? 1 : 0,
            choice.choice_id,
            questionId,
          ],
        );
      } else {
        await connection.query(
          `INSERT INTO choice
            (question_id, choice_order, choice_text, choice_image_path, is_correct, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            questionId,
            choice.choice_order,
            choice.choice_text,
            choiceImagePath,
            choice.is_correct ? 1 : 0,
          ],
        );
      }
    }

    await connection.commit();
    return res.json({ message: "Question updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("updateInstructorQuestion error:", error);
    return res.status(500).json({ message: "Unable to update question" });
  } finally {
    connection.release();
  }
};

export const createInstructorQuestion = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  const questionBankId = Number(req.params.bankId);
  const questionText = String(req.body.question_text ?? "").trim();
  const questionScore = validateQuestionScore(req.body.question_score);
  const questionImagePathProvided = Object.prototype.hasOwnProperty.call(
    req.body,
    "question_image_path",
  );
  const questionImagePath = questionImagePathProvided
    ? normalizeQuestionImagePath(req.body.question_image_path)
    : null;
  const choiceValidation = validateInstructorQuestionChoices(req.body.choices);

  if (!Number.isInteger(questionBankId) || questionBankId <= 0) {
    return res.status(400).json({ message: "รหัสพาร์ทไม่ถูกต้อง" });
  }
  if (!questionText || questionText.length > 65_535) {
    return res.status(400).json({ message: "กรุณากรอกโจทย์คำถามให้ถูกต้อง" });
  }
  if (questionScore === null) {
    return res.status(400).json({ message: "คะแนนต้องอยู่ระหว่าง 0.01-999.99" });
  }
  if (questionImagePathProvided && questionImagePath === undefined) {
    return res.status(400).json({ message: "รูปประกอบคำถามไม่ถูกต้อง" });
  }
  if (!choiceValidation.valid) {
    return res.status(400).json({ message: choiceValidation.error });
  }
  if (choiceValidation.choices.some((choice) => choice.choice_id !== null)) {
    return res.status(400).json({ message: "คำถามใหม่ต้องไม่มีรหัสตัวเลือกเดิม" });
  }
  const emptyChoiceIndex = choiceValidation.choices.findIndex(
    (choice) => !choice.choice_text && !choice.choice_image_path,
  );
  if (emptyChoiceIndex >= 0) {
    return res.status(400).json({
      message: `กรุณากรอกข้อความหรือเลือกรูปสำหรับตัวเลือกที่ ${emptyChoiceIndex + 1}`,
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [banks] = await connection.query<RowDataPacket[]>(
      `SELECT question_bank_id
       FROM question_banks
       WHERE question_bank_id = ? AND owner_instructor_id = ?
         AND status = 'draft'
       LIMIT 1 FOR UPDATE`,
      [questionBankId, instructorId],
    );
    if (banks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบพาร์ทที่ต้องการเพิ่มคำถาม" });
    }

    const [questionResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO question
        (question_bank_id, question_text, question_image_path, question_score, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [questionBankId, questionText, questionImagePath, questionScore],
    );
    for (const choice of choiceValidation.choices) {
      await connection.query(
        `INSERT INTO choice
          (question_id, choice_order, choice_text, choice_image_path, is_correct, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          questionResult.insertId,
          choice.choice_order,
          choice.choice_text,
          choice.choice_image_path,
          choice.is_correct ? 1 : 0,
        ],
      );
    }

    await connection.commit();
    return res.status(201).json({
      message: "Question created successfully",
      question_id: questionResult.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("createInstructorQuestion error:", error);
    return res.status(500).json({ message: "Unable to create question" });
  } finally {
    connection.release();
  }
};

export const updateInstructorQuestionBankSettings = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  const questionBankId = Number(req.params.bankId);
  const timeLimitMinutes = Number(req.body.time_limit_minutes);
  if (!Number.isInteger(questionBankId) || questionBankId <= 0) {
    return res.status(400).json({ message: "รหัสพาร์ทไม่ถูกต้อง" });
  }
  if (
    !Number.isInteger(timeLimitMinutes) ||
    timeLimitMinutes < 1 ||
    timeLimitMinutes > 1440
  ) {
    return res.status(400).json({ message: "เวลาทำข้อสอบต้องอยู่ระหว่าง 1-1,440 นาที" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [banks] = await connection.query<QuestionBankSettingsLockRow[]>(
      `SELECT question_bank_id, time_limit_minutes, status
       FROM question_banks
       WHERE question_bank_id = ? AND owner_instructor_id = ?
       LIMIT 1 FOR UPDATE`,
      [questionBankId, instructorId],
    );
    const bank = banks[0];
    if (!bank || bank.status !== "draft") {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบพาร์ทที่ต้องการแก้ไข" });
    }

    const currentLimit = Number(bank.time_limit_minutes);
    await connection.query(
      `UPDATE exam_attempts attempt
       SET status = 'expired',
           submitted_at = DATE_ADD(attempt.started_at, INTERVAL ? MINUTE),
           updated_at = NOW()
       WHERE attempt.status = 'in_progress'
         AND NOW() >= DATE_ADD(attempt.started_at, INTERVAL ? MINUTE)
         AND EXISTS (
           SELECT 1 FROM exam_attempt_questions attempt_question
           WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id
             AND attempt_question.source_bank_id = ?
         )`,
      [currentLimit, currentLimit, questionBankId],
    );
    const [activeAttempts] = await connection.query<RowDataPacket[]>(
      `SELECT attempt.exam_attempt_id
       FROM exam_attempts attempt
       WHERE attempt.status = 'in_progress'
         AND NOW() < DATE_ADD(attempt.started_at, INTERVAL ? MINUTE)
         AND EXISTS (
           SELECT 1 FROM exam_attempt_questions attempt_question
           WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id
             AND attempt_question.source_bank_id = ?
         )
       LIMIT 1`,
      [currentLimit, questionBankId],
    );
    if (activeAttempts.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "ยังเปลี่ยนเวลาสอบไม่ได้ เนื่องจากมีนักศึกษากำลังทำข้อสอบชุดนี้อยู่",
      });
    }

    await connection.query(
      `UPDATE question_banks
       SET time_limit_minutes = ?
       WHERE question_bank_id = ? AND owner_instructor_id = ?
         AND status = 'draft'`,
      [timeLimitMinutes, questionBankId, instructorId],
    );
    await connection.commit();
    const updated = await getOwnedQuestionBank(questionBankId, instructorId);
    return res.json({
      message: "Question bank settings updated successfully",
      question_bank: updated ? serializeQuestionBank(updated) : null,
    });
  } catch (error) {
    await connection.rollback();
    console.error("updateInstructorQuestionBankSettings error:", error);
    return res.status(500).json({ message: "Unable to update question bank settings" });
  } finally {
    connection.release();
  }
};

export const publishInstructorQuestionBank = async (
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
    const [banks] = await connection.query<QuestionBankSettingsLockRow[]>(
      `SELECT question_bank_id, time_limit_minutes, status
       FROM question_banks
       WHERE question_bank_id = ? AND owner_instructor_id = ?
       LIMIT 1 FOR UPDATE`,
      [questionBankId, instructorId],
    );
    const bank = banks[0];
    if (!bank || bank.status === "archived") {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบพาร์ทที่ต้องการเผยแพร่" });
    }
    if (bank.status === "published") {
      await connection.commit();
      const published = await getOwnedQuestionBank(questionBankId, instructorId);
      return res.json({
        message: "Question bank is already published",
        question_bank: published ? serializeQuestionBank(published) : null,
      });
    }

    const [questions] = await connection.query<PublishableQuestionRow[]>(
      `SELECT question.question_id,
         question.question_score,
         COUNT(choice.choice_id) AS choice_count,
         SUM(CASE WHEN choice.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count
       FROM question
       LEFT JOIN choice
         ON choice.question_id = question.question_id AND choice.is_active = 1
       WHERE question.question_bank_id = ? AND question.is_active = 1
       GROUP BY question.question_id, question.question_score
       ORDER BY question.question_id`,
      [questionBankId],
    );
    const invalidQuestion = questions.find(
      (question) =>
        Number(question.choice_count) < 2 || Number(question.correct_count) !== 1,
    );
    if (invalidQuestion) {
      await connection.rollback();
      return res.status(409).json({
        message: `คำถามรหัส ${Number(invalidQuestion.question_id)} ต้องมีอย่างน้อย 2 ตัวเลือกและมีคำตอบถูกเพียง 1 ตัวเลือก`,
      });
    }

    await connection.query(
      `UPDATE question_banks SET status = 'published'
       WHERE question_bank_id = ? AND owner_instructor_id = ? AND status = 'draft'`,
      [questionBankId, instructorId],
    );
    await connection.commit();
    const published = await getOwnedQuestionBank(questionBankId, instructorId);
    return res.json({
      message: "Question bank published successfully",
      question_bank: published ? serializeQuestionBank(published) : null,
    });
  } catch (error) {
    await connection.rollback();
    console.error("publishInstructorQuestionBank error:", error);
    return res.status(500).json({ message: "Unable to publish question bank" });
  } finally {
    connection.release();
  }
};

export const getInstructorQuestionImage = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;
  const questionBankId = Number(req.params.bankId);
  const filename = path.basename(String(req.params.filename ?? ""));
  if (
    !Number.isInteger(questionBankId) ||
    questionBankId <= 0 ||
    !/^[A-Za-z0-9._-]{1,255}$/.test(filename)
  ) {
    return res.status(400).json({ message: "ข้อมูลรูปภาพไม่ถูกต้อง" });
  }
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 1
       FROM question_banks bank
       LEFT JOIN question
         ON question.question_bank_id = bank.question_bank_id
       LEFT JOIN choice ON choice.question_id = question.question_id
       WHERE bank.question_bank_id = ? AND bank.owner_instructor_id = ?
         AND (
           question.question_image_path = ? OR choice.choice_image_path = ?
         )
       LIMIT 1`,
      [questionBankId, instructorId, filename, filename],
    );
    if (!rows[0]) return res.status(404).json({ message: "ไม่พบรูปภาพ" });
    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(
      path.resolve(__dirname, "../../uploads/questions", filename),
    );
  } catch (error) {
    console.error("getInstructorQuestionImage error:", error);
    return res.status(500).json({ message: "Unable to load question image" });
  }
};

export const uploadInstructorQuestionImage = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  const questionBankId = Number(req.params.bankId);
  if (!Number.isInteger(questionBankId) || questionBankId <= 0) {
    return res.status(400).json({ message: "รหัสพาร์ทไม่ถูกต้อง" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "กรุณาเลือกรูปภาพ" });
  }

  try {
    const bank = await getOwnedQuestionBank(questionBankId, instructorId);
    if (!bank || bank.status !== "draft") {
      return res.status(404).json({ message: "ไม่พบพาร์ทสำหรับอัปโหลดรูป" });
    }

    const extensionByMimeType: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    const extension = extensionByMimeType[req.file.mimetype];
    if (!extension || !hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ message: "ชนิดรูปภาพไม่รองรับ" });
    }

    const filename = `question_${randomUUID()}${extension}`;
    const outputDirectory = path.join(__dirname, "../../uploads/questions");
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(path.join(outputDirectory, filename), req.file.buffer);

    return res.status(201).json({
      message: "Question image uploaded successfully",
      image_path: filename,
      image_url: `${req.protocol}://${req.get("host")}/instructor/question-banks/${questionBankId}/images/${encodeURIComponent(filename)}`,
    });
  } catch (error) {
    console.error("uploadInstructorQuestionImage error:", error);
    return res.status(500).json({ message: "Unable to upload question image" });
  }
};

export const deleteInstructorQuestion = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  const questionBankId = Number(req.params.bankId);
  const questionId = Number(req.params.questionId);
  if (
    !Number.isInteger(questionBankId) ||
    questionBankId <= 0 ||
    !Number.isInteger(questionId) ||
    questionId <= 0
  ) {
    return res.status(400).json({ message: "รหัสพาร์ทหรือคำถามไม่ถูกต้อง" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [questions] = await connection.query<RowDataPacket[]>(
      `SELECT question.question_id
       FROM question
       INNER JOIN question_banks bank
         ON bank.question_bank_id = question.question_bank_id
       WHERE question.question_id = ?
         AND question.question_bank_id = ?
         AND bank.owner_instructor_id = ?
         AND bank.status = 'draft'
         AND question.is_active = 1
       LIMIT 1 FOR UPDATE`,
      [questionId, questionBankId, instructorId],
    );
    if (questions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบคำถามที่ต้องการลบ" });
    }

    await connection.query("UPDATE choice SET is_active = 0 WHERE question_id = ?", [
      questionId,
    ]);
    await connection.query("UPDATE question SET is_active = 0 WHERE question_id = ?", [
      questionId,
    ]);

    await connection.commit();
    return res.json({ message: "Question archived successfully" });
  } catch (error: unknown) {
    await connection.rollback();
    console.error("deleteInstructorQuestion error:", error);
    return res.status(500).json({ message: "Unable to archive question" });
  } finally {
    connection.release();
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
    !Number.isInteger(timeLimitMinutes) ||
    timeLimitMinutes < 1 ||
    timeLimitMinutes > 1440
  ) {
    return res.status(400).json({ message: "เวลาทำข้อสอบต้องอยู่ระหว่าง 1-1,440 นาที" });
  }

  try {
    const [eligibleSubjects] = await db.query<RowDataPacket[]>(
      `SELECT section.subject_id
       FROM section_instructors assignment
       INNER JOIN course_sections section
         ON section.section_id = assignment.section_id
        AND section.status IN ('draft', 'open', 'closed')
       INNER JOIN academic_terms term
         ON term.academic_term_id = section.academic_term_id
        AND term.status IN ('draft', 'active')
       INNER JOIN subjects subject
         ON subject.subject_id = section.subject_id AND subject.is_active = 1
       WHERE assignment.instructor_id = ?
         AND BINARY section.subject_id = ?
       LIMIT 1`,
      [instructorId, subjectId],
    );
    if (eligibleSubjects.length === 0) {
      return res.status(403).json({
        message: "อาจารย์ยังไม่ได้รับมอบหมายให้สอนวิชานี้ในภาคการศึกษาปัจจุบัน",
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

    // Keep a compatibility value for databases that still require the legacy
    // column. Exam generation no longer reads this value.
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
        1,
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

    const [activeAttempts] = await connection.query<RowDataPacket[]>(
      `SELECT attempt.exam_attempt_id
       FROM exam_attempts attempt
       INNER JOIN exam_attempt_questions attempt_question
         ON attempt_question.exam_attempt_id = attempt.exam_attempt_id
        AND attempt_question.source_bank_id = ?
       WHERE attempt.status IN ('in_progress', 'expired')
       LIMIT 1`,
      [questionBankId],
    );
    if (activeAttempts.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "ยังจัดเก็บพาร์ทไม่ได้ เนื่องจากมีนักศึกษากำลังทำข้อสอบชุดนี้อยู่",
      });
    }
    const [pendingCheckpoints] = await connection.query<RowDataPacket[]>(
      `SELECT checkpoint.exam_checkpoint_id
       FROM exam_checkpoints checkpoint
       INNER JOIN exam_attempt_bank_results result
         ON result.exam_attempt_id = checkpoint.source_exam_attempt_id
        AND result.question_bank_id = ?
       WHERE checkpoint.status = 'pending'
       LIMIT 1`,
      [questionBankId],
    );
    if (pendingCheckpoints.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "ยังจัดเก็บพาร์ทไม่ได้ เนื่องจากมีรอบ Checkpoint ที่รอให้นักศึกษาทำ",
      });
    }

    await connection.query(
      `UPDATE choice
       SET is_active = 0
       WHERE question_id IN (
         SELECT question_id FROM question WHERE question_bank_id = ?
       )`,
      [questionBankId],
    );
    await connection.query(
      "UPDATE question SET is_active = 0 WHERE question_bank_id = ?",
      [questionBankId],
    );
    await connection.query(
      `UPDATE question_banks SET status = 'archived'
       WHERE question_bank_id = ?`,
      [questionBankId],
    );
    await connection.commit();
    return res.json({ message: "Question bank archived successfully" });
  } catch (error: unknown) {
    await connection.rollback();
    console.error("deleteInstructorQuestionBank error:", error);
    return res.status(500).json({ message: "Unable to archive question bank" });
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

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [banks] = await connection.query<RowDataPacket[]>(
      `SELECT question_bank_id FROM question_banks
       WHERE question_bank_id = ? AND owner_instructor_id = ?
         AND status = 'draft'
       LIMIT 1 FOR UPDATE`,
      [questionBankId, instructorId],
    );
    if (banks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบพาร์ทที่ต้องการแก้ไข" });
    }
    await connection.query(
      `UPDATE choice
       SET is_active = 0
       WHERE question_id IN (
         SELECT question_id FROM question WHERE question_bank_id = ?
       )`,
      [questionBankId],
    );
    await connection.query(
      "UPDATE question SET is_active = 0 WHERE question_bank_id = ?",
      [questionBankId],
    );
    await connection.commit();
    return res.json({ message: "Question bank questions archived successfully" });
  } catch (error: unknown) {
    await connection.rollback();
    console.error("clearInstructorQuestionBankQuestions error:", error);
    return res.status(500).json({ message: "Unable to archive questions" });
  } finally {
    connection.release();
  }
};

export const importInstructorExamFile = async (
  req: Request,
  res: Response,
) => {
  req.body.question_bank_id = req.params.bankId;
  return importExamFile(req, res);
};
