import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import db from "../../config/db";
import {
  addDays,
  bangkokDateTimeParts,
  derivePrimaryAction,
  durationMinutes,
  examProximityMinutes,
  HOMEWORK_CAP_MINUTES,
  isoDay,
  itemKey,
  quizPriority,
  resolveTargetWeek,
  REVIEW_CAP_MINUTES,
  scoreGapMinutes,
  targetScoreFromGpa,
  timeToMinutes,
  weakTopicMinutes,
  workloadUrgency,
} from "./recommendation.rules";
import { buildSchedulePlan } from "./recommendation.scheduler";
import {
  CLASS_SCHEDULE_TYPE_ID,
  HOMEWORK_SCHEDULE_TYPE_ID,
  REVIEW_SCHEDULE_TYPE_ID,
  RULE_VERSION,
} from "./recommendation.types";
import type {
  BaseBlockRow,
  BusyRow,
  ClassBlockRow,
  ConstraintRow,
  GenerateRecommendationInput,
  PlannedBlock,
  RecommendationAction,
  RecommendationItemDraft,
  RecommendationSummary,
  RecommendationTrigger,
  SubjectRuleRow,
  TermRow,
  WorkloadDemand,
  WorkloadRuleRow,
} from "./recommendation.types";

interface RecommendationRow extends RowDataPacket, RecommendationSummary {
  exam_score_history_id: number | null;
  workload_id: number | null;
  accepted_at: Date | null;
  rejected_at: Date | null;
  superseded_at: Date | null;
  updated_at: Date;
}

interface RecommendationItemRow extends RowDataPacket {
  recommendation_item_id: number;
  recommendation_id: number;
  subject_id: string;
  subject_name: string;
  schedule_type_id: number;
  schedule_type_name: string;
  current_minutes: number;
  base_minutes: number;
  score_gap_minutes: number;
  weak_topic_minutes: number;
  exam_proximity_minutes: number;
  quiz_floor_minutes: number;
  workload_minutes: number;
  deadline_minutes: number;
  raw_target_minutes: number;
  max_target_minutes: number;
  target_minutes: number;
  allocated_minutes: number;
  unallocated_minutes: number;
  difference_minutes: number;
  primary_action: RecommendationAction;
  cap_applied: number;
  capacity_limited: number;
  reasons_json: unknown;
  changes_json: unknown;
}

interface WeeklyBlockRow extends RowDataPacket {
  weekly_block_id: number;
  recommendation_id: number;
  recommendation_item_id: number | null;
  schedule_time_id: number | null;
  source_weekly_block_id: number | null;
  user_id: number;
  term_id: number;
  subject_id: string;
  subject_name: string;
  schedule_type_id: number;
  schedule_type_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  source: string;
  is_user_modified: number;
}

interface ExistingRecommendationRow extends RowDataPacket {
  recommendation_id: number;
  version: number;
  status: string;
  trigger_type?: RecommendationTrigger;
}

interface WorkloadSourceRow extends RowDataPacket {
  workload_id: number;
}

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

const jsonValue = (value: unknown) =>
  value === null || value === undefined
    ? null
    : typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        })()
      : value;

const currentPlanningDate = (now: Date, weekStart: string) => {
  const today = bangkokDateTimeParts(now).date;
  return today < weekStart ? weekStart : today;
};

