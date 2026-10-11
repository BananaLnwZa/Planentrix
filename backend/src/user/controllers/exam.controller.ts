import path from "path";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import db from "../../config/db";
import {
  EXAM_TIME_LIMITS_ENABLED,
  questionBankTimeLimitSql,
} from "../../config/exam-timing";
import { selectAutomaticBalancedExamQuestions } from "../../services/exam-selection";
import {
  checkpointWeeksFor,
  nextCheckpointAppointment,
  parseSnapshotChoices,
  remainingSecondsFor,
  scoreSnapshotQuestions,
} from "../services/exam-attempt.rules";
import { safelyGenerateRecommendation } from "../services/recommendation.engine";
import { voidPendingCheckpointsForExamFlow } from "../services/term-workflow";
import type { ExamAttemptWorkflowPhase, ExamWorkflowPhase } from "../services/term-workflow";

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
  time_limit: number | null;
  exam_period: "midterm" | "final";
  workflow_phase: ExamWorkflowPhase;
  due_checkpoint_id: number | null;
  previous_result_count: number;
}

interface CompositeExam extends ExamRow {
  part_ids: number[];
  part_names: string[];
}

const examSetName = (period: "midterm" | "final", subjectName: string) =>
  `ชุดทดสอบ${period === "midterm" ? "กลางภาค" : "ปลายภาค"}วิชา ${subjectName}`;

const groupExamParts = (rows: ExamRow[]): CompositeExam[] => {
  const groups = new Map<string, CompositeExam>();
  for (const row of [...rows].sort(
    (left, right) => left.exam_repository_id - right.exam_repository_id,
  )) {
    const key = `${row.schedule_time_id}:${row.subject_id}:${row.exam_period}`;
    const existing = groups.get(key);
    if (existing) {
      existing.part_ids.push(Number(row.exam_repository_id));
      existing.part_names.push(row.exam_name);
      if (!existing.due_checkpoint_id) existing.due_checkpoint_id = row.due_checkpoint_id;
    } else {
      groups.set(key, {
        ...row,
        exam_name: examSetName(row.exam_period, row.subject_name),
        part_ids: [Number(row.exam_repository_id)],
        part_names: [row.exam_name],
      });
    }
  }
  return [...groups.values()].sort(
    (left, right) =>
      left.subject_name.localeCompare(right.subject_name) ||
      left.exam_repository_id - right.exam_repository_id,
  );
};

