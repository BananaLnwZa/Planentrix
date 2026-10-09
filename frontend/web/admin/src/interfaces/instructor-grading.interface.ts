export type GradeCode = "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F";

export interface InstructorGradingSubject {
  subject_id: string;
  subject_name: string;
  section_count: number;
  can_manage: boolean;
  has_draft_term: boolean;
  has_active_term: boolean;
}

export interface GradeBoundary {
  grade_boundary_id: number;
  grading_scheme_id: number;
  grade_code: GradeCode;
  minimum_percentage: number;
  display_order: number;
}

export interface InstructorGradingScheme {
  grading_scheme_id: number;
  subject_id: string;
  instructor_id: number;
  source_scheme_id: number | null;
  version: number;
  status: "draft" | "published" | "archived";
  created_by_admin_id: number;
  updated_by_admin_id: number | null;
  published_by_admin_id: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  boundaries: GradeBoundary[];
}

export interface InstructorGradingWorkspaceResponse {
  message: string;
  subjects: InstructorGradingSubject[];
  grading_schemes: InstructorGradingScheme[];
  grade_codes: GradeCode[];
}

export interface GradingMutationResponse {
  message: string;
  grading_scheme_id?: number;
  version?: number;
}

export interface UpdateGradingDraftRequest {
  boundaries: Array<{
    grade_code: GradeCode;
    minimum_percentage: number;
  }>;
}

export interface InstructorGradingErrorResponse {
  message?: string;
}
