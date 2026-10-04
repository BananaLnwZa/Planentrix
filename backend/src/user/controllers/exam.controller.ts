import path from "path";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import db from "../../config/db";
import { selectAutomaticBalancedExamQuestions } from "../../services/exam-selection";
import {
  checkpointWeeksFor,
  parseSnapshotChoices,
  remainingSecondsFor,
  scoreSnapshotQuestions,
} from "../services/exam-attempt.rules";
import { safelyGenerateRecommendation } from "../services/recommendation.engine";

type UserRequest = Request & {
  user?: { id?: number | string; role?: string };
};

interface ExamRow extends RowDataPacket {
  exam_repository_id: number;
  schedule_time_id: number;
  subject_id: string;
  subject_name: string;
  exam_name: string;
  total_score: number | string;
  total_question: number | null;
  time_limit: number;
  exam_period: "midterm" | "final";
  due_checkpoint_id: number | null;
  previous_result_count: number;
}

interface QuestionRow extends RowDataPacket {
  question_id: number;
  question_text: string;
  question_image_path: string | null;
  question_score: number | string;
}

interface ChoiceRow extends RowDataPacket {
  choice_id: number;
  question_id: number;
  choice_order: number;
  choice_text: string;
  choice_image_path: string | null;
  is_correct: 0 | 1;
}

interface AttemptRow extends RowDataPacket {
  exam_attempt_id: number;
  enrollment_id: number;
  source_checkpoint_id: number | null;
  started_at: Date | string;
  elapsed_seconds: number | string;
  status: "in_progress" | "submitted" | "expired" | "cancelled";
  time_limit_minutes: number | string;
  exam_period: "midterm" | "final";
  bank_name: string;
}

interface AttemptQuestionRow extends RowDataPacket {
  attempt_question_id: number;
  source_question_id: number | null;
  source_bank_id: number;
  display_order: number;
  question_text_snapshot: string;
  image_path_snapshot: string | null;
  question_score_snapshot: number | string;
  choices_snapshot: unknown;
  selected_choice_order: number | string | null;
  is_correct: number | null;
  awarded_score: number | string | null;
}

interface FinalizedAttempt {
  historyId: number;
  actualScore: number;
  maximumScore: number;
  correctAnswers: number;
  totalQuestions: number;
  nextCheckpointAt: Date | string | null;
  checkpointIntervalWeeks: number;
  weakTopicCount: number;
}

const userIdFrom = (req: Request, res: Response) => {
  const user = (req as UserRequest).user;
  const userId = Number(user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ message: "Unauthorized: Missing user ID" });
    return null;
  }
  if (user?.role && user.role !== "user") {
    res.status(403).json({ message: "Forbidden: user role required" });
    return null;
  }
  return userId;
};

const examIdFrom = (req: Request, res: Response) => {
  const examId = Number(req.params.exam_repository_id);
  if (!Number.isInteger(examId) || examId <= 0) {
    res.status(400).json({ message: "Invalid exam_repository_id" });
    return null;
  }
  return examId;
};

const ACCESSIBLE_EXAM_SQL = `SELECT
  qb.question_bank_id AS exam_repository_id,
  e.enrollment_id AS schedule_time_id,
  qb.subject_id,
  subject.subject_name,
  qb.bank_name AS exam_name,
  100.00 AS total_score,
  NULL AS total_question,
  qb.time_limit_minutes AS time_limit,
  qb.exam_period,
  (
    SELECT checkpoint.exam_checkpoint_id
    FROM exam_checkpoints checkpoint
    INNER JOIN exam_attempt_bank_results source_result
      ON source_result.exam_attempt_id = checkpoint.source_exam_attempt_id
     AND source_result.question_bank_id = qb.question_bank_id
    WHERE checkpoint.enrollment_id = e.enrollment_id
      AND checkpoint.exam_period = qb.exam_period
      AND checkpoint.status = 'pending'
      AND checkpoint.next_checkpoint_at <= NOW()
    ORDER BY checkpoint.next_checkpoint_at, checkpoint.exam_checkpoint_id
    LIMIT 1
  ) AS due_checkpoint_id,
  (
    SELECT COUNT(*)
    FROM exam_attempt_bank_results previous_result
    INNER JOIN exam_attempts previous_attempt
      ON previous_attempt.exam_attempt_id = previous_result.exam_attempt_id
    WHERE previous_attempt.enrollment_id = e.enrollment_id
      AND previous_attempt.status = 'submitted'
      AND previous_result.question_bank_id = qb.question_bank_id
  ) AS previous_result_count
FROM question_banks qb
INNER JOIN subjects subject ON subject.subject_id = qb.subject_id
INNER JOIN course_sections section
  ON section.subject_id = qb.subject_id
 AND section.status IN ('open', 'closed')
INNER JOIN section_instructors assignment
  ON assignment.section_id = section.section_id
 AND assignment.instructor_id = qb.owner_instructor_id
INNER JOIN enrollments e
  ON e.section_id = section.section_id
 AND e.status = 'enrolled'
INNER JOIN student_terms student_term
  ON student_term.student_term_id = e.student_term_id
 AND student_term.academic_term_id = section.academic_term_id
 AND student_term.status = 'active'
LEFT JOIN question ON question.question_bank_id = qb.question_bank_id
WHERE student_term.user_id = ?
  AND qb.status = 'published'`;

