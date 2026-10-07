export interface InstructorAssignedSection {
  section_id: number;
  subject_id: string;
  subject_name: string;
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  term_status: "draft" | "active" | "completed" | "archived";
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

export interface InstructorExamResult {
  exam_attempt_id: number;
  section_id: number;
  user_id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  exam_period: "midterm" | "final";
  actual_score: number;
  max_score: number;
  percentage: number;
  weak_topic_count: number;
  submitted_at: string;
}

export interface InstructorWeakTopic {
  bank_result_id: number;
  exam_attempt_id: number;
  section_id: number;
  user_id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  exam_period: "midterm" | "final";
  bank_name: string;
  actual_score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
}

export interface InstructorWorkspaceResponse {
  message: string;
  sections: InstructorAssignedSection[];
  students: InstructorSectionStudent[];
  exam_results: InstructorExamResult[];
  weak_topics: InstructorWeakTopic[];
}

export interface InstructorWorkspaceErrorResponse {
  message?: string;
}