const loadCurrentTerm = async (
  connection: PoolConnection,
  userId: number,
  lock = false
) => {
  const [rows] = await connection.query<TermRow[]>(
    `SELECT
       term_id, user_id, term, semester, academic_year,
       DATE_FORMAT(start_midterm, '%Y-%m-%d') AS start_midterm,
       DATE_FORMAT(end_midterm, '%Y-%m-%d') AS end_midterm,
       DATE_FORMAT(start_final, '%Y-%m-%d') AS start_final,
       DATE_FORMAT(end_final, '%Y-%m-%d') AS end_final
     FROM terms
     WHERE user_id = ? AND term_status = 1
     ORDER BY term_id DESC
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [userId]
  );
  return rows[0] ?? null;
};

const loadSubjects = async (
  connection: PoolConnection,
  userId: number,
  termId: number
) => {
  const [rows] = await connection.query<SubjectRuleRow[]>(
    `SELECT
       classes.subject_id,
       classes.subject_name,
       classes.target_gpa,
       COALESCE(scores.total_actual_score, 0) AS total_actual_score,
       COALESCE(weak.weak_topic_count, 0) AS weak_topic_count
     FROM (
       SELECT
         st.subject_id,
         s.subject_name,
         MAX(CAST(st.target_score AS DOUBLE)) AS target_gpa
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
       GROUP BY st.subject_id, s.subject_name
     ) classes
     LEFT JOIN (
       SELECT st.subject_id, SUM(sc.actual_score) AS total_actual_score
       FROM schedule_time st
       INNER JOIN workloads w ON w.schedule_time_id = st.schedule_time_id
       INNER JOIN score sc ON sc.workload_id = w.workload_id
       WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
       GROUP BY st.subject_id
     ) scores ON scores.subject_id = classes.subject_id
     LEFT JOIN (
       SELECT latest.subject_id, COUNT(*) AS weak_topic_count
       FROM (
         SELECT
           st.subject_id,
           ep.exam_part_name,
           (psh.part_score / NULLIF(ep.part_score, 0)) * 100 AS percentage,
           ROW_NUMBER() OVER (
             PARTITION BY st.subject_id, ep.exam_part_name
             ORDER BY esh.exam_date DESC, esh.exam_score_history_id DESC
           ) AS result_rank
         FROM part_score_history psh
         INNER JOIN exam_score_history esh
           ON esh.exam_score_history_id = psh.exam_score_history_id
         INNER JOIN exam_part ep ON ep.exam_part_id = psh.exam_part_id
         INNER JOIN schedule_time st
           ON st.schedule_time_id = esh.schedule_time_id
         WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
           AND ep.part_score > 0
       ) latest
       WHERE latest.result_rank = 1 AND latest.percentage < 50
       GROUP BY latest.subject_id
     ) weak ON weak.subject_id = classes.subject_id
     ORDER BY classes.subject_id`,
    [
      userId,
      termId,
      CLASS_SCHEDULE_TYPE_ID,
      userId,
      termId,
      CLASS_SCHEDULE_TYPE_ID,
      userId,
      termId,
      CLASS_SCHEDULE_TYPE_ID,
    ]
  );
  return rows;
};

const loadWorkloads = async (
  connection: PoolConnection,
  userId: number,
  termId: number
) => {
  const [rows] = await connection.query<WorkloadRuleRow[]>(
    `SELECT
       w.workload_id,
       st.subject_id,
       LOWER(wt.workload_type_name) AS workload_type_name,
       DATE_FORMAT(w.deadline_date, '%Y-%m-%d') AS deadline_date,
       TIME_FORMAT(w.deadline_time, '%H:%i:%s') AS deadline_time,
       w.workload_status
     FROM workloads w
     INNER JOIN workload_types wt
       ON wt.workload_type_id = w.workload_type_id
     INNER JOIN schedule_time st
       ON st.schedule_time_id = w.schedule_time_id
     WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
       AND w.workload_status = 0
     ORDER BY w.deadline_date, w.deadline_time, w.workload_id`,
    [userId, termId, CLASS_SCHEDULE_TYPE_ID]
  );
  return rows;
};

const loadClassBlocks = async (
  connection: PoolConnection,
  userId: number,
  termId: number
) => {
  const [rows] = await connection.query<ClassBlockRow[]>(
    `SELECT schedule_day,
       TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
       TIME_FORMAT(end_time, '%H:%i:%s') AS end_time
     FROM schedule_time
     WHERE user_id = ? AND term_id = ? AND schedule_type_id = ?
       AND schedule_day IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL`,
    [userId, termId, CLASS_SCHEDULE_TYPE_ID]
  );
  return rows;
};

const loadConstraints = async (
  connection: PoolConnection,
  userId: number
) => {
  const [constraints] = await connection.query<ConstraintRow[]>(
    `SELECT constraint_id, day_off, continuous_working_duration,
       \`break\` AS break_minutes,
       TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
       TIME_FORMAT(end_time, '%H:%i:%s') AS end_time
     FROM \`constraint\`
     WHERE user_id = ?
     ORDER BY constraint_id DESC LIMIT 1`,
    [userId]
  );
  if (!constraints[0]) return { constraint: null, busy: [] as BusyRow[] };
  const [busy] = await connection.query<BusyRow[]>(
    `SELECT recurring_busy_day,
       TIME_FORMAT(recurring_busy_time_start, '%H:%i:%s') AS start_time,
       TIME_FORMAT(recurring_busy_time_end, '%H:%i:%s') AS end_time
     FROM recurring_busy
     WHERE constraint_id = ?`,
    [constraints[0].constraint_id]
  );
  return { constraint: constraints[0], busy };
};

const loadAcceptedRecommendation = async (
  connection: PoolConnection,
  userId: number,
  termId: number,
  weekStart: string
) => {
  const [rows] = await connection.query<ExistingRecommendationRow[]>(
    `SELECT recommendation_id, version, status
     FROM weekly_recommendation
     WHERE user_id = ? AND term_id = ? AND week_start = ? AND status = 'accepted'
     ORDER BY version DESC LIMIT 1`,
    [userId, termId, weekStart]
  );
  return rows[0] ?? null;
};

