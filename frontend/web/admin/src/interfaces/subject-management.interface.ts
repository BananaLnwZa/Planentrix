export interface SubjectType {
  subject_type_id: number;
  subject_type_name: string;
}

export interface Subject {
  subject_id: string;
  subject_name: string;
  credits: number;
  classroom: string;
  teacher_name: string;
  schedule_day: number;
  start_time: string;
  end_time: string;
  term: number;
  academic_year: number;
  subject_type_id: number;
  subject_type_name: string;
  is_active: boolean;
}

export interface SubjectPayload {
  subject_id?: string;
  subject_name: string;
  credits: number;
  classroom: string;
  teacher_name: string;
  schedule_day: number;
  start_time: string;
  end_time: string;
  term: number;
  academic_year: number;
  subject_type_id: number;
}

export interface SubjectsResponse {
  message: string;
  subjects: Subject[];
  subject_types: SubjectType[];
}

export interface SubjectMutationResponse {
  message: string;
  subject: Subject;
}

export interface SubjectManagementErrorResponse {
  message: string;
  references?: {
    schedule_count: number;
    exam_count: number;
  };
}
