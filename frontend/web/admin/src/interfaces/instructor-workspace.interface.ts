export interface InstructorAssignedSection {
  section_id: number;
  subject_id: string;
  subject_name: string;
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  section_number: string;
  capacity: number | null;
  section_status: "draft" | "open" | "closed" | "completed" | "cancelled";
  instructor_role: "owner" | "co_instructor";
  student_count: number;
}

export interface InstructorSectionStudent {
  section_id: number;
  subject_id: string;
  section_number: string;
  user_id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  enrollment_status: string;
}

export interface InstructorWorkspaceResponse {
  message: string;
  sections: InstructorAssignedSection[];
  students: InstructorSectionStudent[];
}

export interface InstructorWorkspaceErrorResponse {
  message?: string;
}