const loadBaseBlocks = async (
  connection: PoolConnection,
  userId: number,
  termId: number,
  weekStart: string,
  acceptedRecommendationId: number | null
) => {
  if (acceptedRecommendationId) {
    const [rows] = await connection.query<BaseBlockRow[]>(
      `SELECT
         weekly_block_id,
         schedule_time_id,
         subject_id,
         schedule_type_id,
         DATE_FORMAT(scheduled_date, '%Y-%m-%d') AS scheduled_date,
         TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
         TIME_FORMAT(end_time, '%H:%i:%s') AS end_time,
         source,
         is_user_modified
       FROM weekly_schedule_block
       WHERE recommendation_id = ?
       ORDER BY scheduled_date, start_time, weekly_block_id`,
      [acceptedRecommendationId]
    );
    return rows;
  }
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT
       NULL AS weekly_block_id,
       schedule_time_id,
       subject_id,
       schedule_type_id,
       schedule_day,
       TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
       TIME_FORMAT(end_time, '%H:%i:%s') AS end_time
     FROM schedule_time
     WHERE user_id = ? AND term_id = ? AND schedule_type_id IN (?, ?)
       AND schedule_day BETWEEN 1 AND 7
       AND start_time IS NOT NULL AND end_time IS NOT NULL
     ORDER BY schedule_day, start_time, schedule_time_id`,
    [userId, termId, REVIEW_SCHEDULE_TYPE_ID, HOMEWORK_SCHEDULE_TYPE_ID]
  );
  return rows.map((row) => ({
    weekly_block_id: null,
    schedule_time_id: Number(row.schedule_time_id),
    subject_id: String(row.subject_id),
    schedule_type_id: Number(row.schedule_type_id),
    scheduled_date: addDays(weekStart, Number(row.schedule_day) - 1),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    source: "copied_base" as const,
    is_user_modified: 0,
  })) as BaseBlockRow[];
};

const blockMinutesByItem = (blocks: BaseBlockRow[]) => {
  const totals = new Map<string, number>();
  for (const block of blocks) {
    const key = itemKey(block.subject_id, Number(block.schedule_type_id));
    totals.set(
      key,
      (totals.get(key) ?? 0) + durationMinutes(block.start_time, block.end_time)
    );
  }
  return totals;
};

const buildItemDrafts = (
  subjects: SubjectRuleRow[],
  workloads: WorkloadRuleRow[],
  baseBlocks: BaseBlockRow[],
  term: TermRow,
  weekStart: string,
  weekEnd: string,
  now: Date
) => {
  const currentMinutes = blockMinutesByItem(baseBlocks);
  const planningDate = currentPlanningDate(now, weekStart);
  const examMinutes = examProximityMinutes(weekStart, weekEnd, [
    { start: term.start_midterm, end: term.end_midterm },
    { start: term.start_final, end: term.end_final },
  ]);
  const items: RecommendationItemDraft[] = [];

  for (const subject of subjects) {
    const subjectWorkloads = workloads.filter(
      (workload) => workload.subject_id === subject.subject_id
    );
    const exactExams = subjectWorkloads.filter(
      (workload) =>
        ["quiz", "midterm", "final"].includes(workload.workload_type_name) &&
        workload.deadline_date >= weekStart &&
        workload.deadline_date <= weekEnd
    );
    const quizzes = exactExams.filter(
      (workload) => workload.workload_type_name === "quiz"
    );
    const earliestExam = [...exactExams].sort((left, right) =>
      `${left.deadline_date}T${left.deadline_time}`.localeCompare(
        `${right.deadline_date}T${right.deadline_time}`
      )
    )[0];
    const targetScore = targetScoreFromGpa(
      subject.target_gpa === null ? null : Number(subject.target_gpa)
    );
    const scoreGap = Math.max(
      0,
      (targetScore ?? 0) - Number(subject.total_actual_score ?? 0)
    );
    const scoreMinutes = targetScore === null ? 0 : scoreGapMinutes(scoreGap);
    const weakCount = Number(subject.weak_topic_count ?? 0);
    const weakMinutes = weakTopicMinutes(weakCount);
    const reviewKey = itemKey(subject.subject_id, REVIEW_SCHEDULE_TYPE_ID);
    const hasReviewNeed =
      targetScore !== null ||
      weakCount > 0 ||
      examMinutes > 0 ||
      quizzes.length > 0 ||
      (currentMinutes.get(reviewKey) ?? 0) > 0;
    const reviewBase = hasReviewNeed ? 60 : 0;
    const quizFloor = quizzes.length > 0 ? 60 : 0;
    const rawReviewTarget = Math.max(
      quizFloor,
      reviewBase + scoreMinutes + weakMinutes + examMinutes
    );
    const reviewTarget = Math.min(REVIEW_CAP_MINUTES, rawReviewTarget);
    const earliestQuiz = [...quizzes].sort((left, right) =>
      `${left.deadline_date}T${left.deadline_time}`.localeCompare(
        `${right.deadline_date}T${right.deadline_time}`
      )
    )[0];
    const placementDeadline = earliestExam
      ? `${earliestExam.deadline_date}T${earliestExam.deadline_time}`
      : null;
    const reviewReasons = [];
    if (reviewBase) {
      reviewReasons.push({ code: "review_base", minutes: reviewBase, message: "เวลาทบทวนพื้นฐาน" });
    }
    if (scoreMinutes) {
      reviewReasons.push({
        code: "score_gap",
        minutes: scoreMinutes,
        message: "คะแนนสะสมยังห่างจากคะแนนขั้นต่ำของเกรดเป้าหมาย",
        metadata: { target_score: targetScore, actual_score: Number(subject.total_actual_score), gap: scoreGap },
      });
    }
    if (weakMinutes) {
      reviewReasons.push({
        code: "weak_topics",
        minutes: weakMinutes,
        message: "มีหัวข้อที่ผลล่าสุดต่ำกว่า 50%",
        metadata: { weak_topic_count: weakCount },
      });
    }
    if (examMinutes) {
      reviewReasons.push({ code: "exam_proximity", minutes: examMinutes, message: "ใกล้ช่วงสอบของภาคการศึกษา" });
    }
    if (quizFloor) {
      reviewReasons.push({
        code: "quiz_floor",
        minutes: quizFloor,
        message: "ต้องมีเวลาทบทวนอย่างน้อย 60 นาทีก่อน Quiz",
        metadata: { quiz_at: placementDeadline },
      });
    }
    if (earliestExam && earliestExam.workload_type_name !== "quiz") {
      reviewReasons.push({
        code: "exam_placement",
        minutes: 0,
        message: "ย้ายเวลาทบทวนให้อยู่ก่อนวันเวลา Midterm/Final",
        metadata: { exam_type: earliestExam.workload_type_name, exam_at: placementDeadline },
      });
    }
    if (reviewTarget > 0 || (currentMinutes.get(reviewKey) ?? 0) > 0) {
      items.push({
        key: reviewKey,
        subjectId: subject.subject_id,
        subjectName: subject.subject_name,
        scheduleTypeId: REVIEW_SCHEDULE_TYPE_ID,
        currentMinutes: currentMinutes.get(reviewKey) ?? 0,
        baseMinutes: reviewBase,
        scoreGapMinutes: scoreMinutes,
        weakTopicMinutes: weakMinutes,
        examProximityMinutes: examMinutes,
        quizFloorMinutes: quizFloor,
        workloadMinutes: 0,
        deadlineMinutes: 0,
        rawTargetMinutes: rawReviewTarget,
        maxTargetMinutes: REVIEW_CAP_MINUTES,
        targetMinutes: reviewTarget,
        allocatedMinutes: 0,
        unallocatedMinutes: 0,
        differenceMinutes: 0,
        capApplied: rawReviewTarget > REVIEW_CAP_MINUTES,
        capacityLimited: false,
        primaryAction: "keep",
        reasons: reviewReasons,
        workloadDemands: [],
        placementDeadline,
        placementPriority: earliestQuiz
          ? quizPriority(planningDate, earliestQuiz.deadline_date)
          : 6,
      });
    }

    const homeworkRows = subjectWorkloads.filter((workload) =>
      ["assignment", "project"].includes(workload.workload_type_name)
    );
    const homeworkDemands: WorkloadDemand[] = homeworkRows.map((workload) => {
      const workloadType = workload.workload_type_name as "assignment" | "project";
      const base = workloadType === "project" ? 180 : 60;
      const urgency = workloadUrgency(planningDate, workload.deadline_date);
      return {
        workloadId: Number(workload.workload_id),
        workloadType,
        minutes: base + urgency.minutes,
        deadlineDate:
          workload.deadline_date < planningDate ? weekEnd : workload.deadline_date,
        deadlineTime:
          workload.deadline_date < planningDate ? "23:59:59" : workload.deadline_time,
        priority: urgency.priority,
        urgency: urgency.urgency,
      };
    });
    const homeworkBase = homeworkRows.reduce(
      (sum, workload) => sum + (workload.workload_type_name === "project" ? 180 : 60),
      0
    );
    const homeworkDeadline = homeworkRows.reduce((sum, workload) => {
      const urgency = workloadUrgency(planningDate, workload.deadline_date);
      return sum + urgency.minutes;
    }, 0);
    const rawHomeworkTarget = homeworkBase + homeworkDeadline;
    const homeworkTarget = Math.min(HOMEWORK_CAP_MINUTES, rawHomeworkTarget);
    const homeworkKey = itemKey(subject.subject_id, HOMEWORK_SCHEDULE_TYPE_ID);
    if (homeworkTarget > 0 || (currentMinutes.get(homeworkKey) ?? 0) > 0) {
      items.push({
        key: homeworkKey,
        subjectId: subject.subject_id,
        subjectName: subject.subject_name,
        scheduleTypeId: HOMEWORK_SCHEDULE_TYPE_ID,
        currentMinutes: currentMinutes.get(homeworkKey) ?? 0,
        baseMinutes: 0,
        scoreGapMinutes: 0,
        weakTopicMinutes: 0,
        examProximityMinutes: 0,
        quizFloorMinutes: 0,
        workloadMinutes: homeworkBase,
        deadlineMinutes: homeworkDeadline,
        rawTargetMinutes: rawHomeworkTarget,
        maxTargetMinutes: HOMEWORK_CAP_MINUTES,
        targetMinutes: homeworkTarget,
        allocatedMinutes: 0,
        unallocatedMinutes: 0,
        differenceMinutes: 0,
        capApplied: rawHomeworkTarget > HOMEWORK_CAP_MINUTES,
        capacityLimited: false,
        primaryAction: "keep",
        reasons: homeworkRows.map((workload, index) => ({
          code: "pending_workload",
          minutes: homeworkDemands[index].minutes,
          message: `${workload.workload_type_name} ที่ยังไม่เสร็จ`,
          metadata: {
            workload_id: workload.workload_id,
            workload_type: workload.workload_type_name,
            deadline_at: `${workload.deadline_date}T${workload.deadline_time}`,
            urgency: homeworkDemands[index].urgency,
          },
        })),
        workloadDemands: homeworkDemands,
        placementDeadline: homeworkDemands
          .map((demand) => `${demand.deadlineDate}T${demand.deadlineTime}`)
          .sort()[0] ?? null,
        placementPriority:
          homeworkDemands.map((demand) => demand.priority).sort()[0] ?? 9,
      });
    }
  }
  return items;
};

const validateSourceReferences = async (
  connection: PoolConnection,
  input: GenerateRecommendationInput,
  termId: number
) => {
  if (input.examScoreHistoryId) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT esh.exam_score_history_id
       FROM exam_score_history esh
       INNER JOIN schedule_time st ON st.schedule_time_id = esh.schedule_time_id
       WHERE esh.exam_score_history_id = ? AND st.user_id = ? AND st.term_id = ?
       LIMIT 1`,
      [input.examScoreHistoryId, input.userId, termId]
    );
    if (rows.length === 0) {
      throw new RecommendationServiceError(404, "EXAM_HISTORY_NOT_FOUND", "Exam score history was not found");
    }
  }
  if (input.workloadId) {
    const [rows] = await connection.query<WorkloadSourceRow[]>(
      `SELECT w.workload_id
       FROM workloads w
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       WHERE w.workload_id = ? AND st.user_id = ? AND st.term_id = ?
       LIMIT 1`,
      [input.workloadId, input.userId, termId]
    );
    if (rows.length === 0) {
      throw new RecommendationServiceError(404, "WORKLOAD_NOT_FOUND", "Workload source was not found");
    }
  }
};