const accessibleExamGroup = `GROUP BY
  qb.question_bank_id, e.enrollment_id, qb.subject_id, subject.subject_name,
  qb.bank_name, qb.time_limit_minutes, qb.exam_period
HAVING COUNT(CASE WHEN question.is_active = 1 THEN 1 END) > 0
  AND (previous_result_count = 0 OR due_checkpoint_id IS NOT NULL)`;

const getAccessibleExam = async (
  userId: number,
  examId: number,
  connection: PoolConnection | typeof db = db,
) => {
  const [rows] = await connection.query<ExamRow[]>(
    `${ACCESSIBLE_EXAM_SQL} AND qb.question_bank_id = ?
     ${accessibleExamGroup}
     LIMIT 1`,
    [userId, examId],
  );
  return rows[0] ?? null;
};

const getRandomQuestions = async (
  examId: number,
  seed: string,
  connection: PoolConnection,
) => {
  const [allQuestions] = await connection.query<QuestionRow[]>(
    `SELECT question_id, question_text, question_image_path, question_score
     FROM question
     WHERE question_bank_id = ? AND is_active = 1`,
    [examId],
  );

  const selection = selectAutomaticBalancedExamQuestions(allQuestions, seed);
  const questions = selection?.questions ?? [];

  const [choices] = questions.length
    ? await connection.query<ChoiceRow[]>(
        `SELECT choice.choice_id, choice.question_id, choice.choice_order,
           choice.choice_text, choice.choice_image_path, choice.is_correct
         FROM choice
         WHERE choice.question_id IN (?) AND choice.is_active = 1
         ORDER BY choice.question_id, choice.choice_order`,
        [questions.map((question) => Number(question.question_id))],
      )
    : [[] as ChoiceRow[], [] as unknown[]];

  return { questions, choices: choices as ChoiceRow[] };
};

const getAttemptQuestions = async (
  attemptId: number,
  examId: number,
  connection: PoolConnection | typeof db = db,
) => {
  const [rows] = await connection.query<AttemptQuestionRow[]>(
    `SELECT attempt_question_id, source_question_id, source_bank_id,
       display_order, question_text_snapshot, image_path_snapshot,
       question_score_snapshot, choices_snapshot, selected_choice_order,
       is_correct, awarded_score
     FROM exam_attempt_questions
     WHERE exam_attempt_id = ? AND source_bank_id = ?
     ORDER BY display_order`,
    [attemptId, examId],
  );
  return rows;
};

const protectedImageUrl = (
  req: Request,
  examId: number,
  attemptId: number,
  imagePath: string | null,
) => {
  if (!imagePath) return null;
  const filename = path.basename(imagePath);
  return `${req.protocol}://${req.get("host")}/user/exam/${examId}/attempts/${attemptId}/images/${encodeURIComponent(filename)}`;
};

const serializeAttemptExam = (
  req: Request,
  exam: ExamRow,
  attemptId: number,
  questions: AttemptQuestionRow[],
) => {
  const totalScore = questions.reduce(
    (sum, question) => sum + Number(question.question_score_snapshot),
    0,
  );
  return {
    ...exam,
    total_score: totalScore,
    total_question: questions.length,
    parts: [
      {
        exam_part_id: Number(exam.exam_repository_id),
        part_order: 1,
        exam_part_name: exam.exam_name,
        questions: questions.map((question) => ({
          question_id: Number(question.source_question_id),
          question_order: Number(question.display_order),
          question_text: question.question_text_snapshot,
          question_image_url: protectedImageUrl(
            req,
            Number(exam.exam_repository_id),
            attemptId,
            question.image_path_snapshot,
          ),
          question_score: Number(question.question_score_snapshot),
          choices: parseSnapshotChoices(question.choices_snapshot).map(
            (choice) => ({
              choice_id: choice.choice_id,
              choice_order: choice.choice_order,
              choice_text: choice.choice_text,
              choice_image_url: protectedImageUrl(
                req,
                Number(exam.exam_repository_id),
                attemptId,
                choice.choice_image_path,
              ),
            }),
          ),
        })),
      },
    ],
  };
};

