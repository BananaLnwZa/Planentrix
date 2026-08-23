import type { RowDataPacket } from "mysql2/promise";

export const REVIEW_SCHEDULE_TYPE_ID = 2;
export const HOMEWORK_SCHEDULE_TYPE_ID = 3;
export const CLASS_SCHEDULE_TYPE_ID = 1;
export const RULE_VERSION = "1.0.0";

export type RecommendationTrigger =
  | "weekend"
  | "exam_submitted"
  | "workload_changed"
  | "constraint_changed"
  | "manual";

export type RecommendationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "superseded";

export type RecommendationAction =
  | "create"
  | "increase"
  | "decrease"
  | "keep"
  | "remove"
  | "move"
  | "mixed";

export type BlockSource =
  | "generated"
  | "copied_base"
  | "copied_previous"
  | "user_adjusted"
  | "user_added";

export interface GenerateRecommendationInput {
  userId: number;
  triggerType: RecommendationTrigger;
  now?: Date;
  targetWeekStart?: string;
  examScoreHistoryId?: number | null;
  workloadId?: number | null;
}

export interface TermRow extends RowDataPacket {
  term_id: number;
  user_id: number;
  term: number;
  semester: string;
  academic_year: number;
  start_midterm: string;
  end_midterm: string;
  start_final: string;
  end_final: string;
}

export interface SubjectRuleRow extends RowDataPacket {
  subject_id: string;
  subject_name: string;
  target_gpa: number | string | null;
  total_actual_score: number | string;
  weak_topic_count: number | string;
}

export interface WorkloadRuleRow extends RowDataPacket {
  workload_id: number;
  subject_id: string;
  workload_type_name: string;
  deadline_date: string;
  deadline_time: string;
  workload_status: number;
}

export interface ConstraintRow extends RowDataPacket {
  constraint_id: number;
  day_off: number | null;
  continuous_working_duration: number | null;
  break_minutes: number | null;
  start_time: string | null;
  end_time: string | null;
}

export interface BusyRow extends RowDataPacket {
  recurring_busy_day: number;
  start_time: string;
  end_time: string;
}

export interface BaseBlockRow extends RowDataPacket {
  weekly_block_id: number | null;
  schedule_time_id: number | null;
  subject_id: string;
  schedule_type_id: number;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  source: BlockSource;
  is_user_modified: number;
}

export interface ClassBlockRow extends RowDataPacket {
  schedule_day: number;
  start_time: string;
  end_time: string;
}

export interface RuleReason {
  code: string;
  minutes: number;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface WorkloadDemand {
  workloadId: number;
  workloadType: "assignment" | "project";
  minutes: number;
  deadlineDate: string;
  deadlineTime: string;
  priority: number;
  urgency: "overdue" | "within_2_days" | "within_3_7_days" | "later";
}

export interface RecommendationItemDraft {
  key: string;
  subjectId: string;
  subjectName: string;
  scheduleTypeId: 2 | 3;
  currentMinutes: number;
  baseMinutes: number;
  scoreGapMinutes: number;
  weakTopicMinutes: number;
  examProximityMinutes: number;
  quizFloorMinutes: number;
  workloadMinutes: number;
  deadlineMinutes: number;
  rawTargetMinutes: number;
  maxTargetMinutes: number;
  targetMinutes: number;
  allocatedMinutes: number;
  unallocatedMinutes: number;
  differenceMinutes: number;
  capApplied: boolean;
  capacityLimited: boolean;
  primaryAction: RecommendationAction;
  reasons: RuleReason[];
  workloadDemands: WorkloadDemand[];
  placementDeadline: string | null;
  placementPriority: number;
  recommendationItemId?: number;
}

export interface CandidateSlot {
  date: string;
  day: number;
  startMinute: number;
  endMinute: number;
  key: string;
}

export interface PlannedBlock {
  recommendationId?: number;
  recommendationItemId?: number | null;
  scheduleTimeId: number | null;
  sourceWeeklyBlockId: number | null;
  userId: number;
  termId: number;
  subjectId: string;
  scheduleTypeId: 2 | 3;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  source: BlockSource;
  isUserModified: boolean;
}

export interface RecommendationSummary {
  recommendation_id: number;
  user_id: number;
  term_id: number;
  previous_recommendation_id: number | null;
  week_start: string;
  week_end: string;
  version: number;
  trigger_type: RecommendationTrigger;
  rule_version: string;
  status: RecommendationStatus;
  generated_at: Date;
}

