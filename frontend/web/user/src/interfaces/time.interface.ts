export type StudySessionStatus =
  | "running"
  | "paused"
  | "completed"
  | "interrupted"
  | "cancelled";

export type RecoveryAction =
  | "continue"
  | "finish_last_seen"
  | "finish_now"
  | "save_interrupted"
  | "cancel";

export interface TimerSubject {
  schedule_time_id: number;
  subject_id: string;
  subject_name: string;
  teacher_name: string | null;
}

export interface TimerTerm {
  term_id: number;
  term: number;
  semester: string;
  academic_year: number;
  created_at: string;
}

export interface TimerPolicy {
  hard_limit_seconds: number;
  stale_after_seconds: number;
}

export interface StudySession {
  study_time_id: number;
  schedule_time_id: number;
  subject_id: string;
  subject_name: string;
  start_time: string;
  end_time: string | null;
  time_spent: number | null;
  session_status: StudySessionStatus;
  running_since: string | null;
  accumulated_seconds: number;
  last_seen_at: string | null;
  version: number;
  updated_at: string;
  elapsed_seconds: number;
  is_stale: boolean;
  server_time: string;
  hard_limit_seconds: number;
}

export interface TimerSetupResponse {
  message: string;
  current_term: TimerTerm;
  subjects: TimerSubject[];
  timer_policy: TimerPolicy;
}

export interface ActiveSessionResponse {
  message: string;
  data: StudySession | null;
  requires_recovery: boolean;
}

export interface SessionResponse {
  message: string;
  data: StudySession;
}

export interface TimeApiErrorPayload {
  code?: string;
  message?: string;
  data?: StudySession;
}

export interface StudyWeek {
  week_number: number;
  week_start: string;
  total_minutes: number;
}

export interface WeeklySubjectStudy {
  subject_id: string;
  subject_name: string;
  total_minutes: number;
}

export interface SubjectStudyHistory {
  subject_id: string;
  subject_name: string;
  total_minutes: number;
  session_count: number;
}

export interface MonthlyStudyWeek {
  week_number: number;
  total_minutes: number;
  session_count: number;
}

export interface MonthlyStudyHistory {
  month_key: string;
  total_minutes: number;
  session_count: number;
  subjects: SubjectStudyHistory[];
  weeks?: MonthlyStudyWeek[];
}

export interface StudyDashboard {
  message: string;
  current_term: TimerTerm;
  summary: {
    current_week_minutes: number;
    total_term_minutes: number;
    average_weekly_minutes: number;
    average_monthly_minutes: number;
  };
  weeks: StudyWeek[];
  weekly_subjects: WeeklySubjectStudy[];
  history: MonthlyStudyHistory[];
}

export interface StartStudySessionRequest {
  schedule_time_id: number;
}

export interface SessionVersionRequest {
  version: number;
}

export interface RecoverStudySessionRequest extends SessionVersionRequest {
  action: RecoveryAction;
}
