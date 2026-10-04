import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";
import {
  addDays,
  adherenceRate,
  completionRate,
  daysBetween,
  durationMinutes,
  examReviewFloorMinutes,
  isoDay,
  resolveTargetWeek,
  scoreGapMinutes,
  weakTopicMinutes,
  workloadUrgency,
} from "./recommendation.rules";
import { buildSchedulePlan } from "./recommendation.scheduler";
import type {
  BaseBlockRow,
  BusyRow,
  ClassBlockRow,
  ConstraintRow,
  GenerateRecommendationInput,
  RecommendationItemDraft,
  RecommendationScheduleType,
  RecommendationTrigger,
  RuleReason,
  WorkloadDemand,
} from "./recommendation.types";
import { RULE_VERSION } from "./recommendation.types";

interface TermRow extends RowDataPacket {
  term_id: number;
  user_id: number;
  midterm_start_date: string | null;
  midterm_end_date: string | null;
  final_start_date: string | null;
  final_end_date: string | null;
}
interface ScheduleTypeRow extends RowDataPacket {
  schedule_type_id: number;
  type_code: RecommendationScheduleType;
}
interface EnrollmentRow extends RowDataPacket {
  enrollment_id: number;
  subject_id: string;
  subject_name: string;
  target_percentage: number | string | null;
  latest_score_percentage: number | string | null;
  weak_topic_count: number | string;
}
interface WorkloadRow extends RowDataPacket {
  workload_id: number;
  enrollment_id: number;
  subject_id: string;
  type_code: "assignment" | "project";
  deadline_date: string;
  deadline_time: string;
}
interface HeaderRow extends RowDataPacket {
  recommendation_id: number;
  user_id: number;
  term_id: number;
  previous_recommendation_id: number | null;
  exam_attempt_id: number | null;
  workload_id: number | null;
  week_start: string;
  week_end: string;
  version: number;
  trigger_type: RecommendationTrigger;
  rule_version: string;
  status: string;
  generated_at: Date;
  accepted_at: Date | null;
  rejected_at: Date | null;
  superseded_at: Date | null;
  updated_at: Date;
}
interface BehaviorRow {
  plannedMinutes: number;
  actualMinutes: number;
  adherentMinutes: number;
  adherenceRate: number | null;
  completionRate: number | null;
  preferredDays: number[];
  preferredStartMinute: number | null;
  preferredSessionMinutes: number | null;
}
interface StudySessionRow extends RowDataPacket {
  enrollment_id: number;
  started_date: string;
  started_time: string;
  ended_date: string | null;
  ended_time: string | null;
  actual_minutes: number | string;
}

const emptyBehavior = (): BehaviorRow => ({
  plannedMinutes: 0,
  actualMinutes: 0,
  adherentMinutes: 0,
  adherenceRate: null,
  completionRate: null,
  preferredDays: [],
  preferredStartMinute: null,
  preferredSessionMinutes: null,
});

export class RecommendationServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

const currentTerm = async (connection: PoolConnection, userId: number, lock = false) => {
  const [rows] = await connection.query<TermRow[]>(
    `SELECT st.student_term_id AS term_id,st.user_id,
       DATE_FORMAT(at.midterm_start_date,'%Y-%m-%d') AS midterm_start_date,
       DATE_FORMAT(at.midterm_end_date,'%Y-%m-%d') AS midterm_end_date,
       DATE_FORMAT(at.final_start_date,'%Y-%m-%d') AS final_start_date,
       DATE_FORMAT(at.final_end_date,'%Y-%m-%d') AS final_end_date
     FROM student_terms st
     INNER JOIN academic_terms at ON at.academic_term_id=st.academic_term_id
     WHERE st.user_id=? AND st.status='active'
     ORDER BY st.student_term_id DESC LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [userId]
  );
  return rows[0] ?? null;
};

const loadScheduleTypes = async (connection: PoolConnection) => {
  const [rows] = await connection.query<ScheduleTypeRow[]>(
    `SELECT schedule_type_id,LOWER(type_code) AS type_code FROM schedule_types
     WHERE is_active=1 AND LOWER(type_code) IN ('review','homework')`
  );
  const byCode = new Map<RecommendationScheduleType, number>();
  for (const row of rows) byCode.set(row.type_code, Number(row.schedule_type_id));
  const missing = (["review", "homework"] as RecommendationScheduleType[]).filter(
    (code) => !byCode.has(code)
  );
  if (missing.length) {
    throw new RecommendationServiceError(
      409,
      "SCHEDULE_TYPES_NOT_CONFIGURED",
      `Active schedule types are missing: ${missing.join(", ")}`,
      { missing_type_codes: missing }
    );
  }
  return { review: byCode.get("review")!, homework: byCode.get("homework")! };
};

const ownedHeader = async (
  connection: PoolConnection,
  userId: number,
  recommendationId: number,
  lock = false
) => {
  const [rows] = await connection.query<HeaderRow[]>(
    `SELECT wr.recommendation_id,st.user_id,wr.student_term_id AS term_id,
       wr.previous_recommendation_id,wr.source_exam_attempt_id AS exam_attempt_id,
       wr.source_workload_id AS workload_id,
       DATE_FORMAT(wr.week_start_date,'%Y-%m-%d') AS week_start,
       DATE_FORMAT(wr.week_end_date,'%Y-%m-%d') AS week_end,
       wr.version,wr.trigger_type,wr.rule_version,wr.status,wr.generated_at,
       wr.accepted_at,wr.rejected_at,wr.superseded_at,wr.updated_at
     FROM weekly_recommendation wr
     INNER JOIN student_terms st ON st.student_term_id=wr.student_term_id
     WHERE wr.recommendation_id=? AND st.user_id=? LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [recommendationId, userId]
  );
  if (!rows[0]) {
    throw new RecommendationServiceError(404, "RECOMMENDATION_NOT_FOUND", "Recommendation was not found");
  }
  return rows[0];
};