const loadAttemptForUpdate = async (
  connection: PoolConnection,
  attemptId: number,
  examId: number,
  expectedUserId?: number,
) => {
  const userClause = expectedUserId ? "AND student_term.user_id = ?" : "";
  const [rows] = await connection.query<AttemptRow[]>(
    `SELECT attempt.exam_attempt_id, attempt.enrollment_id,
       attempt.source_checkpoint_id, attempt.started_at,
       TIMESTAMPDIFF(SECOND, attempt.started_at, NOW()) AS elapsed_seconds,
       attempt.status, bank.time_limit_minutes, attempt.exam_period,
       bank.bank_name
     FROM exam_attempts attempt
     INNER JOIN enrollments enrollment
       ON enrollment.enrollment_id = attempt.enrollment_id
     INNER JOIN student_terms student_term
       ON student_term.student_term_id = enrollment.student_term_id
     INNER JOIN question_banks bank ON bank.question_bank_id = ?
     WHERE attempt.exam_attempt_id = ? ${userClause}
       AND EXISTS (
         SELECT 1 FROM exam_attempt_questions attempt_question
         WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id
           AND attempt_question.source_bank_id = bank.question_bank_id
       )
     LIMIT 1 FOR UPDATE`,
    expectedUserId
      ? [examId, attemptId, expectedUserId]
      : [examId, attemptId],
  );
  return rows[0] ?? null;
};

const existingFinalizedAttempt = async (
  connection: PoolConnection,
  attemptId: number,
  examId: number,
): Promise<FinalizedAttempt | null> => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT result.actual_score, result.max_score,
       SUM(CASE WHEN attempt_question.is_correct = 1 THEN 1 ELSE 0 END) AS correct_answers,
       COUNT(attempt_question.attempt_question_id) AS total_questions,
       checkpoint.next_checkpoint_at, checkpoint.interval_weeks
     FROM exam_attempt_bank_results result
     INNER JOIN exam_attempt_questions attempt_question
       ON attempt_question.exam_attempt_id = result.exam_attempt_id
      AND attempt_question.source_bank_id = result.question_bank_id
     LEFT JOIN exam_checkpoints checkpoint
       ON checkpoint.source_exam_attempt_id = result.exam_attempt_id
     WHERE result.exam_attempt_id = ? AND result.question_bank_id = ?
     GROUP BY result.bank_result_id, result.actual_score, result.max_score,
       checkpoint.next_checkpoint_at, checkpoint.interval_weeks
     LIMIT 1`,
    [attemptId, examId],
  );
  const row = rows[0];
  if (!row) return null;
  const percentage =
    Number(row.max_score) > 0
      ? (Number(row.actual_score) / Number(row.max_score)) * 100
      : 0;
  return {
    historyId: attemptId,
    actualScore: Number(row.actual_score),
    maximumScore: Number(row.max_score),
    correctAnswers: Number(row.correct_answers),
    totalQuestions: Number(row.total_questions),
    nextCheckpointAt: row.next_checkpoint_at ?? null,
    checkpointIntervalWeeks: Number(row.interval_weeks ?? 0),
    weakTopicCount: percentage < 50 ? 1 : 0,
  };
};

const finalizeAttempt = async (
  connection: PoolConnection,
  attemptId: number,
  examId: number,
  options: { expectedUserId?: number; timedOut?: boolean } = {},
): Promise<FinalizedAttempt | null> => {
  const attempt = await loadAttemptForUpdate(
    connection,
    attemptId,
    examId,
    options.expectedUserId,
  );
  if (!attempt) return null;

  const existing = await existingFinalizedAttempt(connection, attemptId, examId);
  if (existing) return existing;
  if (!["in_progress", "expired"].includes(attempt.status)) return null;

  const questions = await getAttemptQuestions(attemptId, examId, connection);
  if (!questions.length) return null;
  const score = scoreSnapshotQuestions(questions);
  if (score.maximumScore <= 0) return null;

  for (const [index, question] of questions.entries()) {
    const result = score.results[index];
    await connection.query(
      `UPDATE exam_attempt_questions
       SET is_correct = ?, awarded_score = ?,
           answered_at = IF(selected_choice_order IS NULL, NULL, COALESCE(answered_at, NOW()))
       WHERE attempt_question_id = ?`,
      [result.isCorrect ? 1 : 0, result.awardedScore, question.attempt_question_id],
    );
  }

  const timedOut =
    options.timedOut === true ||
    attempt.status === "expired" ||
    remainingSecondsFor(
      Number(attempt.time_limit_minutes),
      Number(attempt.elapsed_seconds),
    ) <= 0;
  const percentage = (score.actualScore / score.maximumScore) * 100;
  const weak = percentage < 50;

  await connection.query(
    `UPDATE exam_attempts
     SET submitted_at = CASE WHEN ? = 1
          THEN COALESCE(submitted_at, DATE_ADD(started_at, INTERVAL ? MINUTE))
          ELSE NOW() END,
       actual_score = ?, max_score = ?, weak_topic_count = ?,
       status = 'submitted', updated_at = NOW()
     WHERE exam_attempt_id = ? AND status IN ('in_progress', 'expired')`,
    [
      timedOut ? 1 : 0,
      Number(attempt.time_limit_minutes),
      score.actualScore,
      score.maximumScore,
      weak ? 1 : 0,
      attemptId,
    ],
  );
  await connection.query(
    `INSERT INTO exam_attempt_bank_results
      (exam_attempt_id, question_bank_id, bank_name_snapshot,
       actual_score, max_score, percentage, is_weak_topic)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      attemptId,
      examId,
      attempt.bank_name,
      score.actualScore,
      score.maximumScore,
      Number(percentage.toFixed(2)),
      weak ? 1 : 0,
    ],
  );

  if (attempt.source_checkpoint_id) {
    await connection.query(
      `UPDATE exam_checkpoints
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE exam_checkpoint_id = ? AND status = 'pending'`,
      [attempt.source_checkpoint_id],
    );
  }

  let nextCheckpointAt: Date | null = null;
  let checkpointIntervalWeeks = 0;
  if (weak) {
    checkpointIntervalWeeks = checkpointWeeksFor(percentage);
    nextCheckpointAt = new Date();
    nextCheckpointAt.setDate(
      nextCheckpointAt.getDate() + checkpointIntervalWeeks * 7,
    );
    await connection.query(
      `INSERT INTO exam_checkpoints
        (enrollment_id, source_exam_attempt_id, exam_period,
         weak_topic_count, interval_weeks, next_checkpoint_at, status)
       VALUES (?, ?, ?, 1, ?, ?, 'pending')`,
      [
        attempt.enrollment_id,
        attemptId,
        attempt.exam_period,
        checkpointIntervalWeeks,
        nextCheckpointAt,
      ],
    );
  }

  return {
    historyId: attemptId,
    actualScore: score.actualScore,
    maximumScore: score.maximumScore,
    correctAnswers: score.correctAnswers,
    totalQuestions: questions.length,
    nextCheckpointAt,
    checkpointIntervalWeeks,
    weakTopicCount: weak ? 1 : 0,
  };
};

