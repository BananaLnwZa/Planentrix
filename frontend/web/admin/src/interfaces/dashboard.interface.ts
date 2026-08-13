export interface StudyTimeTrendPoint {
  week_start: string;
  user_count: number;
  total_hours: number;
  average_hours: number;
  total_review_hours: number;
  average_review_hours: number;
}

export interface StudyTimeOverviewResponse {
  message: string;
  summary: {
    active_users: number;
    average_weekly_hours: number;
    total_term_hours: number;
    comparison_percent: number | null;
    average_review_weekly_hours: number;
    total_review_term_hours: number;
    review_comparison_percent: number | null;
  };
  trend: StudyTimeTrendPoint[];
  generated_at: string;
}

export interface DashboardErrorResponse {
  message?: string;
}

export type PopularConstraintKey =
  | "day_off"
  | "continuous_working_duration"
  | "break_duration"
  | "preferred_time_range"
  | "recurring_busy_day";

export interface PopularConstraintApiItem {
  key: PopularConstraintKey;
  value: number | string | null;
  secondary_value: string | null;
  selected_count: number;
  response_count: number;
  percent: number;
}

export interface PopularConstraintsResponse {
  message: string;
  items: PopularConstraintApiItem[];
  generated_at: string;
}

export interface ExamPartRankingItem {
  exam_part_id: number;
  exam_repository_id: number;
  exam_name: string;
  part_order: number;
  exam_part_name: string;
  average_percentage: number;
  attempt_count: number;
  user_count: number;
}

export interface ExamPartRankingsResponse {
  message: string;
  best: ExamPartRankingItem[];
  weakest: ExamPartRankingItem[];
  total_ranked_parts: number;
  generated_at: string;
}

export interface UserYearDistributionItem {
  academic_year: number | null;
  user_count: number;
  percent: number;
}

export interface UserYearDistributionResponse {
  message: string;
  total_users: number;
  distribution: UserYearDistributionItem[];
  generated_at: string;
}

export interface WorkloadCompletionResponse {
  message: string;
  total_count: number;
  completed_count: number;
  pending_count: number;
  overdue_count: number;
  completed_percent: number;
  pending_percent: number;
  generated_at: string;
}

export interface ExamScoreSummaryItem {
  exam_repository_id: number;
  subject_id: string;
  exam_name: string;
  average_percentage: number;
  highest_percentage: number;
  lowest_percentage: number;
  user_count: number;
}

export interface ExamScoreSummariesResponse {
  message: string;
  scores: ExamScoreSummaryItem[];
  generated_at: string;
}

export interface ReviewMethodItem {
  study_type_id: number;
  study_type_name: string;
  total_minutes: number;
  session_count: number;
  user_count: number;
  percent: number;
}

export interface ReviewMethodsResponse {
  message: string;
  total_minutes: number;
  methods: ReviewMethodItem[];
  generated_at: string;
}