const loadEnrollments = async (connection: PoolConnection, termId: number) => {
  const [rows] = await connection.query<EnrollmentRow[]>(
    `SELECT e.enrollment_id,s.subject_id,s.subject_name,
       (SELECT gb.minimum_percentage
        FROM grading_schemes gs
        INNER JOIN grade_boundaries gb ON gb.grading_scheme_id=gs.grading_scheme_id
        WHERE gs.status='published' AND gb.grade_code=e.target_grade_code
          AND ((gs.scheme_type='section' AND gs.section_id=e.section_id)
            OR (gs.scheme_type='subject_default' AND gs.subject_id=s.subject_id))
        ORDER BY (gs.section_id IS NOT NULL) DESC,gs.version DESC LIMIT 1
       ) AS target_percentage,
       (SELECT (ea.actual_score/NULLIF(ea.max_score,0))*100
        FROM exam_attempts ea
        WHERE ea.enrollment_id=e.enrollment_id AND ea.status='submitted'
        ORDER BY ea.submitted_at DESC,ea.exam_attempt_id DESC LIMIT 1
       ) AS latest_score_percentage,
       COALESCE((SELECT ea.weak_topic_count FROM exam_attempts ea
        WHERE ea.enrollment_id=e.enrollment_id AND ea.status='submitted'
        ORDER BY ea.submitted_at DESC,ea.exam_attempt_id DESC LIMIT 1),0
       ) AS weak_topic_count
     FROM enrollments e
     INNER JOIN course_sections cs ON cs.section_id=e.section_id
     INNER JOIN subjects s ON s.subject_id=cs.subject_id
     WHERE e.student_term_id=? AND e.status='enrolled'
     ORDER BY s.subject_id,e.enrollment_id`,
    [termId]
  );
  return rows;
};

const loadWorkloads = async (
  connection: PoolConnection,
  termId: number,
  targetWeekEnd: string
) => {
  const [rows] = await connection.query<WorkloadRow[]>(
    `SELECT w.workload_id,w.enrollment_id,cs.subject_id,
       LOWER(wt.type_code) AS type_code,
       DATE_FORMAT(w.deadline_date,'%Y-%m-%d') AS deadline_date,
       TIME_FORMAT(COALESCE(w.deadline_time,'23:59:59'),'%H:%i:%s') AS deadline_time
     FROM workloads w
     INNER JOIN workload_types wt ON wt.workload_type_id=w.workload_type_id
     INNER JOIN enrollments e ON e.enrollment_id=w.enrollment_id
     INNER JOIN course_sections cs ON cs.section_id=e.section_id
     WHERE e.student_term_id=? AND e.status='enrolled' AND w.status='pending'
       AND wt.is_active=1 AND LOWER(wt.type_code) IN ('assignment','project')
       AND w.deadline_date<=?
     ORDER BY w.deadline_date,w.deadline_time,w.workload_id`,
    [termId, targetWeekEnd]
  );
  return rows;
};

const loadConstraints = async (connection: PoolConnection, userId: number) => {
  const [rows] = await connection.query<ConstraintRow[]>(
    `SELECT constraint_id,
       FIELD(day_off,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS day_off,
       continuous_working_minutes AS continuous_working_duration,break_minutes,
       TIME_FORMAT(available_start_time,'%H:%i:%s') AS start_time,
       TIME_FORMAT(available_end_time,'%H:%i:%s') AS end_time
     FROM user_constraints WHERE user_id=? LIMIT 1`,
    [userId]
  );
  const constraint = rows[0] ?? null;
  if (!constraint) return { constraint, busy: [] as BusyRow[] };
  const [busy] = await connection.query<BusyRow[]>(
    `SELECT FIELD(day_of_week,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS recurring_busy_day,
       TIME_FORMAT(start_time,'%H:%i:%s') AS start_time,
       TIME_FORMAT(end_time,'%H:%i:%s') AS end_time
     FROM recurring_busy WHERE constraint_id=?`,
    [constraint.constraint_id]
  );
  return { constraint, busy };
};

const loadClasses = async (connection: PoolConnection, termId: number) => {
  const [rows] = await connection.query<ClassBlockRow[]>(
    `SELECT FIELD(cm.day_of_week,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS schedule_day,
       TIME_FORMAT(cm.start_time,'%H:%i:%s') AS start_time,
       TIME_FORMAT(cm.end_time,'%H:%i:%s') AS end_time
     FROM class_meetings cm
     INNER JOIN enrollments e ON e.section_id=cm.section_id
     WHERE e.student_term_id=? AND e.status='enrolled'`,
    [termId]
  );
  return rows;
};

const acceptedForWeek = async (connection: PoolConnection, termId: number, weekStart: string) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT recommendation_id FROM weekly_recommendation
     WHERE student_term_id=? AND week_start_date=? AND status='accepted'
     ORDER BY version DESC LIMIT 1`,
    [termId, weekStart]
  );
  return rows[0] ? Number(rows[0].recommendation_id) : null;
};

const hasWeekendRecommendation = async (
  connection: PoolConnection,
  termId: number,
  weekStart: string
) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT recommendation_id FROM weekly_recommendation
     WHERE student_term_id=? AND week_start_date=? AND trigger_type='weekend'
       AND status IN ('pending','accepted')
     ORDER BY version DESC LIMIT 1`,
    [termId, weekStart]
  );
  return Boolean(rows[0]);
};

