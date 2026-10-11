import type { RowDataPacket } from "mysql2/promise";
import db from "../../config/db";

export type ExamWorkflowPhase =
  | "checkpoint"
  | "midterm_3w"
  | "midterm_2w"
  | "midterm_1w"
  | "midterm_exam"
  | "midterm_post"
  | "final_3w"
  | "final_2w"
  | "final_1w"
  | "final_exam"
  | "final_post";

export type ExamAttemptWorkflowPhase = Extract<
  ExamWorkflowPhase,
  "checkpoint" | "midterm_2w" | "midterm_1w" | "final_2w" | "final_1w"
>;

export interface ExamTermDates {
  midterm_start_date: string | Date | null;
  midterm_end_date: string | Date | null;
  final_start_date: string | Date | null;
  final_end_date: string | Date | null;
}

const asDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dayDistance = (from: Date, to: Date) =>
  Math.floor((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
    Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86_400_000);

export const getExamWorkflowPhase = (
  dates: ExamTermDates,
  examPeriod: "midterm" | "final",
  today = new Date(),
): ExamWorkflowPhase => {
  const start = asDate(examPeriod === "midterm" ? dates.midterm_start_date : dates.final_start_date);
  const end = asDate(examPeriod === "midterm" ? dates.midterm_end_date : dates.final_end_date);
  if (!start || !end) return "checkpoint";
  const current = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const first = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  const last = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));
  const days = dayDistance(current, first);
  const key = examPeriod === "midterm" ? "midterm" : "final";
  if (current > last) return `${key}_post` as ExamWorkflowPhase;
  if (current >= first) return `${key}_exam` as ExamWorkflowPhase;
  if (days >= 1 && days <= 7) return `${key}_1w` as ExamWorkflowPhase;
  if (days <= 14) return `${key}_2w` as ExamWorkflowPhase;
  if (days <= 21) return `${key}_3w` as ExamWorkflowPhase;
  return "checkpoint";
};

export const isWorkloadLockedForUser = async (userId: number) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT CASE
       WHEN academic_term.final_start_date IS NULL THEN 0
       WHEN DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) >=
         DATE_SUB(academic_term.final_start_date, INTERVAL 7 DAY) THEN 1
       ELSE 0
     END AS locked
     FROM student_terms student_term
     INNER JOIN academic_terms academic_term
       ON academic_term.academic_term_id = student_term.academic_term_id
     WHERE student_term.user_id = ? AND student_term.status = 'active'
     ORDER BY student_term.student_term_id DESC LIMIT 1`,
    [userId],
  );
  return Number(rows[0]?.locked ?? 0) === 1;
};

// The 3-week notice still permits ordinary checkpoints. Once the dedicated
// 2-week assessment flow starts, an unfinished appointment must not resurface.
export const voidPendingCheckpointsForExamFlow = async (userId: number) => {
  await db.query(
    `UPDATE exam_checkpoints checkpoint
     INNER JOIN enrollments enrollment ON enrollment.enrollment_id = checkpoint.enrollment_id
     INNER JOIN student_terms student_term ON student_term.student_term_id = enrollment.student_term_id
     INNER JOIN academic_terms academic_term ON academic_term.academic_term_id = student_term.academic_term_id
     SET checkpoint.status = 'cancelled', checkpoint.updated_at = NOW()
     WHERE student_term.user_id = ? AND student_term.status = 'active'
       AND checkpoint.status = 'pending'
       AND (
         (checkpoint.exam_period = 'midterm'
           AND academic_term.midterm_start_date IS NOT NULL
           AND DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) >= DATE_SUB(academic_term.midterm_start_date, INTERVAL 14 DAY))
         OR (checkpoint.exam_period = 'final'
           AND academic_term.final_start_date IS NOT NULL
           AND DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) >= DATE_SUB(academic_term.final_start_date, INTERVAL 14 DAY))
       )`,
    [userId],
  );
};