export const getExamsForCurrentTerm = async (req: Request, res: Response) => {
  try {
    const userId = userIdFrom(req, res);
    if (!userId) return;
    const [rows] = await db.query<ExamRow[]>(
      `${ACCESSIBLE_EXAM_SQL}
       ${accessibleExamGroup}
       ORDER BY subject.subject_name, qb.bank_name`,
      [userId],
    );
    return res.json({
      message: "Exams retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("getExamsForCurrentTerm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getExamDetail = async (req: Request, res: Response) => {
  try {
    const userId = userIdFrom(req, res);
    if (!userId) return;
    const examId = examIdFrom(req, res);
    if (!examId) return;
    const exam = await getAccessibleExam(userId, examId);
    if (!exam) {
      return res.status(404).json({
        message: "Exam was not found or is not available yet",
      });
    }
    return res.json({
      message: "Exam metadata retrieved successfully",
      data: { ...exam, parts: [] },
    });
  } catch (error) {
    console.error("getExamDetail error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getExamScoreHistory = async (req: Request, res: Response) => {
  try {
    const userId = userIdFrom(req, res);
    if (!userId) return;
    const termIdValue = req.query.student_term_id;
    const termId = termIdValue === undefined ? null : Number(termIdValue);
    if (termId !== null && (!Number.isInteger(termId) || termId <= 0)) {
      return res.status(400).json({ message: "Invalid student_term_id" });
    }
    const termScope =
      termId === null
        ? "AND student_term.status = 'active'"
        : "AND student_term.student_term_id = ?";
    const parameters = termId === null ? [userId] : [userId, termId];
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT attempt.exam_attempt_id AS exam_score_history_id,
         result.question_bank_id AS exam_repository_id,
         subject.subject_id, subject.subject_name,
         result.bank_name_snapshot AS exam_name,
         result.actual_score, result.max_score AS exam_max_score,
         attempt.submitted_at AS exam_date,
         result.is_weak_topic, result.percentage
       FROM exam_attempts attempt
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = attempt.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       INNER JOIN course_sections section
         ON section.section_id = enrollment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       INNER JOIN exam_attempt_bank_results result
         ON result.exam_attempt_id = attempt.exam_attempt_id
       WHERE student_term.user_id = ?
         AND student_term.status IN ('active', 'completed')
         ${termScope} AND attempt.status = 'submitted'
       ORDER BY attempt.submitted_at DESC`,
      parameters,
    );
    const data = rows.map((row) => ({
      ...row,
      weak_topics: Number(row.is_weak_topic)
        ? [{ topic_name: row.exam_name, percentage: Number(row.percentage) }]
        : [],
    }));
    return res.json({
      message: "Exam score history retrieved successfully",
      user_id: userId,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("getExamScoreHistory error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getExamInsights = async (req: Request, res: Response) => {
  try {
    const userId = userIdFrom(req, res);
    if (!userId) return;
    const [weakTopics] = await db.query<RowDataPacket[]>(
      `SELECT enrollment.enrollment_id AS schedule_time_id,
         result.question_bank_id AS exam_repository_id,
         result.question_bank_id AS exam_part_id,
         result.bank_name_snapshot AS topic_name,
         subject.subject_id, subject.subject_name,
         result.bank_name_snapshot AS exam_name,
         result.actual_score, result.max_score, result.percentage
       FROM exam_attempt_bank_results result
       INNER JOIN exam_attempts attempt
         ON attempt.exam_attempt_id = result.exam_attempt_id
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = attempt.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       INNER JOIN course_sections section
         ON section.section_id = enrollment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       WHERE student_term.user_id = ? AND student_term.status = 'active'
         AND result.is_weak_topic = 1
       ORDER BY attempt.submitted_at DESC`,
      [userId],
    );
    const [checkpoints] = await db.query<RowDataPacket[]>(
      `SELECT checkpoint.enrollment_id AS schedule_time_id,
         COALESCE(result.question_bank_id, 0) AS exam_repository_id,
         COALESCE(result.bank_name_snapshot,
           CONCAT(UPPER(checkpoint.exam_period), ' review')) AS exam_name,
         subject.subject_id, subject.subject_name,
         checkpoint.next_checkpoint_at, checkpoint.interval_weeks,
         checkpoint.weak_topic_count,
         COALESCE((
           SELECT item.difference_minutes
           FROM weekly_recommendation recommendation
           INNER JOIN weekly_recommendation_item item
             ON item.recommendation_id = recommendation.recommendation_id
            AND item.enrollment_id = checkpoint.enrollment_id
           INNER JOIN schedule_types schedule_type
             ON schedule_type.schedule_type_id = item.schedule_type_id
            AND LOWER(schedule_type.type_code) = 'review'
           WHERE recommendation.source_exam_attempt_id = checkpoint.source_exam_attempt_id
           ORDER BY recommendation.version DESC
           LIMIT 1
         ), 0) AS review_minutes_delta,
         (SELECT schedule_type_id FROM schedule_types
          WHERE is_active=1 AND LOWER(type_code)='review' LIMIT 1
         ) AS review_schedule_type_id,
         'review' AS review_schedule_type_code
       FROM exam_checkpoints checkpoint
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = checkpoint.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       INNER JOIN course_sections section
         ON section.section_id = enrollment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       LEFT JOIN exam_attempt_bank_results result
         ON result.exam_attempt_id = checkpoint.source_exam_attempt_id
       WHERE student_term.user_id = ? AND student_term.status = 'active'
         AND checkpoint.status = 'pending'
       ORDER BY checkpoint.next_checkpoint_at`,
      [userId],
    );
    return res.json({
      message: "Exam insights retrieved successfully",
      weak_topics: weakTopics,
      next_checkpoints: checkpoints,
    });
  } catch (error) {
    console.error("getExamInsights error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const startExam = async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  if (!userId) return;
  const examId = examIdFrom(req, res);
  if (!examId) return;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "SELECT question_bank_id FROM question_banks WHERE question_bank_id = ? FOR UPDATE",
      [examId],
    );
    const exam = await getAccessibleExam(userId, examId, connection);
    if (!exam) {
      await connection.rollback();
      return res.status(404).json({
        message: "Exam was not found or is not available yet",
      });
    }
    await connection.query(
      "SELECT enrollment_id FROM enrollments WHERE enrollment_id = ? FOR UPDATE",
      [exam.schedule_time_id],
    );

    const [activeRows] = await connection.query<AttemptRow[]>(
      `SELECT attempt.exam_attempt_id, attempt.enrollment_id,
         attempt.source_checkpoint_id, attempt.started_at,
         TIMESTAMPDIFF(SECOND, attempt.started_at, NOW()) AS elapsed_seconds,
         attempt.status, bank.time_limit_minutes, attempt.exam_period,
         bank.bank_name
       FROM exam_attempts attempt
       INNER JOIN question_banks bank ON bank.question_bank_id = ?
       WHERE attempt.enrollment_id = ? AND attempt.exam_period = ?
         AND attempt.status IN ('in_progress', 'expired')
         AND EXISTS (
           SELECT 1 FROM exam_attempt_questions attempt_question
           WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id
             AND attempt_question.source_bank_id = bank.question_bank_id
         )
         AND NOT EXISTS (
           SELECT 1 FROM exam_attempt_bank_results result
           WHERE result.exam_attempt_id = attempt.exam_attempt_id
             AND result.question_bank_id = ?
         )
       ORDER BY attempt.exam_attempt_id DESC
       LIMIT 1 FOR UPDATE`,
      [examId, exam.schedule_time_id, exam.exam_period, examId],
    );
    const activeAttempt = activeRows[0];
    if (activeAttempt) {
      const remainingSeconds = remainingSecondsFor(
        Number(activeAttempt.time_limit_minutes),
        Number(activeAttempt.elapsed_seconds),
      );
      if (activeAttempt.status === "expired" || remainingSeconds <= 0) {
        await finalizeAttempt(connection, activeAttempt.exam_attempt_id, examId, {
          expectedUserId: userId,
          timedOut: true,
        });
        await connection.commit();
        return res.status(409).json({
          message: "หมดเวลาแล้ว ระบบส่งคำตอบที่บันทึกไว้ให้อัตโนมัติแล้ว",
        });
      }
      const questions = await getAttemptQuestions(
        activeAttempt.exam_attempt_id,
        examId,
        connection,
      );
      const answers = questions.flatMap((question) => {
        if (question.selected_choice_order == null) return [];
        const selected = parseSnapshotChoices(question.choices_snapshot).find(
          (choice) =>
            choice.choice_order === Number(question.selected_choice_order),
        );
        return selected && question.source_question_id
          ? [
              {
                question_id: Number(question.source_question_id),
                choice_id: selected.choice_id,
              },
            ]
          : [];
      });
      await connection.commit();
      return res.json({
        message: "Exam attempt resumed successfully",
        data: {
          exam_attempt_id: Number(activeAttempt.exam_attempt_id),
          started_at: activeAttempt.started_at,
          remaining_seconds: remainingSeconds,
          resumed: true,
          answers,
          exam: serializeAttemptExam(
            req,
            exam,
            Number(activeAttempt.exam_attempt_id),
            questions,
          ),
        },
      });
    }

    const randomSeed = randomUUID();
    const { questions, choices } = await getRandomQuestions(
      examId,
      randomSeed,
      connection,
    );
    if (!questions.length) {
      await connection.rollback();
      return res.status(409).json({
        message:
          "ไม่สามารถสร้างข้อสอบที่แบ่งระดับใกล้เคียงกันและรวมได้ 100 คะแนนพอดี กรุณาแจ้งอาจารย์ผู้สอน",
      });
    }
    const choicesByQuestion = new Map<number, ChoiceRow[]>();
    for (const choice of choices) {
      const questionId = Number(choice.question_id);
      const current = choicesByQuestion.get(questionId) ?? [];
      current.push(choice);
      choicesByQuestion.set(questionId, current);
    }
    if (
      questions.some((question) => {
        const options = choicesByQuestion.get(Number(question.question_id)) ?? [];
        return (
          options.length < 2 ||
          options.filter((choice) => choice.is_correct).length !== 1
        );
      })
    ) {
      await connection.rollback();
      return res.status(409).json({
        message: "พบคำถามที่มีตัวเลือกหรือเฉลยไม่สมบูรณ์ กรุณาแจ้งอาจารย์ผู้สอน",
      });
    }

    const [attemptResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO exam_attempts
        (enrollment_id, source_checkpoint_id, exam_period, random_seed,
         started_at, status, weak_topic_count)
       VALUES (?, ?, ?, ?, NOW(), 'in_progress', 0)`,
      [
        exam.schedule_time_id,
        exam.due_checkpoint_id,
        exam.exam_period,
        randomSeed,
      ],
    );
    for (const [index, question] of questions.entries()) {
      const options = choicesByQuestion.get(Number(question.question_id)) ?? [];
      await connection.query(
        `INSERT INTO exam_attempt_questions
          (exam_attempt_id, source_question_id, source_bank_id, display_order,
           question_text_snapshot, image_path_snapshot,
           question_score_snapshot, choices_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attemptResult.insertId,
          question.question_id,
          examId,
          index + 1,
          question.question_text,
          question.question_image_path,
          Number(question.question_score),
          JSON.stringify(
            options.map((option) => ({
              choice_id: Number(option.choice_id),
              choice_order: Number(option.choice_order),
              choice_text: option.choice_text,
              choice_image_path: option.choice_image_path,
              is_correct: Boolean(option.is_correct),
            })),
          ),
        ],
      );
    }
    const attemptQuestions = await getAttemptQuestions(
      attemptResult.insertId,
      examId,
      connection,
    );
    const [startedRows] = await connection.query<RowDataPacket[]>(
      "SELECT started_at FROM exam_attempts WHERE exam_attempt_id = ?",
      [attemptResult.insertId],
    );
    await connection.commit();
    return res.status(201).json({
      message: "Exam attempt started successfully",
      data: {
        exam_attempt_id: Number(attemptResult.insertId),
        started_at: startedRows[0]?.started_at,
        remaining_seconds: Math.max(0, Number(exam.time_limit) * 60),
        resumed: false,
        answers: [],
        exam: serializeAttemptExam(
          req,
          exam,
          Number(attemptResult.insertId),
          attemptQuestions,
        ),
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("startExam error:", error);
    return res.status(500).json({ message: "Unable to start exam" });
  } finally {
    connection.release();
  }
};

export const saveExamAnswer = async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  if (!userId) return;
  const examId = examIdFrom(req, res);
  if (!examId) return;
  const attemptId = Number(req.params.attempt_id);
  const questionId = Number(req.body?.question_id);
  const choiceId = Number(req.body?.choice_id);
  if (
    ![attemptId, questionId, choiceId].every(
      (value) => Number.isInteger(value) && value > 0,
    )
  ) {
    return res.status(400).json({
      message: "A valid attempt, question and choice are required",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const attempt = await loadAttemptForUpdate(
      connection,
      attemptId,
      examId,
      userId,
    );
    if (!attempt || !["in_progress", "expired"].includes(attempt.status)) {
      await connection.rollback();
      return res.status(409).json({
        message: "This exam attempt is no longer active",
      });
    }
    if (
      attempt.status === "expired" ||
      remainingSecondsFor(
        Number(attempt.time_limit_minutes),
        Number(attempt.elapsed_seconds),
      ) <= 0
    ) {
      await finalizeAttempt(connection, attemptId, examId, {
        expectedUserId: userId,
        timedOut: true,
      });
      await connection.commit();
      return res.status(409).json({
        message: "หมดเวลาแล้ว ระบบส่งคำตอบที่บันทึกไว้ให้อัตโนมัติแล้ว",
      });
    }

    const [questionRows] = await connection.query<AttemptQuestionRow[]>(
      `SELECT attempt_question_id, source_question_id, source_bank_id,
         display_order, question_text_snapshot, image_path_snapshot,
         question_score_snapshot, choices_snapshot, selected_choice_order,
         is_correct, awarded_score
       FROM exam_attempt_questions
       WHERE exam_attempt_id = ? AND source_bank_id = ?
         AND source_question_id = ?
       LIMIT 1 FOR UPDATE`,
      [attemptId, examId, questionId],
    );
    const attemptQuestion = questionRows[0];
    const selectedChoice = attemptQuestion
      ? parseSnapshotChoices(attemptQuestion.choices_snapshot).find(
          (choice) => choice.choice_id === choiceId,
        )
      : null;
    if (!attemptQuestion || !selectedChoice) {
      await connection.rollback();
      return res.status(400).json({ message: "The selected choice is invalid" });
    }
    await connection.query(
      `UPDATE exam_attempt_questions
       SET selected_choice_order = ?, answered_at = NOW()
       WHERE attempt_question_id = ?`,
      [selectedChoice.choice_order, attemptQuestion.attempt_question_id],
    );
    await connection.commit();
    return res.json({ message: "Answer saved", question_id: questionId });
  } catch (error) {
    await connection.rollback();
    console.error("saveExamAnswer error:", error);
    return res.status(500).json({ message: "Unable to save exam answer" });
  } finally {
    connection.release();
  }
};

export const submitExam = async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  if (!userId) return;
  const examId = examIdFrom(req, res);
  if (!examId) return;
  const attemptId = Number(req.body?.exam_attempt_id);
  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return res.status(400).json({ message: "A valid exam_attempt_id is required" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await finalizeAttempt(connection, attemptId, examId, {
      expectedUserId: userId,
    });
    if (!result) {
      await connection.rollback();
      return res.status(409).json({
        message: "This exam attempt is no longer active",
      });
    }
    const [subjectRows] = await connection.query<RowDataPacket[]>(
      `SELECT cs.subject_id FROM exam_attempts ea
       INNER JOIN enrollments e ON e.enrollment_id=ea.enrollment_id
       INNER JOIN course_sections cs ON cs.section_id=e.section_id
       WHERE ea.exam_attempt_id=? LIMIT 1`,
      [result.historyId],
    );
    const subjectId = subjectRows[0]?.subject_id;
    await connection.commit();
    const recommendationResult = await safelyGenerateRecommendation({
      userId,
      triggerType: "exam_submitted",
      examAttemptId: result.historyId,
    });
    const recommendationItems = recommendationResult.recommendation?.items as
      | Array<Record<string, unknown>>
      | undefined;
    const reviewItem = recommendationItems?.find(
      (item) =>
        item.schedule_type_code === "review" && item.subject_id === subjectId,
    );
    return res.json({
      message: "Exam submitted successfully",
      exam_attempt_id: result.historyId,
      exam_score_history_id: result.historyId,
      actual_score: result.actualScore,
      exam_max_score: result.maximumScore,
      correct_answers: result.correctAnswers,
      total_questions: result.totalQuestions,
      next_checkpoint_at: result.nextCheckpointAt,
      checkpoint_interval_weeks: result.checkpointIntervalWeeks,
      weak_topic_count: result.weakTopicCount,
      review_minutes_delta: Number(reviewItem?.difference_minutes ?? 0),
      schedule_recommendation_id:
        recommendationResult.recommendation?.recommendation_id ?? null,
      recommendation_warning: recommendationResult.warning,
    });
  } catch (error) {
    await connection.rollback();
    console.error("submitExam error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};

export const getExamAttemptImage = async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  if (!userId) return;
  const examId = examIdFrom(req, res);
  if (!examId) return;
  const attemptId = Number(req.params.attempt_id);
  const filename = path.basename(String(req.params.filename ?? ""));
  if (
    !Number.isInteger(attemptId) ||
    attemptId <= 0 ||
    !/^[A-Za-z0-9._-]{1,255}$/.test(filename)
  ) {
    return res.status(400).json({ message: "Invalid image request" });
  }
  try {
    const [rows] = await db.query<AttemptQuestionRow[]>(
      `SELECT attempt_question.attempt_question_id,
         attempt_question.source_question_id,
         attempt_question.source_bank_id,
         attempt_question.display_order,
         attempt_question.question_text_snapshot,
         attempt_question.image_path_snapshot,
         attempt_question.question_score_snapshot,
         attempt_question.choices_snapshot,
         attempt_question.selected_choice_order,
         attempt_question.is_correct,
         attempt_question.awarded_score
       FROM exam_attempt_questions attempt_question
       INNER JOIN exam_attempts attempt
         ON attempt.exam_attempt_id = attempt_question.exam_attempt_id
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = attempt.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       WHERE attempt.exam_attempt_id = ?
         AND attempt_question.source_bank_id = ?
         AND student_term.user_id = ?`,
      [attemptId, examId, userId],
    );
    const allowed = rows.some((row) => {
      if (
        row.image_path_snapshot &&
        path.basename(row.image_path_snapshot) === filename
      ) {
        return true;
      }
      return parseSnapshotChoices(row.choices_snapshot).some(
        (choice) =>
          choice.choice_image_path &&
          path.basename(choice.choice_image_path) === filename,
      );
    });
    if (!allowed) return res.status(404).json({ message: "Image not found" });
    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(
      path.resolve(__dirname, "../../uploads/questions", filename),
    );
  } catch (error) {
    console.error("getExamAttemptImage error:", error);
    return res.status(500).json({ message: "Unable to load exam image" });
  }
};

export const submitExpiredExamAttempts = async () => {
  const [candidates] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT attempt.exam_attempt_id,
       attempt_question.source_bank_id AS question_bank_id
     FROM exam_attempts attempt
     INNER JOIN exam_attempt_questions attempt_question
       ON attempt_question.exam_attempt_id = attempt.exam_attempt_id
     INNER JOIN question_banks bank
       ON bank.question_bank_id = attempt_question.source_bank_id
     WHERE attempt.status = 'in_progress'
       AND NOW() >= DATE_ADD(attempt.started_at, INTERVAL bank.time_limit_minutes MINUTE)
     ORDER BY attempt.exam_attempt_id
     LIMIT 50`,
  );
  for (const candidate of candidates) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await finalizeAttempt(
        connection,
        Number(candidate.exam_attempt_id),
        Number(candidate.question_bank_id),
        { timedOut: true },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("submitExpiredExamAttempts item error:", error);
    } finally {
      connection.release();
    }
  }
  return candidates.length;
};