const acceptedBaseRecommendation = async (
  connection: PoolConnection,
  termId: number,
  weekStart: string
) => {
  const exact = await acceptedForWeek(connection, termId, weekStart);
  if (exact) return { recommendationId: exact, sourceWeekStart: weekStart };
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT recommendation_id,DATE_FORMAT(week_start_date,'%Y-%m-%d') AS week_start
     FROM weekly_recommendation
     WHERE student_term_id=? AND week_start_date<? AND status='accepted'
     ORDER BY week_start_date DESC,version DESC LIMIT 1`,
    [termId, weekStart]
  );
  return rows[0]
    ? { recommendationId: Number(rows[0].recommendation_id), sourceWeekStart: String(rows[0].week_start) }
    : null;
};

const baseBlocks = async (
  connection: PoolConnection,
  source: { recommendationId: number; sourceWeekStart: string } | null,
  targetWeekStart: string
) => {
  if (!source) return [] as BaseBlockRow[];
  const shiftDays = daysBetween(source.sourceWeekStart, targetWeekStart);
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT wb.weekly_block_id,wb.enrollment_id AS schedule_time_id,cs.subject_id,
       wb.schedule_type_id,
       DATE_FORMAT(DATE_ADD(wb.scheduled_date,INTERVAL ? DAY),'%Y-%m-%d') AS scheduled_date,
       TIME_FORMAT(wb.start_time,'%H:%i:%s') AS start_time,
       TIME_FORMAT(wb.end_time,'%H:%i:%s') AS end_time,wb.source,wb.is_user_modified
     FROM weekly_schedule_block wb
     INNER JOIN enrollments e ON e.enrollment_id=wb.enrollment_id
     INNER JOIN course_sections cs ON cs.section_id=e.section_id
     WHERE wb.recommendation_id=? ORDER BY wb.scheduled_date,wb.start_time`,
    [shiftDays, source.recommendationId]
  );
  return rows.map((row) => ({
    ...row,
    weekly_block_id: Number(row.weekly_block_id),
    schedule_time_id: Number(row.schedule_time_id),
    subject_id: String(row.subject_id),
    schedule_type_id: Number(row.schedule_type_id),
    source: "copied_previous",
  })) as BaseBlockRow[];
};

const dateTimeValue = (date: string, time: string) =>
  new Date(`${date}T${time}+07:00`).getTime();

const loadWeekendBehavior = async (
  connection: PoolConnection,
  termId: number,
  targetWeekStart: string,
  reviewTypeId: number
) => {
  const previousWeekStart = addDays(targetWeekStart, -7);
  const acceptedId = await acceptedForWeek(connection, termId, previousWeekStart);
  let planRows: RowDataPacket[] = [];
  if (acceptedId) {
    [planRows] = await connection.query<RowDataPacket[]>(
      `SELECT wb.enrollment_id,DATE_FORMAT(wb.scheduled_date,'%Y-%m-%d') AS scheduled_date,
         TIME_FORMAT(wb.start_time,'%H:%i:%s') AS start_time,
         TIME_FORMAT(wb.end_time,'%H:%i:%s') AS end_time
       FROM weekly_schedule_block wb
       WHERE wb.recommendation_id=? AND wb.schedule_type_id=?`,
      [acceptedId, reviewTypeId]
    );
  }
  const [sessions] = await connection.query<StudySessionRow[]>(
    `SELECT ss.enrollment_id,DATE_FORMAT(ss.started_at,'%Y-%m-%d') AS started_date,
       TIME_FORMAT(ss.started_at,'%H:%i:%s') AS started_time,
       DATE_FORMAT(ss.ended_at,'%Y-%m-%d') AS ended_date,
       TIME_FORMAT(ss.ended_at,'%H:%i:%s') AS ended_time,
       FLOOR(ss.accumulated_seconds/60) AS actual_minutes
     FROM study_sessions ss
     INNER JOIN enrollments e ON e.enrollment_id=ss.enrollment_id
     WHERE e.student_term_id=? AND ss.status IN ('completed','interrupted')
       AND ss.started_at>=CONCAT(?,' 00:00:00')
       AND ss.started_at<CONCAT(?,' 00:00:00') AND ss.accumulated_seconds>0
     ORDER BY ss.started_at`,
    [termId, previousWeekStart, targetWeekStart]
  );

  const blocks = new Map<number, Array<{ date: string; start: string; end: string }>>();
  for (const row of planRows) {
    const id = Number(row.enrollment_id);
    const list = blocks.get(id) ?? [];
    list.push({ date: String(row.scheduled_date), start: String(row.start_time), end: String(row.end_time) });
    blocks.set(id, list);
  }
  const result = new Map<number, BehaviorRow>();
  const dayMinutes = new Map<number, Map<number, number>>();
  const starts = new Map<number, Array<{ minute: number; weight: number }>>();
  for (const session of sessions) {
    const id = Number(session.enrollment_id);
    const behavior = result.get(id) ?? emptyBehavior();
    const actual = Math.max(0, Number(session.actual_minutes));
    behavior.actualMinutes += actual;
    const days = dayMinutes.get(id) ?? new Map<number, number>();
    const day = isoDay(session.started_date);
    days.set(day, (days.get(day) ?? 0) + actual);
    dayMinutes.set(id, days);
    const [hour, minute] = session.started_time.split(":").map(Number);
    const samples = starts.get(id) ?? [];
    samples.push({ minute: hour * 60 + minute, weight: actual });
    starts.set(id, samples);
    if (session.ended_date && session.ended_time) {
      const sessionStart = dateTimeValue(session.started_date, session.started_time);
      const sessionEnd = dateTimeValue(session.ended_date, session.ended_time);
      let overlap = 0;
      for (const block of blocks.get(id) ?? []) {
        overlap += Math.max(
          0,
          Math.min(sessionEnd, dateTimeValue(block.date, block.end)) -
            Math.max(sessionStart, dateTimeValue(block.date, block.start))
        ) / 60_000;
      }
      behavior.adherentMinutes += Math.min(actual, Math.floor(overlap));
    }
    result.set(id, behavior);
  }
  for (const id of new Set([...blocks.keys(), ...result.keys()])) {
    const behavior = result.get(id) ?? emptyBehavior();
    behavior.plannedMinutes = (blocks.get(id) ?? []).reduce(
      (sum, block) => sum + durationMinutes(block.start, block.end),
      0
    );
    behavior.adherentMinutes = Math.min(behavior.actualMinutes, behavior.adherentMinutes);
    behavior.adherenceRate = adherenceRate(behavior.plannedMinutes, behavior.adherentMinutes);
    behavior.completionRate = completionRate(
      behavior.plannedMinutes,
      behavior.actualMinutes
    );
    behavior.preferredDays = [...(dayMinutes.get(id) ?? new Map<number, number>())]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 2)
      .map(([day]) => day);
    const samples = starts.get(id) ?? [];
    const weight = samples.reduce((sum, sample) => sum + sample.weight, 0);
    if (weight > 0) {
      const average = samples.reduce((sum, sample) => sum + sample.minute * sample.weight, 0) / weight;
      behavior.preferredStartMinute = Math.round(average / 30) * 30;
      const sessionDurations = samples
        .map((sample) => sample.weight)
        .filter((minutes) => minutes > 0)
        .sort((left, right) => left - right);
      const middle = Math.floor(sessionDurations.length / 2);
      const median =
        sessionDurations.length % 2 === 0
          ? (sessionDurations[middle - 1] + sessionDurations[middle]) / 2
          : sessionDurations[middle];
      behavior.preferredSessionMinutes = Math.max(
        30,
        Math.round(median / 30) * 30
      );
    }
    result.set(id, behavior);
  }
  return result;
};

