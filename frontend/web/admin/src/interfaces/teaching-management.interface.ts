export type AcademicTermStatus = "draft" | "active" | "completed" | "archived";
export type CourseSectionStatus =
  | "draft"
  | "open"
  | "closed"
  | "completed"
  | "cancelled";

export interface TeachingAcademicTerm {
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  start_date: string;
  end_date: string;
  midterm_start_date: string | null;
  midterm_end_date: string | null;
  final_start_date: string | null;
  final_end_date: string | null;
  status: AcademicTermStatus;
}

export interface TeachingSubject {
  subject_id: string;
  subject_name: string;
  department_ids: number[];
}

export interface TeachingInstructor {
  admin_id: number;
  admin_name: string;
  first_name: string;
  last_name: string;
  department_id: number;
  department_name: string;
  faculty_name: string;
}

export interface SectionInstructor {
  section_id: number;
  instructor_id: number;
  instructor_role: "owner" | "co_instructor";
  admin_name: string;
  first_name: string;
  last_name: string;
  department_name: string | null;
}

export interface TeachingCourseSection {
  section_id: number;
  subject_id: string;
  subject_name: string;
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  section_number: string;
  capacity: number | null;
  status: CourseSectionStatus;
  created_at: string;
  updated_at: string;
  instructors: SectionInstructor[];
}

export interface TeachingWorkspaceResponse {
  message: string;
  academic_terms: TeachingAcademicTerm[];
  subjects: TeachingSubject[];
  instructors: TeachingInstructor[];
  sections: TeachingCourseSection[];
}

export interface CreateAcademicTermPayload {
  academic_year: number;
  semester_no: number;
  start_date: string;
  end_date: string;
  midterm_start_date: string | null;
  midterm_end_date: string | null;
  final_start_date: string | null;
  final_end_date: string | null;
  status: "draft" | "active";
}

export interface SaveCourseSectionPayload {
  subject_id: string;
  academic_term_id: number;
  section_number: string;
  capacity: number | null;
  status: CourseSectionStatus;
  owner_instructor_id: number;
  co_instructor_ids: number[];
}

export interface TeachingMessageResponse {
  message: string;
}

export interface AcademicTermMutationResponse extends TeachingMessageResponse {
  academic_term: TeachingAcademicTerm;
}

export interface CourseSectionMutationResponse extends TeachingMessageResponse {
  section_id?: number;
}

export interface TeachingErrorResponse {
  message?: string;
}
