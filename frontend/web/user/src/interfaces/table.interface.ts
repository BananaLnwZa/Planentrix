export type ScheduleTypeId = 1 | 2 | 3;

export interface ScheduleTerm {
  term_id: number;
  term: number;
  academic_year: number;
  semester: string;
}

export interface ScheduleItem {
  schedule_time_id: number;
  schedule_type_id: ScheduleTypeId;
  schedule_type_name: string;
  subject_id: string;
  subject_name: string;
  teacher_name: string;
  credits: number;
  schedule_day: number;
  start_time: string;
  end_time: string;
  classroom: string | null;
  note: string | null;
}

export interface DisplayScheduleItem
  extends Omit<ScheduleItem, "schedule_time_id"> {
  schedule_time_id: number | null;
  display_id: string;
  source: "recurring" | "weekly";
  weekly_block_id: number | null;
  recommendation_id: number | null;
  scheduled_date: string | null;
  is_user_modified: boolean;
}

export interface ScheduleSubject {
  subject_id: string;
  subject_name: string;
}

export interface CurrentScheduleResponse {
  message: string;
  user_id: number;
  current_term: ScheduleTerm;
  total: number;
  data: ScheduleItem[];
}

export interface ScheduleDetailResponse {
  message: string;
  data: ScheduleItem;
}

export interface CurrentTermSubjectsResponse {
  message: string;
  current_term: ScheduleTerm;
  total: number;
  data: ScheduleSubject[];
}

export interface AddScheduleRequest {
  schedule_type_id: 2 | 3;
  subject_id: string;
  schedule_day: number;
  start_time: string;
  end_time: string;
}

export interface AddScheduleResponse extends AddScheduleRequest {
  message: string;
  schedule_time_id: number;
  user_id: number;
  term_id: number;
  subject_name: string;
}

export interface UpdateScheduleRequest {
  schedule_day: number;
  start_time: string;
  end_time: string;
  classroom?: string | null;
  note?: string | null;
}

export interface UpdateScheduleResponse {
  message: string;
  schedule_time_id: number;
  user_id: number;
  updated_data: {
    schedule_day: number;
    start_time: string;
    end_time: string;
    classroom: string | null;
    note: string | null;
  };
}

export interface DeleteScheduleResponse {
  message: string;
  schedule_time_id: number;
  user_id: number;
  deleted_data: {
    schedule_time_id: number;
    term_id: number;
    user_id: number;
    schedule_type_id: ScheduleTypeId;
    subject_id: string;
    schedule_day: number;
    start_time: string;
    end_time: string;
    classroom: string | null;
    target_score: number | null;
    note: string | null;
  };
}