const examContext = (term: TermRow, weekStart: string, weekEnd: string) => {
  const ranges = [
    { start: term.midterm_start_date, end: term.midterm_end_date },
    { start: term.final_start_date, end: term.final_end_date },
  ].filter(
    (range): range is { start: string; end: string } =>
      Boolean(range.start && range.end)
  );
  const nearby = ranges
    .filter(
      (range) =>
        (range.start <= weekEnd && range.end >= weekStart) ||
        (range.start > weekEnd && daysBetween(weekEnd, range.start) <= 7)
    )
    .sort((left, right) => left.start.localeCompare(right.start))[0];
  if (!nearby) return { isNearExam: false, placementDeadline: null };
  const placementDeadline =
    nearby.start > weekStart && nearby.start <= weekEnd
      ? `${nearby.start}T00:00:00`
      : null;
  return { isNearExam: true, placementDeadline };
};

const makeItems = (
  enrollments: EnrollmentRow[],
  workloads: WorkloadRow[],
  base: BaseBlockRow[],
  behaviorByEnrollment: Map<number, BehaviorRow>,
  types: { review: number; homework: number },
  targetWeekStart: string,
  exam: { isNearExam: boolean; placementDeadline: string | null }
) => {
  const items: RecommendationItemDraft[] = [];
  for (const row of enrollments) {
    const enrollmentId = Number(row.enrollment_id);
    const currentMinutes = (typeId: number) =>
      base
        .filter(
          (block) =>
            block.subject_id === row.subject_id &&
            Number(block.schedule_type_id) === typeId
        )
        .reduce(
          (sum, block) => sum + durationMinutes(block.start_time, block.end_time),
          0
        );

    const currentReview = currentMinutes(types.review);
    const target = row.target_percentage === null ? null : Number(row.target_percentage);
    const actual = row.latest_score_percentage === null ? null : Number(row.latest_score_percentage);
    const gap = target === null || actual === null ? 0 : Math.max(0, target - actual);
    const scoreMinutes = scoreGapMinutes(gap);
    const weakMinutes = weakTopicMinutes(Number(row.weak_topic_count));
    const behavior = behaviorByEnrollment.get(enrollmentId) ?? emptyBehavior();
    const calculatedReview = scoreMinutes + weakMinutes;
    const examMinutes = examReviewFloorMinutes(calculatedReview, exam.isNearExam);
    const rawReview = calculatedReview + examMinutes;
    const reviewReasons: RuleReason[] = [];
    if (scoreMinutes) {
      reviewReasons.push({
        code: "score_gap",
        minutes: scoreMinutes,
        message: "Extra review time from the latest score gap",
        metadata: { target_percentage: target, latest_percentage: actual },
      });
    }
    if (weakMinutes) {
      reviewReasons.push({
        code: "weak_topics",
        minutes: weakMinutes,
        message: "Extra review time for weak topics",
        metadata: { weak_topic_count: Number(row.weak_topic_count) },
      });
    }
    if (behavior.plannedMinutes > 0 || behavior.actualMinutes > 0) {
      reviewReasons.push({
        code: "previous_week_behavior_placement",
        minutes: 0,
        message: "Previous-week behavior is used for block placement only",
        metadata: {
          planned_minutes: behavior.plannedMinutes,
          actual_minutes: behavior.actualMinutes,
          adherent_minutes: behavior.adherentMinutes,
          adherence_rate: behavior.adherenceRate,
          completion_rate: behavior.completionRate,
          preferred_days: behavior.preferredDays,
          preferred_start_minute: behavior.preferredStartMinute,
          preferred_session_minutes: behavior.preferredSessionMinutes,
        },
      });
    }
    if (examMinutes) {
      reviewReasons.push({
        code: "exam_minimum",
        minutes: examMinutes,
        message: "Minimum review time before the midterm or final examination period",
      });
    }
    const reviewItem: RecommendationItemDraft = {
      key: `${row.subject_id}:${types.review}`,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      scheduleTypeId: types.review,
      scheduleTypeCode: "review",
      currentMinutes: currentReview,
      baseMinutes: 0,
      scoreGapMinutes: scoreMinutes,
      weakTopicMinutes: weakMinutes,
      examProximityMinutes: examMinutes,
      quizFloorMinutes: 0,
      workloadMinutes: 0,
      deadlineMinutes: 0,
      behaviorAdjustmentMinutes: 0,
      previousActualMinutes: behavior.actualMinutes,
      previousAdherentMinutes: behavior.adherentMinutes,
      previousAdherenceRate: behavior.adherenceRate,
      behaviorCompletionRate: behavior.completionRate,
      behaviorPreferredDays: behavior.preferredDays,
      behaviorPreferredStartMinute: behavior.preferredStartMinute,
      behaviorPreferredSessionMinutes: behavior.preferredSessionMinutes,
      rawTargetMinutes: rawReview,
      maxTargetMinutes: 300,
      targetMinutes: Math.min(300, rawReview),
      allocatedMinutes: 0,
      unallocatedMinutes: Math.min(300, rawReview),
      differenceMinutes: -currentReview,
      capApplied: rawReview > 300,
      capacityLimited: false,
      primaryAction: rawReview === 0 ? (currentReview ? "remove" : "keep") : currentReview ? "keep" : "create",
      reasons: reviewReasons,
      workloadDemands: [],
      placementDeadline: exam.placementDeadline,
      placementPriority: exam.placementDeadline ? 3 : 9,
    };
    if (reviewItem.targetMinutes > 0 || currentReview > 0) {
      items.push(reviewItem);
    }

    const demands: WorkloadDemand[] = workloads
      .filter((workload) => Number(workload.enrollment_id) === enrollmentId)
      .map((workload) => {
        const urgency = workloadUrgency(targetWeekStart, workload.deadline_date);
        const standard = workload.type_code === "project" ? 120 : 60;
        return {
          workloadId: Number(workload.workload_id),
          workloadType: workload.type_code,
          minutes: standard + urgency.minutes,
          deadlineDate: workload.deadline_date,
          deadlineTime: workload.deadline_time,
          priority: urgency.priority,
          urgency: urgency.urgency,
        };
      });
    const workloadMinutes = demands.reduce(
      (sum, demand) => sum + (demand.workloadType === "project" ? 120 : 60),
      0
    );
    const deadlineMinutes = demands.reduce(
      (sum, demand) =>
        sum + demand.minutes - (demand.workloadType === "project" ? 120 : 60),
      0
    );
    const rawHomework = workloadMinutes + deadlineMinutes;
    const homeworkTarget = Math.min(360, rawHomework);
    const currentHomework = currentMinutes(types.homework);
    if (homeworkTarget > 0 || currentHomework > 0) {
      const reasons: RuleReason[] = [];
      if (workloadMinutes) {
        reasons.push({
          code: "pending_workload",
          minutes: workloadMinutes,
          message: "Standard time for assignments and projects due in this week",
          metadata: { workload_count: demands.length },
        });
      }
      if (deadlineMinutes) {
        reasons.push({
          code: "deadline",
          minutes: deadlineMinutes,
          message: "Extra time for approaching deadlines",
        });
      }
      if (!homeworkTarget) {
        reasons.push({
          code: "no_due_workload",
          minutes: 0,
          message: "No pending assignment or project is due in the target week",
        });
      }
      const firstDeadline = demands
        .map((demand) => `${demand.deadlineDate}T${demand.deadlineTime}`)
        .sort()[0] ?? null;
      items.push({
        key: `${row.subject_id}:${types.homework}`,
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        scheduleTypeId: types.homework,
        scheduleTypeCode: "homework",
        currentMinutes: currentHomework,
        baseMinutes: 0,
        scoreGapMinutes: 0,
        weakTopicMinutes: 0,
        examProximityMinutes: 0,
        quizFloorMinutes: 0,
        workloadMinutes,
        deadlineMinutes,
        behaviorAdjustmentMinutes: 0,
        previousActualMinutes: 0,
        previousAdherentMinutes: 0,
        previousAdherenceRate: null,
        behaviorCompletionRate: null,
        behaviorPreferredDays: [],
        behaviorPreferredStartMinute: null,
        behaviorPreferredSessionMinutes: null,
        rawTargetMinutes: rawHomework,
        maxTargetMinutes: 360,
        targetMinutes: homeworkTarget,
        allocatedMinutes: 0,
        unallocatedMinutes: homeworkTarget,
        differenceMinutes: -currentHomework,
        capApplied: rawHomework > 360,
        capacityLimited: false,
        primaryAction: !homeworkTarget ? "remove" : currentHomework ? "keep" : "create",
        reasons,
        workloadDemands: demands,
        placementDeadline: firstDeadline,
        placementPriority: demands[0]?.priority ?? 9,
      });
    }
  }
  return items;
};