const persistItem = async (
  connection: PoolConnection,
  recommendationId: number,
  item: RecommendationItemDraft
) => {
  const changes = (item as RecommendationItemDraft & { changes?: unknown[] }).changes ?? [];
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO weekly_recommendation_item (
       recommendation_id, subject_id, schedule_type_id,
       current_minutes, base_minutes, score_gap_minutes, weak_topic_minutes,
       exam_proximity_minutes, quiz_floor_minutes, workload_minutes,
       deadline_minutes, raw_target_minutes, max_target_minutes, target_minutes,
       allocated_minutes, unallocated_minutes, difference_minutes,
       primary_action, cap_applied, capacity_limited, reasons_json, changes_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recommendationId,
      item.subjectId,
      item.scheduleTypeId,
      item.currentMinutes,
      item.baseMinutes,
      item.scoreGapMinutes,
      item.weakTopicMinutes,
      item.examProximityMinutes,
      item.quizFloorMinutes,
      item.workloadMinutes,
      item.deadlineMinutes,
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
};

const persistBlock = async (
  connection: PoolConnection,
  recommendationId: number,
  block: PlannedBlock,
  items: RecommendationItemDraft[]
) => {
  const item = items.find(
    (candidate) =>
      candidate.subjectId === block.subjectId &&
      candidate.scheduleTypeId === block.scheduleTypeId
  );
  await connection.query(
    `INSERT INTO weekly_schedule_block (
       recommendation_id, recommendation_item_id, schedule_time_id,
       source_weekly_block_id, user_id, term_id, subject_id, schedule_type_id,
       scheduled_date, start_time, end_time, source, is_user_modified
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recommendationId,
      item?.recommendationItemId ?? null,
      block.scheduleTimeId,
      block.sourceWeeklyBlockId,
      block.userId,
      block.termId,
      block.subjectId,
      block.scheduleTypeId,
      block.scheduledDate,
      block.startTime,
      block.endTime,
      block.source,
      block.isUserModified ? 1 : 0,
    ]
  );
};

export const generateRecommendation = async (
  input: GenerateRecommendationInput
) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const term = await loadCurrentTerm(connection, input.userId, true);
    if (!term) {
      throw new RecommendationServiceError(404, "NO_CURRENT_TERM", "No current term found");
    }
    await validateSourceReferences(connection, input, term.term_id);
    const now = input.now ?? new Date();
    const { weekStart, weekEnd } = resolveTargetWeek(
      input.triggerType,
      now,
      input.targetWeekStart
    );
    const [existing] = await connection.query<ExistingRecommendationRow[]>(
      `SELECT recommendation_id, version, status, trigger_type
       FROM weekly_recommendation
       WHERE user_id = ? AND term_id = ? AND week_start = ?
       ORDER BY version DESC
       FOR UPDATE`,
      [input.userId, term.term_id, weekStart]
    );
    const existingWeekend = existing.find(
      (row) => row.trigger_type === "weekend"
    );
    if (input.triggerType === "weekend" && existingWeekend) {
      await connection.commit();
      return getRecommendationById(
        input.userId,
        existingWeekend.recommendation_id
      );
    }
    const previous = existing[0] ?? null;
    const accepted = await loadAcceptedRecommendation(
      connection,
      input.userId,
      term.term_id,
      weekStart
    );
    await connection.query(
      `UPDATE weekly_recommendation
       SET status = 'superseded', superseded_at = NOW()
       WHERE user_id = ? AND term_id = ? AND week_start = ? AND status = 'pending'`,
      [input.userId, term.term_id, weekStart]
    );
    const [header] = await connection.query<ResultSetHeader>(
      `INSERT INTO weekly_recommendation (
         user_id, term_id, previous_recommendation_id,
         exam_score_history_id, workload_id, week_start, week_end,
         version, trigger_type, rule_version, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        input.userId,
        term.term_id,
        previous?.recommendation_id ?? null,
        input.examScoreHistoryId ?? null,
        input.workloadId ?? null,
        weekStart,
        weekEnd,
        (previous?.version ?? 0) + 1,
        input.triggerType,
        RULE_VERSION,
      ]
    );
    const recommendationId = header.insertId;
    const [subjects, workloads, classBlocks, constraintData] = await Promise.all([
      loadSubjects(connection, input.userId, term.term_id),
      loadWorkloads(connection, input.userId, term.term_id),
      loadClassBlocks(connection, input.userId, term.term_id),
      loadConstraints(connection, input.userId),
    ]);
    if (subjects.length === 0) {
      throw new RecommendationServiceError(
        409,
        "NO_CLASS_SUBJECTS",
        "Current term has no class subjects for schedule recommendations"
      );
    }
    const baseBlocks = await loadBaseBlocks(
      connection,
      input.userId,
      term.term_id,
      weekStart,
      accepted?.recommendation_id ?? null
    );
    const items = buildItemDrafts(
      subjects,
      workloads,
      baseBlocks,
      term,
      weekStart,
      weekEnd,
      now
    );
    const plan = buildSchedulePlan({
      items,
      baseBlocks,
      classBlocks,
      busyBlocks: constraintData.busy,
      constraint: constraintData.constraint,
      weekStart,
      weekEnd,
      userId: input.userId,
      termId: term.term_id,
      now,
      previousAcceptedRecommendationId: accepted?.recommendation_id ?? null,
    });
    for (const item of plan.items) {
      await persistItem(connection, recommendationId, item);
    }
    for (const block of plan.blocks) {
      await persistBlock(connection, recommendationId, block, plan.items);
    }
    await connection.commit();
    return getRecommendationById(input.userId, recommendationId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getRecommendationById = async (
  userId: number,
  recommendationId: number
) => {
  const [recommendations] = await db.query<RecommendationRow[]>(
    `SELECT
       recommendation_id, user_id, term_id, previous_recommendation_id,
       exam_score_history_id, workload_id,
       DATE_FORMAT(week_start, '%Y-%m-%d') AS week_start,
       DATE_FORMAT(week_end, '%Y-%m-%d') AS week_end,
       version, trigger_type, rule_version, status,
       generated_at, accepted_at, rejected_at, superseded_at, updated_at
     FROM weekly_recommendation
     WHERE recommendation_id = ? AND user_id = ?
     LIMIT 1`,
    [recommendationId, userId]
  );
  const recommendation = recommendations[0];
  if (!recommendation) {
    throw new RecommendationServiceError(404, "RECOMMENDATION_NOT_FOUND", "Recommendation was not found");
  }
  const [items] = await db.query<RecommendationItemRow[]>(
    `SELECT item.*, subjects.subject_name, types.schedule_type_name
     FROM weekly_recommendation_item item
     INNER JOIN subjects ON subjects.subject_id = item.subject_id
     INNER JOIN schedule_types types
       ON types.schedule_type_id = item.schedule_type_id
     WHERE item.recommendation_id = ?
     ORDER BY item.schedule_type_id, subjects.subject_name, item.subject_id`,
    [recommendationId]
  );
  const [blocks] = await db.query<WeeklyBlockRow[]>(
    `SELECT block.*, subjects.subject_name, types.schedule_type_name,
       DATE_FORMAT(block.scheduled_date, '%Y-%m-%d') AS scheduled_date,
       TIME_FORMAT(block.start_time, '%H:%i:%s') AS start_time,
       TIME_FORMAT(block.end_time, '%H:%i:%s') AS end_time
     FROM weekly_schedule_block block
     INNER JOIN subjects ON subjects.subject_id = block.subject_id
     INNER JOIN schedule_types types
       ON types.schedule_type_id = block.schedule_type_id
     WHERE block.recommendation_id = ?
     ORDER BY block.scheduled_date, block.start_time, block.weekly_block_id`,
    [recommendationId]
  );
  return {
    ...recommendation,
    items: items.map((item) => ({
      ...item,
      cap_applied: Boolean(item.cap_applied),
      capacity_limited: Boolean(item.capacity_limited),
      reasons_json: jsonValue(item.reasons_json),
      changes_json: jsonValue(item.changes_json),
      blocks: blocks
        .filter(
          (block) => block.recommendation_item_id === item.recommendation_item_id
        )
        .map((block) => ({
          ...block,
          is_user_modified: Boolean(block.is_user_modified),
        })),
    })),
    blocks: blocks.map((block) => ({
      ...block,
      is_user_modified: Boolean(block.is_user_modified),
    })),
  };
};

export const getLatestRecommendation = async (
  userId: number,
  weekStart?: string
) => {
  const params: unknown[] = [userId];
  let weekFilter = "";
  if (weekStart) {
    weekFilter = " AND week_start = ?";
    params.push(weekStart);
  }
  const [rows] = await db.query<ExistingRecommendationRow[]>(
    `SELECT recommendation_id, version, status
     FROM weekly_recommendation
     WHERE user_id = ? AND status <> 'superseded'${weekFilter}
     ORDER BY week_start DESC, version DESC LIMIT 1`,
    params
  );
  if (!rows[0]) return null;
  return getRecommendationById(userId, rows[0].recommendation_id);
};

const loadOwnedPending = async (
  connection: PoolConnection,
  userId: number,
  recommendationId: number,
  lock = false
) => {
  const [rows] = await connection.query<RecommendationRow[]>(
    `SELECT *, DATE_FORMAT(week_start, '%Y-%m-%d') AS week_start,
       DATE_FORMAT(week_end, '%Y-%m-%d') AS week_end
     FROM weekly_recommendation
     WHERE recommendation_id = ? AND user_id = ?
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [recommendationId, userId]
  );
  const recommendation = rows[0];
  if (!recommendation) {
    throw new RecommendationServiceError(404, "RECOMMENDATION_NOT_FOUND", "Recommendation was not found");
  }
  if (recommendation.status !== "pending") {
    throw new RecommendationServiceError(409, "RECOMMENDATION_NOT_PENDING", "Only a pending recommendation can be changed");
  }
  return recommendation;
};

const loadOwnedEditable = async (
  connection: PoolConnection,
  userId: number,
  recommendationId: number,
  lock = false
) => {
  const [rows] = await connection.query<RecommendationRow[]>(
    `SELECT *, DATE_FORMAT(week_start, '%Y-%m-%d') AS week_start,
       DATE_FORMAT(week_end, '%Y-%m-%d') AS week_end
     FROM weekly_recommendation
     WHERE recommendation_id = ? AND user_id = ?
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [recommendationId, userId]
  );
  const recommendation = rows[0];
  if (!recommendation) {
    throw new RecommendationServiceError(404, "RECOMMENDATION_NOT_FOUND", "Recommendation was not found");
  }
  if (!['pending', 'accepted'].includes(recommendation.status)) {
    throw new RecommendationServiceError(
      409,
      "RECOMMENDATION_NOT_EDITABLE",
      "Only pending or accepted weekly plans can be edited"
    );
  }
  return recommendation;
};

export const acceptRecommendation = async (
  userId: number,
  recommendationId: number
) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const recommendation = await loadOwnedPending(
      connection,
      userId,
      recommendationId,
      true
    );
    await connection.query(
      `UPDATE weekly_recommendation
       SET status = 'superseded', superseded_at = NOW()
       WHERE user_id = ? AND term_id = ? AND week_start = ?
         AND status = 'accepted' AND recommendation_id <> ?`,
      [userId, recommendation.term_id, recommendation.week_start, recommendationId]
    );
    await connection.query(
      `UPDATE weekly_recommendation
       SET status = 'accepted', accepted_at = NOW(), rejected_at = NULL,
           superseded_at = NULL
       WHERE recommendation_id = ?`,
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

export const rejectRecommendation = async (
  userId: number,
  recommendationId: number
) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await loadOwnedPending(connection, userId, recommendationId, true);
    await connection.query(
      `UPDATE weekly_recommendation
       SET status = 'rejected', rejected_at = NOW()
       WHERE recommendation_id = ?`,
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

const validateDate = (value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const validateTime = (value: unknown) =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
const normalizeTime = (value: string) => (value.length === 5 ? `${value}:00` : value);

const validatePreviewPlacement = async (
  connection: PoolConnection,
  recommendation: RecommendationRow,
  input: {
    subjectId: string;
    scheduleTypeId: number;
    scheduledDate: string;
    startTime: string;
    endTime: string;
  },
  excludeBlockId?: number
) => {
  if (![REVIEW_SCHEDULE_TYPE_ID, HOMEWORK_SCHEDULE_TYPE_ID].includes(input.scheduleTypeId)) {
    throw new RecommendationServiceError(400, "INVALID_SCHEDULE_TYPE", "schedule_type_id must be 2 or 3");
  }
  if (
    !validateDate(input.scheduledDate) ||
    !validateTime(input.startTime) ||
    !validateTime(input.endTime)
  ) {
    throw new RecommendationServiceError(400, "INVALID_BLOCK_TIME", "A valid date and HH:mm time range are required");
  }
  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  if (end <= start || (end - start) % 30 !== 0 || end - start < 30) {
    throw new RecommendationServiceError(400, "INVALID_BLOCK_DURATION", "Block duration must be a positive multiple of 30 minutes");
  }
  if (
    input.scheduledDate < recommendation.week_start ||
    input.scheduledDate > recommendation.week_end
  ) {
    throw new RecommendationServiceError(400, "DATE_OUTSIDE_WEEK", "Block date must be inside the recommendation week");
  }
  const [subjects] = await connection.query<RowDataPacket[]>(
    `SELECT st.subject_id
     FROM schedule_time st
     WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
       AND st.subject_id = ? LIMIT 1`,
    [recommendation.user_id, recommendation.term_id, CLASS_SCHEDULE_TYPE_ID, input.subjectId]
  );
  if (subjects.length === 0) {
    throw new RecommendationServiceError(404, "SUBJECT_NOT_FOUND", "Subject is not in the current term schedule");
  }
  const day = isoDay(input.scheduledDate);
  const [constraints] = await connection.query<ConstraintRow[]>(
    `SELECT constraint_id, day_off, continuous_working_duration,
       \`break\` AS break_minutes,
       TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
       TIME_FORMAT(end_time, '%H:%i:%s') AS end_time
     FROM \`constraint\` WHERE user_id = ? ORDER BY constraint_id DESC LIMIT 1`,
    [recommendation.user_id]
  );
  const constraint = constraints[0];
  if (constraint) {
    if (Number(constraint.day_off) === day) {
      throw new RecommendationServiceError(409, "DAY_OFF_CONFLICT", "Block is on the user's day off");
    }
    if (
      (constraint.start_time && start < timeToMinutes(constraint.start_time)) ||
      (constraint.end_time && end > timeToMinutes(constraint.end_time))
    ) {
      throw new RecommendationServiceError(409, "WORK_WINDOW_CONFLICT", "Block is outside the allowed working window");
    }
  }
  const params: unknown[] = [
    recommendation.user_id,
    recommendation.term_id,
    CLASS_SCHEDULE_TYPE_ID,
    day,
    normalizeTime(input.endTime),
    normalizeTime(input.startTime),
  ];
  const [classConflicts] = await connection.query<RowDataPacket[]>(
    `SELECT schedule_time_id
     FROM schedule_time
     WHERE user_id = ? AND term_id = ? AND schedule_type_id = ?
       AND schedule_day = ? AND start_time < ? AND end_time > ? LIMIT 1`,
    params
  );
  if (classConflicts.length > 0) {
    throw new RecommendationServiceError(409, "CLASS_CONFLICT", "Block overlaps a class");
  }
  if (constraint) {
    const [busyConflicts] = await connection.query<RowDataPacket[]>(
      `SELECT recurring_busy_id
       FROM recurring_busy
       WHERE constraint_id = ? AND recurring_busy_day = ?
         AND recurring_busy_time_start < ? AND recurring_busy_time_end > ? LIMIT 1`,
      [constraint.constraint_id, day, normalizeTime(input.endTime), normalizeTime(input.startTime)]
    );
    if (busyConflicts.length > 0) {
      throw new RecommendationServiceError(409, "RECURRING_BUSY_CONFLICT", "Block overlaps recurring busy time");
    }
  }
  const conflictParams: unknown[] = [
    recommendation.recommendation_id,
    input.scheduledDate,
    normalizeTime(input.endTime),
    normalizeTime(input.startTime),
  ];
  let exclude = "";
  if (excludeBlockId) {
    exclude = " AND weekly_block_id <> ?";
    conflictParams.push(excludeBlockId);
  }
  const [weeklyConflicts] = await connection.query<RowDataPacket[]>(
    `SELECT weekly_block_id
     FROM weekly_schedule_block
     WHERE recommendation_id = ? AND scheduled_date = ?
       AND start_time < ? AND end_time > ?${exclude} LIMIT 1`,
    conflictParams
  );
  if (weeklyConflicts.length > 0) {
    throw new RecommendationServiceError(409, "WEEKLY_BLOCK_CONFLICT", "Block overlaps another preview block");
  }
};

const refreshItemTotals = async (
  connection: PoolConnection,
  recommendationId: number,
  recommendationItemId: number
) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT current_minutes, target_minutes
     FROM weekly_recommendation_item
     WHERE recommendation_item_id = ? AND recommendation_id = ? LIMIT 1`,
    [recommendationItemId, recommendationId]
  );
  if (!rows[0]) return;
  const [totals] = await connection.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)), 0) AS allocated
     FROM weekly_schedule_block
     WHERE recommendation_id = ? AND recommendation_item_id = ?`,
    [recommendationId, recommendationItemId]
  );
  const current = Number(rows[0].current_minutes);
  const target = Number(rows[0].target_minutes);
  const allocated = Number(totals[0]?.allocated ?? 0);
  const action = derivePrimaryAction(current, allocated, true);
  await connection.query(
    `UPDATE weekly_recommendation_item
     SET allocated_minutes = ?, unallocated_minutes = ?, difference_minutes = ?,
         capacity_limited = ?, primary_action = ?,
         changes_json = JSON_ARRAY(JSON_OBJECT('action', 'user_adjusted'))
     WHERE recommendation_item_id = ?`,
    [
      allocated,
      Math.max(0, target - allocated),
      allocated - current,
      allocated < target ? 1 : 0,
      action,
      recommendationItemId,
    ]
  );
};

export const updatePreviewBlock = async (
  userId: number,
  recommendationId: number,
  weeklyBlockId: number,
  body: { scheduled_date?: unknown; start_time?: unknown; end_time?: unknown }
) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const recommendation = await loadOwnedEditable(connection, userId, recommendationId, true);
    const [blocks] = await connection.query<WeeklyBlockRow[]>(
      `SELECT * FROM weekly_schedule_block
       WHERE weekly_block_id = ? AND recommendation_id = ? LIMIT 1 FOR UPDATE`,
      [weeklyBlockId, recommendationId]
    );
    const block = blocks[0];
    if (!block) {
      throw new RecommendationServiceError(404, "WEEKLY_BLOCK_NOT_FOUND", "Weekly block was not found");
    }
    const scheduledDate = String(body.scheduled_date ?? block.scheduled_date);
    const startTime = normalizeTime(String(body.start_time ?? block.start_time));
    const endTime = normalizeTime(String(body.end_time ?? block.end_time));
    await validatePreviewPlacement(
      connection,
      recommendation,
      {
        subjectId: block.subject_id,
        scheduleTypeId: Number(block.schedule_type_id),
        scheduledDate,
        startTime,
        endTime,
      },
      weeklyBlockId
    );
    await connection.query(
      `UPDATE weekly_schedule_block
       SET scheduled_date = ?, start_time = ?, end_time = ?,
           source = 'user_adjusted', is_user_modified = 1
       WHERE weekly_block_id = ?`,
      [scheduledDate, startTime, endTime, weeklyBlockId]
    );
    if (block.recommendation_item_id) {
      await refreshItemTotals(connection, recommendationId, block.recommendation_item_id);
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

export const addPreviewBlock = async (
  userId: number,
  recommendationId: number,
  body: {
    subject_id?: unknown;
    schedule_type_id?: unknown;
    scheduled_date?: unknown;
    start_time?: unknown;
    end_time?: unknown;
  }
) => {
  const subjectId = String(body.subject_id ?? "").trim();
  const scheduleTypeId = Number(body.schedule_type_id);
  const scheduledDate = String(body.scheduled_date ?? "");
  const startTime = normalizeTime(String(body.start_time ?? ""));
  const endTime = normalizeTime(String(body.end_time ?? ""));
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const recommendation = await loadOwnedEditable(connection, userId, recommendationId, true);
    await validatePreviewPlacement(connection, recommendation, {
      subjectId,
      scheduleTypeId,
      scheduledDate,
      startTime,
      endTime,
    });
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT recommendation_item_id
       FROM weekly_recommendation_item
       WHERE recommendation_id = ? AND subject_id = ? AND schedule_type_id = ?
       LIMIT 1`,
      [recommendationId, subjectId, scheduleTypeId]
    );
    let recommendationItemId = Number(items[0]?.recommendation_item_id ?? 0);
    if (!recommendationItemId) {
      const minutes = durationMinutes(startTime, endTime);
      const maxTarget = scheduleTypeId === REVIEW_SCHEDULE_TYPE_ID
        ? REVIEW_CAP_MINUTES
        : HOMEWORK_CAP_MINUTES;
      const [created] = await connection.query<ResultSetHeader>(
        `INSERT INTO weekly_recommendation_item (
           recommendation_id, subject_id, schedule_type_id,
           current_minutes, raw_target_minutes, max_target_minutes,
           target_minutes, allocated_minutes, difference_minutes,
           primary_action, reasons_json, changes_json
         ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 'create',
           JSON_ARRAY(JSON_OBJECT('code', 'user_added', 'minutes', ?)),
           JSON_ARRAY(JSON_OBJECT('action', 'user_added')))` ,
        [recommendationId, subjectId, scheduleTypeId, minutes, maxTarget, minutes, minutes, minutes, minutes]
      );
      recommendationItemId = created.insertId;
    }
    await connection.query(
      `INSERT INTO weekly_schedule_block (
         recommendation_id, recommendation_item_id, user_id, term_id,
         subject_id, schedule_type_id, scheduled_date, start_time, end_time,
         source, is_user_modified
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user_added', 1)`,
      [
        recommendationId,
        recommendationItemId,
        userId,
        recommendation.term_id,
        subjectId,
        scheduleTypeId,
        scheduledDate,
        startTime,
        endTime,
      ]
    );
    await refreshItemTotals(connection, recommendationId, recommendationItemId);
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
    await loadOwnedEditable(connection, userId, recommendationId, true);
    const [blocks] = await connection.query<WeeklyBlockRow[]>(
      `SELECT * FROM weekly_schedule_block
       WHERE weekly_block_id = ? AND recommendation_id = ? LIMIT 1 FOR UPDATE`,
      [weeklyBlockId, recommendationId]
    );
    const block = blocks[0];
    if (!block) {
      throw new RecommendationServiceError(404, "WEEKLY_BLOCK_NOT_FOUND", "Weekly block was not found");
    }
    await connection.query(
      `DELETE FROM weekly_schedule_block WHERE weekly_block_id = ?`,
      [weeklyBlockId]
    );
    if (block.recommendation_item_id) {
      await refreshItemTotals(connection, recommendationId, block.recommendation_item_id);
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

export const getAcceptedWeeklySchedule = async (
  userId: number,
  weekStart?: string
) => {
  const target = weekStart ?? resolveTargetWeek("manual", new Date()).weekStart;
  const [headers] = await db.query<ExistingRecommendationRow[]>(
    `SELECT recommendation_id, version, status
     FROM weekly_recommendation
     WHERE user_id = ? AND week_start = ? AND status = 'accepted'
     ORDER BY version DESC LIMIT 1`,
    [userId, target]
  );
  const connection = await db.getConnection();
  try {
    const term = await loadCurrentTerm(connection, userId);
    if (!term) {
      throw new RecommendationServiceError(404, "NO_CURRENT_TERM", "No current term found");
    }
    const [classes] = await connection.query<RowDataPacket[]>(
      `SELECT st.schedule_time_id, st.subject_id, s.subject_name,
         st.schedule_type_id, types.schedule_type_name, st.schedule_day,
         TIME_FORMAT(st.start_time, '%H:%i:%s') AS start_time,
         TIME_FORMAT(st.end_time, '%H:%i:%s') AS end_time,
         COALESCE(st.classroom, s.classroom) AS classroom, st.note
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       INNER JOIN schedule_types types
         ON types.schedule_type_id = st.schedule_type_id
       WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
       ORDER BY st.schedule_day, st.start_time`,
      [userId, term.term_id, CLASS_SCHEDULE_TYPE_ID]
    );
    const recommendation = headers[0]
      ? await getRecommendationById(userId, headers[0].recommendation_id)
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

export const safelyGenerateRecommendation = async (
  input: GenerateRecommendationInput
) => {
  try {
    return { recommendation: await generateRecommendation(input), warning: null };
  } catch (error) {
    console.error("generateRecommendation trigger error:", error);
    return {
      recommendation: null,
      warning:
        error instanceof Error
          ? error.message
          : "Recommendation could not be generated",
    };
  }
};

export const generateWeekendRecommendations = async (now = new Date()) => {
  const parts = bangkokDateTimeParts(now);
  if (isoDay(parts.date) !== 7 || parts.hour < 18) return [];
  const { weekStart } = resolveTargetWeek("weekend", now);
  const [users] = await db.query<RowDataPacket[]>(
    `SELECT user_id
     FROM terms
     WHERE term_status = 1
     ORDER BY user_id`
  );
  const results = [];
  for (const row of users) {
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT recommendation_id
       FROM weekly_recommendation
       WHERE user_id = ? AND week_start = ? AND trigger_type = 'weekend'
       LIMIT 1`,
      [row.user_id, weekStart]
    );
    if (existing.length > 0) continue;
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
