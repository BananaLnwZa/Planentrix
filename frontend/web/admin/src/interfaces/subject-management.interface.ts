export interface SubjectType {
  subject_type_id: number;
  subject_type_name: string;
}

export interface Subject {
  subject_id: string;
  subject_name: string;
  credits: number;
  subject_type_id: number;
  subject_type_name: string;
  is_active: boolean;
}

export interface CurriculumSubject extends Subject {
  curriculum_subject_id: number;
  term: number;
  academic_year: number;
  department_id: number;
  department_code: string;
  department_name: string;
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  is_required: boolean;
  subject_is_active: boolean;
  curriculum_is_active: boolean;
}

export interface SubjectPayload {
  subject_id?: string;
  subject_name: string;
  credits: number;
  subject_type_id: number;
}

export interface CurriculumSubjectPayload {
  subject_id?: string;
  department_id: number;
  academic_year: number;
  term: number;
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
  curriculum_subjects: CurriculumSubject[];
  subject_types: SubjectType[];
  faculties: SubjectFaculty[];
  departments: SubjectDepartment[];
}

export interface SubjectMutationResponse {
  message: string;
  subject: Subject;
}

export interface CurriculumSubjectMutationResponse {
  message: string;
  subject: CurriculumSubject;
}

export interface SubjectManagementErrorResponse {
  message: string;
  references?: {
    schedule_count: number;
    exam_count: number;
  };
}