const validateSourceReferences = async (
  connection: PoolConnection,
  termId: number,
  input: GenerateRecommendationInput
) => {
  if (input.examAttemptId) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT ea.exam_attempt_id FROM exam_attempts ea
       INNER JOIN enrollments e ON e.enrollment_id=ea.enrollment_id
       WHERE ea.exam_attempt_id=? AND e.student_term_id=? LIMIT 1`,
      [input.examAttemptId, termId]
    );
    if (!rows[0]) {
      throw new RecommendationServiceError(
        404,
        "EXAM_ATTEMPT_NOT_FOUND",
        "Exam attempt was not found in the current term"
      );
    }
  }
  if (input.workloadId) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT w.workload_id FROM workloads w
       INNER JOIN enrollments e ON e.enrollment_id=w.enrollment_id
       WHERE w.workload_id=? AND e.student_term_id=? LIMIT 1`,
      [input.workloadId, termId]
    );
    if (!rows[0]) {
      throw new RecommendationServiceError(
        404,
        "WORKLOAD_NOT_FOUND",
        "Workload was not found in the current term"
      );
    }
  }
};

const insertPlan = async (
  connection: PoolConnection,
  recommendationId: number,
  enrollments: EnrollmentRow[],
  items: RecommendationItemDraft[],
  blocks: ReturnType<typeof buildSchedulePlan>["blocks"]
) => {
  const enrollmentBySubject = new Map(
    enrollments.map((row) => [row.subject_id, Number(row.enrollment_id)])
  );
  for (const item of items) {
    const changes = (item as RecommendationItemDraft & { changes?: unknown[] }).changes ?? [];
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO weekly_recommendation_item(
         recommendation_id,enrollment_id,schedule_type_id,current_minutes,base_minutes,
         score_gap_minutes,weak_topic_minutes,exam_proximity_minutes,quiz_floor_minutes,
         workload_minutes,deadline_minutes,behavior_adjustment_minutes,
         previous_actual_minutes,previous_adherent_minutes,previous_adherence_rate,
         raw_minutes,max_minutes,target_minutes,allocated_minutes,unallocated_minutes,
         difference_minutes,primary_action,cap_applied,capacity_limited,reasons_json,changes_json
       ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        recommendationId,
        enrollmentBySubject.get(item.subjectId),
        item.scheduleTypeId,
        item.currentMinutes,
        item.baseMinutes,
        item.scoreGapMinutes,
        item.weakTopicMinutes,
        item.examProximityMinutes,
        item.quizFloorMinutes,
        item.workloadMinutes,
        item.deadlineMinutes,
        item.behaviorAdjustmentMinutes,
        item.previousActualMinutes,
        item.previousAdherentMinutes,
        item.previousAdherenceRate,
        item.rawTargetMinutes,
        item.maxTargetMinutes,
        item.targetMinutes,
        item.allocatedMinutes,
        item.unallocatedMinutes,
        item.differenceMinutes,
        item.primaryAction,
        item.capApplied ? 1 : 0,
        item.capacityLimited ? 1 : 0,
        JSON.stringify(item.reasons),
        JSON.stringify(changes),
      ]
    );
    item.recommendationItemId = result.insertId;
  }
  for (const block of blocks) {
    const item = items.find(
      (candidate) =>
        candidate.subjectId === block.subjectId &&
        candidate.scheduleTypeId === block.scheduleTypeId
    );
    await connection.query(
      `INSERT INTO weekly_schedule_block(
         recommendation_id,recommendation_item_id,enrollment_id,schedule_type_id,
         source_weekly_block_id,scheduled_date,start_time,end_time,source,is_user_modified
       ) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [
        recommendationId,
        item?.recommendationItemId ?? null,
        enrollmentBySubject.get(block.subjectId),
        block.scheduleTypeId,
        block.sourceWeeklyBlockId,
        block.scheduledDate,
        block.startTime,
        block.endTime,
        block.source === "copied_base" ? "generated" : block.source,
        block.isUserModified ? 1 : 0,
      ]
    );
  }
};

export const generateRecommendation = async (input: GenerateRecommendationInput) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const term = await currentTerm(connection, input.userId, true);
    if (!term) {
      throw new RecommendationServiceError(404, "NO_CURRENT_TERM", "No current term found");
    }
    await validateSourceReferences(connection, term.term_id, input);
    const types = await loadScheduleTypes(connection);
    const target = resolveTargetWeek(
      input.triggerType,
      input.now ?? new Date(),
      input.targetWeekStart
    );
    const enrollments = await loadEnrollments(connection, term.term_id);
    if (!enrollments.length) {
      throw new RecommendationServiceError(
        409,
        "NO_ENROLLED_SUBJECTS",
        "No enrolled subjects were found for the current term"
      );
    }
    const workloads = await loadWorkloads(connection, term.term_id, target.weekEnd);
    const previous = await acceptedBaseRecommendation(connection, term.term_id, target.weekStart);
    const base = await baseBlocks(connection, previous, target.weekStart);
    const shouldUseWeeklyBehavior =
      input.triggerType === "weekend" ||
      (await hasWeekendRecommendation(connection, term.term_id, target.weekStart));
    const behavior =
      shouldUseWeeklyBehavior
        ? await loadWeekendBehavior(connection, term.term_id, target.weekStart, types.review)
        : new Map<number, BehaviorRow>();
    const items = makeItems(
      enrollments,
      workloads,
      base,
      behavior,
      types,
      target.weekStart,
      examContext(term, target.weekStart, target.weekEnd)
    );
    const classes = await loadClasses(connection, term.term_id);
    const constraints = await loadConstraints(connection, input.userId);
    const plan = buildSchedulePlan({
      items,
      baseBlocks: base,
      classBlocks: classes,
      busyBlocks: constraints.busy,
      constraint: constraints.constraint,
      weekStart: target.weekStart,
      weekEnd: target.weekEnd,
      userId: input.userId,
      termId: term.term_id,
      now: input.now ?? new Date(),
      previousAcceptedRecommendationId: previous?.recommendationId ?? null,
    });
    const [versions] = await connection.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(version),0)+1 AS version FROM weekly_recommendation
       WHERE student_term_id=? AND week_start_date=?`,
      [term.term_id, target.weekStart]
    );
    await connection.query(
      `UPDATE weekly_recommendation SET status='superseded',superseded_at=NOW()
       WHERE student_term_id=? AND week_start_date=? AND status='pending'`,
      [term.term_id, target.weekStart]
    );
    const [header] = await connection.query<ResultSetHeader>(
      `INSERT INTO weekly_recommendation(
         student_term_id,previous_recommendation_id,source_exam_attempt_id,
         source_workload_id,week_start_date,week_end_date,version,trigger_type,rule_version,status
       ) VALUES(?,?,?,?,?,?,?,?,?,'pending')`,
      [
        term.term_id,
        previous?.recommendationId ?? null,
        input.examAttemptId ?? null,
        input.workloadId ?? null,
        target.weekStart,
        target.weekEnd,
        Number(versions[0].version),
        input.triggerType,
        RULE_VERSION,
      ]
    );
    await insertPlan(connection, header.insertId, enrollments, plan.items, plan.blocks);
    await connection.commit();
    return getRecommendationById(input.userId, header.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const parseJson = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const getRecommendationById = async (userId: number, recommendationId: number) => {
  const connection = await db.getConnection();
  try {
    const header = await ownedHeader(connection, userId, recommendationId);
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT i.recommendation_item_id,i.recommendation_id,s.subject_id,s.subject_name,
         i.schedule_type_id,LOWER(t.type_code) AS schedule_type_code,
         t.type_name AS schedule_type_name,i.current_minutes,i.base_minutes,
         i.score_gap_minutes,i.weak_topic_minutes,i.exam_proximity_minutes,
         i.quiz_floor_minutes,i.workload_minutes,i.deadline_minutes,
         i.behavior_adjustment_minutes,i.previous_actual_minutes,
         i.previous_adherent_minutes,i.previous_adherence_rate,
         i.raw_minutes AS raw_target_minutes,i.max_minutes AS max_target_minutes,
         i.target_minutes,i.allocated_minutes,i.unallocated_minutes,
         i.difference_minutes,i.primary_action,i.cap_applied,i.capacity_limited,
         i.reasons_json,i.changes_json
       FROM weekly_recommendation_item i
       INNER JOIN enrollments e ON e.enrollment_id=i.enrollment_id
       INNER JOIN course_sections cs ON cs.section_id=e.section_id
       INNER JOIN subjects s ON s.subject_id=cs.subject_id
       INNER JOIN schedule_types t ON t.schedule_type_id=i.schedule_type_id
       WHERE i.recommendation_id=? ORDER BY s.subject_name,t.type_code`,
      [recommendationId]
    );
    const [blocks] = await connection.query<RowDataPacket[]>(
      `SELECT b.weekly_block_id,b.recommendation_id,b.recommendation_item_id,
         b.enrollment_id AS schedule_time_id,b.source_weekly_block_id,st.user_id,
         s.subject_id,s.subject_name,b.schedule_type_id,
         LOWER(t.type_code) AS schedule_type_code,t.type_name AS schedule_type_name,
         DATE_FORMAT(b.scheduled_date,'%Y-%m-%d') AS scheduled_date,
         TIME_FORMAT(b.start_time,'%H:%i:%s') AS start_time,
         TIME_FORMAT(b.end_time,'%H:%i:%s') AS end_time,b.source,b.is_user_modified
       FROM weekly_schedule_block b
       INNER JOIN enrollments e ON e.enrollment_id=b.enrollment_id
       INNER JOIN student_terms st ON st.student_term_id=e.student_term_id
       INNER JOIN course_sections cs ON cs.section_id=e.section_id
       INNER JOIN subjects s ON s.subject_id=cs.subject_id
       INNER JOIN schedule_types t ON t.schedule_type_id=b.schedule_type_id
       WHERE b.recommendation_id=? ORDER BY b.scheduled_date,b.start_time`,
      [recommendationId]
    );
    const normalizedBlocks: Array<Record<string, unknown>> = blocks.map((block) => ({
      ...block,
      is_user_modified: Boolean(block.is_user_modified),
      term_id: header.term_id,
    }));
    return {
      ...header,
      exam_score_history_id: header.exam_attempt_id,
      items: items.map((item) => ({
        ...item,
        previous_adherence_rate:
          item.previous_adherence_rate === null ? null : Number(item.previous_adherence_rate),
        cap_applied: Boolean(item.cap_applied),
        capacity_limited: Boolean(item.capacity_limited),
        reasons_json: parseJson(item.reasons_json),
        changes_json: parseJson(item.changes_json),
        blocks: normalizedBlocks.filter(
          (block) =>
            Number(block.recommendation_item_id) === Number(item.recommendation_item_id)
        ),
      })),
      blocks: normalizedBlocks,
    };
  } finally {
    connection.release();
  }
};

export const getLatestRecommendation = async (userId: number, weekStart?: string) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT wr.recommendation_id FROM weekly_recommendation wr
     INNER JOIN student_terms st ON st.student_term_id=wr.student_term_id
     WHERE st.user_id=? AND st.status='active' AND wr.status<>'superseded'
       ${weekStart ? "AND wr.week_start_date=?" : ""}
     ORDER BY wr.week_start_date DESC,wr.version DESC LIMIT 1`,
    weekStart ? [userId, weekStart] : [userId]
  );
  return rows[0]
    ? getRecommendationById(userId, Number(rows[0].recommendation_id))
    : null;
};

export const acceptRecommendation = async (userId: number, recommendationId: number) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const header = await ownedHeader(connection, userId, recommendationId, true);
    if (header.status !== "pending") {
      throw new RecommendationServiceError(
        409,
        "RECOMMENDATION_NOT_PENDING",
        "Only a pending recommendation can be accepted"
      );
    }
    await connection.query(
      `UPDATE weekly_recommendation SET status='superseded',superseded_at=NOW()
       WHERE student_term_id=? AND week_start_date=? AND status='accepted'
         AND recommendation_id<>?`,
      [header.term_id, header.week_start, recommendationId]
    );
    await connection.query(
      `UPDATE weekly_recommendation SET status='accepted',accepted_at=NOW()
       WHERE recommendation_id=?`,
      [recommendationId]
    );
    await connection.commit();
    return getRecommendationById(userId, recommendationId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const rejectRecommendation = async (userId: number, recommendationId: number) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const header = await ownedHeader(connection, userId, recommendationId, true);
    if (header.status !== "pending") {
      throw new RecommendationServiceError(
        409,
        "RECOMMENDATION_NOT_PENDING",
        "Only a pending recommendation can be rejected"
      );
    }
    await connection.query(
      `UPDATE weekly_recommendation SET status='rejected',rejected_at=NOW()
       WHERE recommendation_id=?`,
      [recommendationId]
    );
    await connection.commit();
    return getRecommendationById(userId, recommendationId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const validateBlock = (input: Record<string, unknown>, header: HeaderRow) => {
  const date = String(input.scheduled_date ?? "");
  const start = String(input.start_time ?? "");
  const end = String(input.end_time ?? "");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}(:\d{2})?$/.test(start) ||
    !/^\d{2}:\d{2}(:\d{2})?$/.test(end) ||
    start >= end
  ) {
    throw new RecommendationServiceError(
      400,
      "INVALID_BLOCK",
      "A valid date, start_time, and end_time are required"
    );
  }
  if (date < header.week_start || date > header.week_end) {
    throw new RecommendationServiceError(
      400,
      "BLOCK_OUTSIDE_WEEK",
      "Block must be inside the recommendation week"
    );
  }
  return { date, start, end };
};

const editableHeader = async (
  connection: PoolConnection,
  userId: number,
  recommendationId: number
) => {
  const header = await ownedHeader(connection, userId, recommendationId, true);
  if (!["pending", "accepted"].includes(header.status)) {
    throw new RecommendationServiceError(
      409,
      "RECOMMENDATION_NOT_EDITABLE",
      "Only pending or accepted plans can be edited"
    );
  }
  return header;
};

export const addPreviewBlock = async (
  userId: number,
  recommendationId: number,
  input: Record<string, unknown>
) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const header = await editableHeader(connection, userId, recommendationId);
    const block = validateBlock(input, header);
    const types = await loadScheduleTypes(connection);
    const type = Number(input.schedule_type_id);
    if (![types.review, types.homework].includes(type)) {
      throw new RecommendationServiceError(
        400,
        "INVALID_SCHEDULE_TYPE",
        "schedule_type_id must refer to an active review or homework type"
      );
    }
    const [enrollments] = await connection.query<RowDataPacket[]>(
      `SELECT e.enrollment_id FROM enrollments e
       INNER JOIN course_sections cs ON cs.section_id=e.section_id
       WHERE e.student_term_id=? AND e.status='enrolled' AND cs.subject_id=? LIMIT 1`,
      [header.term_id, String(input.subject_id)]
    );
    if (!enrollments[0]) {
      throw new RecommendationServiceError(
        404,
        "SUBJECT_NOT_FOUND",
        "Subject is not enrolled in the current term"
      );
    }
    await connection.query(
      `INSERT INTO weekly_schedule_block(
         recommendation_id,enrollment_id,schedule_type_id,scheduled_date,
         start_time,end_time,source,is_user_modified
       ) VALUES(?,?,?,?,?,?,'user_added',1)`,
      [recommendationId, enrollments[0].enrollment_id, type, block.date, block.start, block.end]
    );
    await connection.commit();
    return getRecommendationById(userId, recommendationId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updatePreviewBlock = async (
  userId: number,
  recommendationId: number,
  weeklyBlockId: number,
  input: Record<string, unknown>
) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const header = await editableHeader(connection, userId, recommendationId);
    const block = validateBlock(input, header);
    const [owned] = await connection.query<RowDataPacket[]>(
      `SELECT weekly_block_id FROM weekly_schedule_block
       WHERE weekly_block_id=? AND recommendation_id=? LIMIT 1`,
      [weeklyBlockId, recommendationId]
    );
    if (!owned[0]) {
      throw new RecommendationServiceError(404, "BLOCK_NOT_FOUND", "Schedule block was not found");
    }
    await connection.query(
      `UPDATE weekly_schedule_block SET scheduled_date=?,start_time=?,end_time=?,
         source='user_adjusted',is_user_modified=1 WHERE weekly_block_id=?`,
      [block.date, block.start, block.end, weeklyBlockId]
    );
    await connection.commit();
    return getRecommendationById(userId, recommendationId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deletePreviewBlock = async (
  userId: number,
  recommendationId: number,
  weeklyBlockId: number
) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await editableHeader(connection, userId, recommendationId);
    const [result] = await connection.query<ResultSetHeader>(
      `DELETE FROM weekly_schedule_block WHERE weekly_block_id=? AND recommendation_id=?`,
      [weeklyBlockId, recommendationId]
    );
    if (!result.affectedRows) {
      throw new RecommendationServiceError(404, "BLOCK_NOT_FOUND", "Schedule block was not found");
    }
    await connection.commit();
    return getRecommendationById(userId, recommendationId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getAcceptedWeeklySchedule = async (userId: number, weekStart?: string) => {
  const target = weekStart ?? resolveTargetWeek("manual", new Date()).weekStart;
  const connection = await db.getConnection();
  try {
    const term = await currentTerm(connection, userId);
    if (!term) {
      throw new RecommendationServiceError(404, "NO_CURRENT_TERM", "No current term found");
    }
    const accepted = await acceptedForWeek(connection, term.term_id, target);
    const [classes] = await connection.query<RowDataPacket[]>(
      `SELECT cm.class_meeting_id AS schedule_time_id,0 AS schedule_type_id,
         'class' AS schedule_type_code,'Class' AS schedule_type_name,
         s.subject_id,s.subject_name,
         FIELD(cm.day_of_week,'monday','tuesday','wednesday','thursday','friday','saturday','sunday') AS schedule_day,
         TIME_FORMAT(cm.start_time,'%H:%i:%s') AS start_time,
         TIME_FORMAT(cm.end_time,'%H:%i:%s') AS end_time,cm.classroom,NULL AS note
       FROM class_meetings cm
       INNER JOIN course_sections cs ON cs.section_id=cm.section_id
       INNER JOIN subjects s ON s.subject_id=cs.subject_id
       INNER JOIN enrollments e ON e.section_id=cs.section_id
       WHERE e.student_term_id=? AND e.status='enrolled'
       ORDER BY schedule_day,cm.start_time`,
      [term.term_id]
    );
    const recommendation = accepted
      ? await getRecommendationById(userId, accepted)
      : null;
    return {
      week_start: target,
      week_end: addDays(target, 6),
      recurring_classes: classes,
      accepted_recommendation: recommendation,
      weekly_blocks: recommendation?.blocks ?? [],
    };
  } finally {
    connection.release();
  }
};

export const safelyGenerateRecommendation = async (input: GenerateRecommendationInput) => {
  try {
    return { recommendation: await generateRecommendation(input), warning: null };
  } catch (error) {
    console.error("generateRecommendation trigger error:", error);
    return {
      recommendation: null,
      warning: error instanceof Error ? error.message : "Recommendation could not be generated",
    };
  }
};

export const generateWeekendRecommendations = async (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const bangkokDate = `${values.year}-${values.month}-${values.day}`;
  if (isoDay(bangkokDate) !== 7 || Number(values.hour) < 18) return [];
  const { weekStart } = resolveTargetWeek("weekend", now);
  const [users] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT user_id FROM student_terms WHERE status='active'`
  );
  const results = [];
  for (const row of users) {
    const existing = await getLatestRecommendation(Number(row.user_id), weekStart);
    if (existing?.trigger_type === "weekend") continue;
    results.push(
      await safelyGenerateRecommendation({
        userId: Number(row.user_id),
        triggerType: "weekend",
        now,
        targetWeekStart: weekStart,
      })
    );
  }
  return results;
};
