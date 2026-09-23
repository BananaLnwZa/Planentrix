export interface SubjectType {
  subject_type_id: number;
  subject_type_name: string;
}

export interface Subject {
  curriculum_subject_id: number;
  subject_id: string;
  subject_name: string;
  credits: number;
  term: number;
  academic_year: number;
  subject_type_id: number;
  subject_type_name: string;
  department_id: number;
  department_code: string;
  department_name: string;
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  is_required: boolean;
  is_active: boolean;
}

export interface SubjectPayload {
  subject_id?: string;
  curriculum_subject_id?: number;
  subject_name: string;
  credits: number;
  term: number;
  academic_year: number;
  subject_type_id: number;
  department_id: number;
  is_required: boolean;
}

export interface SubjectFaculty {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
}

export interface SubjectDepartment {
  department_id: number;
  department_code: string;
  department_name: string;
  faculty_id: number;
}

export interface SubjectsResponse {
  message: string;
  subjects: Subject[];
  subject_types: SubjectType[];
  faculties: SubjectFaculty[];
  departments: SubjectDepartment[];
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