interface QuestionRow extends RowDataPacket {
  question_id: number;
  question_bank_id: number;
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
  time_limit_minutes: number | string | null;
  exam_period: "midterm" | "final";
  bank_name: string;
  workflow_phase: ExamAttemptWorkflowPhase;
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
  workflowPhase: ExamAttemptWorkflowPhase;
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

const workflowPhaseSql = (dateExpression = "CURDATE()", periodExpression = "qb.exam_period") => `CASE ${periodExpression}
  WHEN 'midterm' THEN CASE
    WHEN academic_term.midterm_start_date IS NULL OR academic_term.midterm_end_date IS NULL THEN 'checkpoint'
    WHEN ${dateExpression} > academic_term.midterm_end_date THEN 'midterm_post'
    WHEN ${dateExpression} >= academic_term.midterm_start_date THEN 'midterm_exam'
    WHEN DATEDIFF(academic_term.midterm_start_date, ${dateExpression}) BETWEEN 1 AND 7 THEN 'midterm_1w'
    WHEN DATEDIFF(academic_term.midterm_start_date, ${dateExpression}) BETWEEN 8 AND 14 THEN 'midterm_2w'
    ELSE 'checkpoint' END
  WHEN 'final' THEN CASE
    WHEN academic_term.final_start_date IS NULL OR academic_term.final_end_date IS NULL THEN 'checkpoint'
    WHEN ${dateExpression} > academic_term.final_end_date THEN 'final_post'
    WHEN ${dateExpression} >= academic_term.final_start_date THEN 'final_exam'
    WHEN DATEDIFF(academic_term.final_start_date, ${dateExpression}) BETWEEN 1 AND 7 THEN 'final_1w'
    WHEN DATEDIFF(academic_term.final_start_date, ${dateExpression}) BETWEEN 8 AND 14 THEN 'final_2w'
    ELSE 'checkpoint' END
  ELSE 'checkpoint' END`;

// The active bank changes only after midterm ends. Neither bank is available
// during either exam window or after the final exam window has ended.
const activeExamPeriodSql = (periodExpression = "qb.exam_period") => `(
  academic_term.midterm_start_date IS NOT NULL
  AND academic_term.midterm_end_date IS NOT NULL
  AND academic_term.final_start_date IS NOT NULL
  AND academic_term.final_end_date IS NOT NULL
  AND (
    (${periodExpression} = 'midterm' AND CURDATE() < academic_term.midterm_start_date)
    OR (${periodExpression} = 'final'
      AND CURDATE() > academic_term.midterm_end_date
      AND CURDATE() < academic_term.final_start_date)
  )
)`;

const ACCESSIBLE_EXAM_SQL = `SELECT
  qb.question_bank_id AS exam_repository_id,
  e.enrollment_id AS schedule_time_id,
  qb.subject_id,
  subject.subject_name,
  qb.bank_name AS exam_name,
  100.00 AS total_score,
  NULL AS total_question,
  ${questionBankTimeLimitSql("qb")} AS time_limit,
  qb.exam_period,
  ${workflowPhaseSql()} AS workflow_phase,
  (
    SELECT checkpoint.exam_checkpoint_id
    FROM exam_checkpoints checkpoint
    WHERE checkpoint.enrollment_id = e.enrollment_id
      AND checkpoint.exam_period = qb.exam_period
      AND checkpoint.status = 'pending'
      AND checkpoint.next_checkpoint_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)
    ORDER BY checkpoint.next_checkpoint_at, checkpoint.exam_checkpoint_id
    LIMIT 1
  ) AS due_checkpoint_id,
  (
    SELECT COUNT(*)
    FROM exam_attempts previous_attempt
    WHERE previous_attempt.enrollment_id = e.enrollment_id
      AND previous_attempt.exam_period = qb.exam_period
      AND previous_attempt.status = 'submitted'
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
INNER JOIN academic_terms academic_term
  ON academic_term.academic_term_id = student_term.academic_term_id
LEFT JOIN question ON question.question_bank_id = qb.question_bank_id
WHERE student_term.user_id = ?
  AND qb.status = 'published'
  AND ${activeExamPeriodSql()}`;

const accessibleExamGroup = `GROUP BY
  qb.question_bank_id, e.enrollment_id, qb.subject_id, subject.subject_name,
  qb.bank_name, time_limit, qb.exam_period,
  academic_term.midterm_start_date, academic_term.midterm_end_date,
  academic_term.final_start_date, academic_term.final_end_date
HAVING COUNT(CASE WHEN question.is_active = 1 THEN 1 END) > 0
  AND workflow_phase NOT IN ('midterm_exam', 'midterm_post', 'final_exam', 'final_post')
  AND ((workflow_phase = 'checkpoint'
      AND (previous_result_count = 0 OR due_checkpoint_id IS NOT NULL))
    OR (workflow_phase IN ('midterm_2w','midterm_1w','final_2w','final_1w')
      AND NOT EXISTS (
        SELECT 1
        FROM exam_attempts phase_attempt
        WHERE phase_attempt.enrollment_id = e.enrollment_id
          AND phase_attempt.exam_period = qb.exam_period
          AND phase_attempt.status = 'submitted'
          AND phase_attempt.workflow_phase = (${workflowPhaseSql()})
      )))`;

const getAccessibleExam = async (
  userId: number,
  examId: number,
  connection: PoolConnection | typeof db = db,
) => {
  const [rows] = await connection.query<ExamRow[]>(
    `${ACCESSIBLE_EXAM_SQL} ${accessibleExamGroup}`,
    [userId],
  );
  return groupExamParts(rows).find((exam) => exam.exam_repository_id === examId) ?? null;
};

export const hasOutstandingAssessments = async (
  userId: number,
  phase: ExamAttemptWorkflowPhase,
) => {
  const [rows] = await db.query<ExamRow[]>(
    `${ACCESSIBLE_EXAM_SQL}
     ${accessibleExamGroup}`,
    [userId],
  );
  return groupExamParts(rows).some((exam) => exam.workflow_phase === phase);
};

export const recommendationAfterAssessmentBatch = async (
  userId: number,
  phase: ExamAttemptWorkflowPhase,
  attemptId: number,
  generate = safelyGenerateRecommendation,
) => {
  if (phase !== "checkpoint" && phase !== "midterm_2w" && phase !== "final_2w") {
    return { recommendation: null, warning: null };
  }
  if (await hasOutstandingAssessments(userId, phase)) {
    return { recommendation: null, warning: null };
  }
  return generate({
    userId,
    triggerType: "exam_submitted",
    examAttemptId: attemptId,
    examWorkflowPhase: phase,
  });
};

const getRandomQuestions = async (
  partIds: number[],
  seed: string,
  connection: PoolConnection,
) => {
  const [allQuestions] = await connection.query<QuestionRow[]>(
    `SELECT question_id, question_bank_id, question_text, question_image_path, question_score
     FROM question
     WHERE question_bank_id IN (?) AND is_active = 1`,
    [partIds],
  );

  const selection = selectAutomaticBalancedExamQuestions(
    allQuestions,
    seed,
    partIds,
  );
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
  connection: PoolConnection | typeof db = db,
) => {
  const [rows] = await connection.query<AttemptQuestionRow[]>(
    `SELECT attempt_question_id, source_question_id, source_bank_id,
       display_order, question_text_snapshot, image_path_snapshot,
       question_score_snapshot, choices_snapshot, selected_choice_order,
       is_correct, awarded_score
     FROM exam_attempt_questions
     WHERE exam_attempt_id = ?
     ORDER BY display_order`,
    [attemptId],
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
  exam: CompositeExam,
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
    parts: exam.part_ids.map((partId, partIndex) => ({
        exam_part_id: partId,
        part_order: partIndex + 1,
        exam_part_name: exam.part_names[partIndex],
        questions: questions
          .filter((question) => Number(question.source_bank_id) === partId)
          .map((question) => ({
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
      })),
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
       attempt.status, ${questionBankTimeLimitSql("bank")} AS time_limit_minutes, attempt.exam_period,
       attempt.workflow_phase,
       bank.bank_name
     FROM exam_attempts attempt
     INNER JOIN enrollments enrollment
       ON enrollment.enrollment_id = attempt.enrollment_id
     INNER JOIN student_terms student_term
       ON student_term.student_term_id = enrollment.student_term_id
     INNER JOIN question_banks bank ON bank.question_bank_id = ?
     WHERE attempt.exam_attempt_id = ? ${userClause}
       AND attempt.exam_period = bank.exam_period
       AND EXISTS (
         SELECT 1 FROM exam_attempt_questions attempt_question
         INNER JOIN question_banks source_bank
           ON source_bank.question_bank_id = attempt_question.source_bank_id
         WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id
           AND source_bank.subject_id = bank.subject_id
           AND source_bank.exam_period = bank.exam_period
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
    `SELECT attempt.actual_score, attempt.max_score,
       attempt.workflow_phase, attempt.weak_topic_count,
       (SELECT COUNT(*) FROM exam_attempt_questions attempt_question
        WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id
          AND attempt_question.is_correct = 1) AS correct_answers,
       (SELECT COUNT(*) FROM exam_attempt_questions attempt_question
        WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id) AS total_questions,
       DATE_FORMAT(checkpoint.next_checkpoint_at, '%Y-%m-%dT%H:%i:%s+07:00') AS next_checkpoint_at,
       checkpoint.interval_weeks
     FROM exam_attempts attempt
     INNER JOIN question_banks bank ON bank.question_bank_id = ?
     LEFT JOIN exam_checkpoints checkpoint
       ON checkpoint.source_exam_attempt_id = attempt.exam_attempt_id
     WHERE attempt.exam_attempt_id = ? AND attempt.status = 'submitted'
       AND attempt.exam_period = bank.exam_period
       AND EXISTS (SELECT 1 FROM exam_attempt_questions attempt_question
                   INNER JOIN question_banks source_bank
                     ON source_bank.question_bank_id = attempt_question.source_bank_id
                   WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id
                     AND source_bank.subject_id = bank.subject_id
                     AND source_bank.exam_period = bank.exam_period)
     LIMIT 1`,
    [examId, attemptId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    historyId: attemptId,
    actualScore: Number(row.actual_score),
    maximumScore: Number(row.max_score),
    correctAnswers: Number(row.correct_answers),
    totalQuestions: Number(row.total_questions),
    nextCheckpointAt: row.next_checkpoint_at ?? null,
    checkpointIntervalWeeks: Number(row.interval_weeks ?? 0),
    weakTopicCount: Number(row.weak_topic_count ?? 0),
    workflowPhase: String(row.workflow_phase) as ExamAttemptWorkflowPhase,
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

  const questions = await getAttemptQuestions(attemptId, connection);
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
      attempt.time_limit_minutes === null
        ? null
        : Number(attempt.time_limit_minutes),
      Number(attempt.elapsed_seconds),
    ) === 0;
  const percentage = (score.actualScore / score.maximumScore) * 100;
  const bankScores = new Map<number, { actual: number; maximum: number }>();
  for (const [index, question] of questions.entries()) {
    const bankId = Number(question.source_bank_id);
    const current = bankScores.get(bankId) ?? { actual: 0, maximum: 0 };
    current.actual += score.results[index].awardedScore;
    current.maximum += Number(question.question_score_snapshot);
    bankScores.set(bankId, current);
  }
  const weakTopicCount = [...bankScores.values()].filter(
    (part) => part.maximum > 0 && part.actual / part.maximum < 0.5,
  ).length;

  await connection.query(
    `UPDATE exam_attempts
     SET submitted_at = CASE WHEN ? = 1
          THEN COALESCE(submitted_at, DATE_ADD(started_at, INTERVAL ? MINUTE), NOW())
          ELSE NOW() END,
       actual_score = ?, max_score = ?, weak_topic_count = ?,
       status = 'submitted', updated_at = NOW()
     WHERE exam_attempt_id = ? AND status IN ('in_progress', 'expired')`,
    [
      timedOut ? 1 : 0,
      attempt.time_limit_minutes,
      score.actualScore,
      score.maximumScore,
      weakTopicCount,
      attemptId,
    ],
  );
  for (const [bankId, part] of bankScores) {
    const [bankRows] = await connection.query<RowDataPacket[]>(
      "SELECT bank_name FROM question_banks WHERE question_bank_id = ?",
      [bankId],
    );
    const partPercentage = (part.actual / part.maximum) * 100;
    await connection.query(
      `INSERT INTO exam_attempt_bank_results
        (exam_attempt_id, question_bank_id, bank_name_snapshot,
         actual_score, max_score, percentage, is_weak_topic)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        attemptId,
        bankId,
        String(bankRows[0]?.bank_name ?? attempt.bank_name),
        part.actual,
        part.maximum,
        Number(partPercentage.toFixed(2)),
        partPercentage < 50 ? 1 : 0,
      ],
    );
  }

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
  if (weakTopicCount > 0 && attempt.workflow_phase === "checkpoint") {
    const [windowRows] = await connection.query<RowDataPacket[]>(
      `SELECT CASE
         WHEN ? = 'midterm' THEN
           DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) < DATE_SUB(academic_term.midterm_start_date, INTERVAL 14 DAY)
         ELSE DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) < DATE_SUB(academic_term.final_start_date, INTERVAL 14 DAY)
       END AS allowed
       FROM enrollments enrollment
       INNER JOIN student_terms student_term ON student_term.student_term_id = enrollment.student_term_id
       INNER JOIN academic_terms academic_term ON academic_term.academic_term_id = student_term.academic_term_id
       WHERE enrollment.enrollment_id = ? LIMIT 1`,
      [attempt.exam_period, attempt.enrollment_id],
    );
    if (Number(windowRows[0]?.allowed ?? 0) === 1) {
      checkpointIntervalWeeks = checkpointWeeksFor(percentage);
      const appointment = nextCheckpointAppointment(checkpointIntervalWeeks);
      nextCheckpointAt = appointment.instant;
      await connection.query(
        `INSERT INTO exam_checkpoints
          (enrollment_id, source_exam_attempt_id, exam_period,
           weak_topic_count, interval_weeks, next_checkpoint_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [attempt.enrollment_id, attemptId, attempt.exam_period,
          weakTopicCount, checkpointIntervalWeeks, appointment.databaseValue],
      );
    }
  }

  return {
    historyId: attemptId,
    actualScore: score.actualScore,
    maximumScore: score.maximumScore,
    correctAnswers: score.correctAnswers,
    totalQuestions: questions.length,
    nextCheckpointAt,
    checkpointIntervalWeeks,
    weakTopicCount,
    workflowPhase: attempt.workflow_phase,
  };
};

export const getExamsForCurrentTerm = async (req: Request, res: Response) => {
  try {
    const userId = userIdFrom(req, res);
    if (!userId) return;
    await voidPendingCheckpointsForExamFlow(userId);
    const [rows] = await db.query<ExamRow[]>(
      `${ACCESSIBLE_EXAM_SQL}
       ${accessibleExamGroup}
       ORDER BY subject.subject_name, qb.bank_name`,
      [userId],
    );
    const exams = groupExamParts(rows);
    return res.json({
      message: "Exams retrieved successfully",
      user_id: userId,
      total: exams.length,
      data: exams,
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
      data: {
        ...exam,
        parts: exam.part_ids.map((partId, index) => ({
          exam_part_id: partId,
          part_order: index + 1,
          exam_part_name: exam.part_names[index],
          questions: [],
        })),
      },
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
         attempt.exam_period, result.bank_name_snapshot AS topic_name,
         attempt.actual_score, attempt.max_score AS exam_max_score,
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
    const history = new Map<number, Record<string, unknown>>();
    for (const row of rows) {
      const attemptId = Number(row.exam_score_history_id);
      const weakTopics = Number(row.is_weak_topic)
        ? [{ topic_name: row.topic_name, percentage: Number(row.percentage) }]
        : [];
      const previous = history.get(attemptId);
      if (previous) {
        (previous.weak_topics as typeof weakTopics).push(...weakTopics);
        previous.exam_repository_id = Math.min(
          Number(previous.exam_repository_id),
          Number(row.exam_repository_id),
        );
      } else {
        history.set(attemptId, {
          ...row,
          exam_name: examSetName(row.exam_period, row.subject_name),
          weak_topics: weakTopics,
        });
      }
    }
    const data = [...history.values()];
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
    await voidPendingCheckpointsForExamFlow(userId);
    const [weakTopics] = await db.query<RowDataPacket[]>(
      `SELECT enrollment.enrollment_id AS schedule_time_id,
         (SELECT MIN(part_result.question_bank_id)
          FROM exam_attempt_bank_results part_result
          WHERE part_result.exam_attempt_id = attempt.exam_attempt_id) AS exam_repository_id,
         result.question_bank_id AS exam_part_id,
         result.bank_name_snapshot AS topic_name,
         subject.subject_id, subject.subject_name, attempt.exam_period,
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
         COALESCE((SELECT MIN(result.question_bank_id)
                   FROM exam_attempt_bank_results result
                   WHERE result.exam_attempt_id = checkpoint.source_exam_attempt_id), 0)
           AS exam_repository_id,
         checkpoint.exam_period, subject.subject_id, subject.subject_name,
         DATE_FORMAT(checkpoint.next_checkpoint_at, '%Y-%m-%dT%H:%i:%s+07:00') AS next_checkpoint_at,
         checkpoint.interval_weeks,
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
           WHERE recommendation.student_term_id = student_term.student_term_id
             AND recommendation.status <> 'superseded'
           ORDER BY recommendation.week_start_date DESC, recommendation.version DESC
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
       INNER JOIN academic_terms academic_term
         ON academic_term.academic_term_id = student_term.academic_term_id
       INNER JOIN course_sections section
         ON section.section_id = enrollment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       WHERE student_term.user_id = ? AND student_term.status = 'active'
         AND checkpoint.status = 'pending'
         AND ${activeExamPeriodSql("checkpoint.exam_period")}
         AND NOT (
           (checkpoint.exam_period = 'midterm' AND (
             DATEDIFF(academic_term.midterm_start_date, CURDATE()) BETWEEN 1 AND 14
             OR CURDATE() BETWEEN academic_term.midterm_start_date AND academic_term.midterm_end_date
           ))
           OR (checkpoint.exam_period = 'final' AND (
             DATEDIFF(academic_term.final_start_date, CURDATE()) BETWEEN 1 AND 14
             OR CURDATE() BETWEEN academic_term.final_start_date AND academic_term.final_end_date
           ))
         )
       ORDER BY checkpoint.next_checkpoint_at`,
      [userId],
    );
    return res.json({
      message: "Exam insights retrieved successfully",
      weak_topics: weakTopics.map((topic) => ({
        ...topic,
        exam_name: examSetName(topic.exam_period, topic.subject_name),
      })),
      next_checkpoints: checkpoints.map((checkpoint) => ({
        ...checkpoint,
        exam_name: examSetName(checkpoint.exam_period, checkpoint.subject_name),
      })),
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
    const exam = await getAccessibleExam(userId, examId, connection);
    if (!exam) {
      await connection.rollback();
      return res.status(404).json({
        message: "Exam was not found or is not available yet",
      });
    }
    await connection.query(
      "SELECT question_bank_id FROM question_banks WHERE question_bank_id IN (?) FOR UPDATE",
      [exam.part_ids],
    );
    await connection.query(
      "SELECT enrollment_id FROM enrollments WHERE enrollment_id = ? FOR UPDATE",
      [exam.schedule_time_id],
    );

    const [activeRows] = await connection.query<AttemptRow[]>(
      `SELECT attempt.exam_attempt_id, attempt.enrollment_id,
         attempt.source_checkpoint_id, attempt.started_at,
         TIMESTAMPDIFF(SECOND, attempt.started_at, NOW()) AS elapsed_seconds,
         attempt.status, ${questionBankTimeLimitSql("bank")} AS time_limit_minutes, attempt.exam_period,
         bank.bank_name
       FROM exam_attempts attempt
       INNER JOIN question_banks bank ON bank.question_bank_id = ?
       WHERE attempt.enrollment_id = ? AND attempt.exam_period = ?
         AND attempt.status IN ('in_progress', 'expired')
         AND EXISTS (
           SELECT 1 FROM exam_attempt_questions attempt_question
           WHERE attempt_question.exam_attempt_id = attempt.exam_attempt_id
             AND attempt_question.source_bank_id IN (?)
         )
         AND NOT EXISTS (
           SELECT 1 FROM exam_attempt_bank_results result
           WHERE result.exam_attempt_id = attempt.exam_attempt_id
         )
       ORDER BY attempt.exam_attempt_id DESC
       LIMIT 1 FOR UPDATE`,
      [examId, exam.schedule_time_id, exam.exam_period, exam.part_ids],
    );
    const activeAttempt = activeRows[0];
    if (activeAttempt) {
      const remainingSeconds = remainingSecondsFor(
        activeAttempt.time_limit_minutes === null
          ? null
          : Number(activeAttempt.time_limit_minutes),
        Number(activeAttempt.elapsed_seconds),
      );
      if (activeAttempt.status === "expired" || remainingSeconds === 0) {
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
      exam.part_ids,
      randomSeed,
      connection,
    );
    if (!questions.length) {
      await connection.rollback();
      return res.status(409).json({
        message:
          "ไม่สามารถสุ่มคำถามให้ครบทุกพาร์ทและรวมได้ 100 คะแนนพอดี กรุณาแจ้งอาจารย์ผู้สอน",
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
        (enrollment_id, source_checkpoint_id, exam_period, workflow_phase, random_seed,
         started_at, status, weak_topic_count)
       VALUES (?, ?, ?, ?, ?, NOW(), 'in_progress', 0)`,
      [
        exam.schedule_time_id,
        exam.workflow_phase === "checkpoint" ? exam.due_checkpoint_id : null,
        exam.exam_period,
        exam.workflow_phase,
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
          question.question_bank_id,
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
        remaining_seconds: remainingSecondsFor(exam.time_limit, 0),
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
        attempt.time_limit_minutes === null
          ? null
          : Number(attempt.time_limit_minutes),
        Number(attempt.elapsed_seconds),
      ) === 0
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
       WHERE exam_attempt_id = ? AND source_question_id = ?
       LIMIT 1 FOR UPDATE`,
      [attemptId, questionId],
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
      `SELECT cs.subject_id, ea.exam_period FROM exam_attempts ea
       INNER JOIN enrollments e ON e.enrollment_id=ea.enrollment_id
       INNER JOIN course_sections cs ON cs.section_id=e.section_id
       WHERE ea.exam_attempt_id=? LIMIT 1`,
      [result.historyId],
    );
    const subjectId = subjectRows[0]?.subject_id;
    await connection.commit();
    const phase = result.workflowPhase;
    const recommendationResult = await recommendationAfterAssessmentBatch(
      userId, phase, result.historyId,
    );
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
       INNER JOIN question_banks requested_bank
         ON requested_bank.question_bank_id = ?
       INNER JOIN question_banks source_bank
         ON source_bank.question_bank_id = attempt_question.source_bank_id
        AND source_bank.subject_id = requested_bank.subject_id
        AND source_bank.exam_period = requested_bank.exam_period
       WHERE attempt.exam_attempt_id = ?
         AND student_term.user_id = ?
         AND attempt.exam_period = requested_bank.exam_period`,
      [examId, attemptId, userId],
    );
    let storedImagePath: string | null = null;
    for (const row of rows) {
      if (
        row.image_path_snapshot &&
        path.basename(row.image_path_snapshot) === filename
      ) {
        storedImagePath = row.image_path_snapshot;
        break;
      }
      const matchingChoice = parseSnapshotChoices(row.choices_snapshot).find(
        (choice) => choice.choice_image_path &&
          path.basename(choice.choice_image_path) === filename,
      );
      if (matchingChoice?.choice_image_path) {
        storedImagePath = matchingChoice.choice_image_path;
        break;
      }
    }
    if (!storedImagePath) return res.status(404).json({ message: "Image not found" });
    const directory = storedImagePath.startsWith("choices/") ? "choices" : "questions";
    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(
      path.resolve(__dirname, "../../uploads", directory, filename),
    );
  } catch (error) {
    console.error("getExamAttemptImage error:", error);
    return res.status(500).json({ message: "Unable to load exam image" });
  }
};

export const submitExpiredExamAttempts = async () => {
  if (!EXAM_TIME_LIMITS_ENABLED) return 0;

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
