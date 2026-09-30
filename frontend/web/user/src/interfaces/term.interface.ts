export type TermStatus = 0 | 1;

export interface CurrentTerm {
  term_id: number;
  user_id: number;
  term: number;
  academic_year: number;
  semester: string;
  start_midterm: string | null;
  end_midterm: string | null;
  start_final: string | null;
  end_final: string | null;
  term_status: TermStatus;
}

export interface CurrentTermResponse {
  message: string;
  data: CurrentTerm;
}

export interface CreateTermRequest {
  academic_year: number;
  semester: string;
  term: number;
  section_ids: number[];
}

export interface AvailableSectionInstructor {
  instructor_id: number;
  instructor_role: "owner" | "co_instructor";
  first_name: string;
  last_name: string;
  admin_name: string;
}

export interface AvailableSectionMeeting {
  class_meeting_id: number;
  day_of_week:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  start_time: string;
  end_time: string;
  classroom: string | null;
}

export interface AvailableCourseSection {
  section_id: number;
  subject_id: string;
  subject_name: string;
  section_number: string;
  capacity: number | null;
  enrolled_count: number;
  is_full: boolean;
  instructors: AvailableSectionInstructor[];
  meetings: AvailableSectionMeeting[];
}

export interface AvailableTermSubject {
  subject_id: string;
  subject_name: string;
  sections: AvailableCourseSection[];
}

export interface AvailableTermSectionsResponse {
  message: string;
  academic_term_id: number;
  subjects: AvailableTermSubject[];
}

export interface AvailableTermSectionsRequest {
  year_level: number;
  academic_year: number;
  semester_no: number;
}

export interface CreateTermResponse {
  message: string;
  term_id: number;
  user_id: number;
  current_term: CurrentTerm;
  schedule: {
    total_subjects_found: number;
    newly_added: number;
    skipped_count: number;
  };
}

export interface EndTermResponse {
  message: string;
  ended_term: CurrentTerm;
}

export interface PendingSystemEvaluation {
  student_term_id: number;
  academic_year: number;
  semester_no: number;
  completed_at: string | null;
}

export interface SystemEvaluationAnswers {
  satisfaction: number;
  ease_of_use: number;
  usefulness: number;
  comment: string;
}

export interface TermHistoryItem {
  student_term_id: number;
  year_level: number;
  academic_year: number;
  semester_no: number;
  status: "active" | "completed";
  completed_at: string | null;
}
