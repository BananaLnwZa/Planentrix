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

interface QuestionDetailRow extends RowDataPacket {
  question_id: number;
  question_text: string;
  question_image_path: string | null;
  question_score: number | string;
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
  is_correct: boolean;
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
    if (
      choiceId !== null &&
      (!Number.isInteger(choiceId) || choiceId <= 0 || usedChoiceIds.has(choiceId))
    ) {
      return { valid: false, error: "รหัสตัวเลือกไม่ถูกต้อง" };
    }
    if (choiceText.length > 65_535) {
      return { valid: false, error: `ตัวเลือกที่ ${index + 1} ยาวเกินกำหนด` };
    }
    if (typeof input.is_correct !== "boolean") {
      return { valid: false, error: "สถานะคำตอบที่ถูกต้องไม่ถูกต้อง" };
    }

    if (choiceId !== null) usedChoiceIds.add(choiceId);
    choices.push({
      choice_id: choiceId,
      choice_order: index + 1,
      choice_text: choiceText,
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
       qb.default_draw_count, qb.time_limit_minutes, qb.status,
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
  if (!choiceValidation.valid) {
    return res.status(400).json({ message: choiceValidation.error });
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
       LIMIT 1 FOR UPDATE`,
      [questionId, questionBankId, instructorId],
    );
    if (questions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบคำถามที่ต้องการแก้ไข" });
    }

    const [existingChoices] = await connection.query<ChoiceDetailRow[]>(
      `SELECT choice_id, question_id, choice_order, choice_text,
         choice_image_path, is_correct
       FROM choice
       WHERE question_id = ?
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
        choice.choice_id === null
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
       SET question_text = ?, question_score = ?
       WHERE question_id = ?`,
      [questionText, questionScore, questionId],
    );
    await connection.query("DELETE FROM choice WHERE question_id = ?", [
      questionId,
    ]);
    for (const choice of choiceValidation.choices) {
      const choiceImagePath =
        choice.choice_id === null
          ? null
          : existingChoiceImages.get(choice.choice_id) ?? null;
      await connection.query(
        `INSERT INTO choice
          (question_id, choice_order, choice_text, choice_image_path, is_correct)
         VALUES (?, ?, ?, ?, ?)`,
        [
          questionId,
          choice.choice_order,
          choice.choice_text,
          choiceImagePath,
          choice.is_correct ? 1 : 0,
        ],
      );
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
       LIMIT 1 FOR UPDATE`,
      [questionId, questionBankId, instructorId],
    );
    if (questions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบคำถามที่ต้องการลบ" });
    }

    await connection.query("DELETE FROM choice WHERE question_id = ?", [
      questionId,
    ]);
    await connection.query("DELETE FROM question WHERE question_id = ?", [
      questionId,
    ]);
    await connection.query(
      `UPDATE question_banks
       SET default_draw_count = GREATEST(1, (
         SELECT COUNT(*) FROM question
         WHERE question_bank_id = ? AND is_active = 1
       ))
       WHERE question_bank_id = ?`,
      [questionBankId, questionBankId],
    );

    await connection.commit();
    return res.json({ message: "Question deleted successfully" });
  } catch (error: unknown) {
    await connection.rollback();
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "ไม่สามารถลบคำถามที่มีประวัติการทำข้อสอบแล้วได้",
      });
    }
    console.error("deleteInstructorQuestion error:", error);
    return res.status(500).json({ message: "Unable to delete question" });
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
