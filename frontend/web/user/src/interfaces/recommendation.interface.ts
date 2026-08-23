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
  | "move"
  | "remove"
  | "keep";

export interface RecommendationReason {
  code: string;
  minutes: number;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface RecommendationChange {
  action: string;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
}

export interface WeeklyScheduleBlock {
  weekly_block_id: number;
  recommendation_id: number;
  recommendation_item_id: number | null;
  schedule_time_id: number | null;
  source_weekly_block_id: number | null;
  user_id: number;
  term_id: number;
  subject_id: string;
  subject_name: string;
  schedule_type_id: 2 | 3;
  schedule_type_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  source: string;
  is_user_modified: boolean;
}

export interface WeeklyRecommendationItem {
  recommendation_item_id: number;
  recommendation_id: number;
  subject_id: string;
  subject_name: string;
  schedule_type_id: 2 | 3;
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
  cap_applied: boolean;
  capacity_limited: boolean;
  reasons_json: RecommendationReason[];
  changes_json: RecommendationChange[];
  blocks: WeeklyScheduleBlock[];
}

export interface WeeklyRecommendation {
  recommendation_id: number;
  user_id: number;
  term_id: number;
  previous_recommendation_id: number | null;
  exam_score_history_id: number | null;
  workload_id: number | null;
  week_start: string;
  week_end: string;
  version: number;
  trigger_type: RecommendationTrigger;
  rule_version: string;
  status: RecommendationStatus;
  generated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  superseded_at: string | null;
  updated_at: string;
  items: WeeklyRecommendationItem[];
  blocks: WeeklyScheduleBlock[];
}

export interface RecurringClassBlock {
  schedule_time_id: number;
  subject_id: string;
  subject_name: string;
  schedule_type_id: 1;
  schedule_type_name: string;
  schedule_day: number;
  start_time: string;
  end_time: string;
  classroom: string | null;
  note: string | null;
}

export interface AcceptedWeeklySchedule {
  week_start: string;
  week_end: string;
  recurring_classes: RecurringClassBlock[];
  accepted_recommendation: WeeklyRecommendation | null;
  weekly_blocks: WeeklyScheduleBlock[];
}

export interface WeeklyBlockInput {
  subject_id: string;
  schedule_type_id: 2 | 3;
  scheduled_date: string;
  start_time: string;
  end_time: string;
}

export type WeeklyBlockUpdate = Pick<
  WeeklyBlockInput,
  "scheduled_date" | "start_time" | "end_time"
>;
