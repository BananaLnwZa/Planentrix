export type InstructorExamPeriod = "midterm" | "final";

export interface InstructorSubjectOption {
  subject_id: string;
  subject_name: string;
}

export interface InstructorQuestionBank {
  question_bank_id: number;
  subject_id: string;
  subject_name: string;
  owner_instructor_id: number;
  bank_name: string;
  exam_period: InstructorExamPeriod;
  default_draw_count: number;
  time_limit_minutes: number;
  status: "draft" | "published" | "archived";
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface InstructorExamWorkspaceResponse {
  message: string;
  subjects: InstructorSubjectOption[];
  question_banks: InstructorQuestionBank[];
}

export interface InstructorExamChoice {
  choice_id: number;
  choice_order: number;
  choice_text: string;
  choice_image_path: string | null;
  is_correct: boolean;
}

export interface InstructorExamQuestion {
  question_id: number;
  question_text: string;
  question_image_path: string | null;
  question_score: number;
  choices: InstructorExamChoice[];
}

export interface InstructorQuestionBankDetailResponse {
  message: string;
  question_bank: InstructorQuestionBank;
  questions: InstructorExamQuestion[];
}

export interface UpdateInstructorQuestionRequest {
  question_text: string;
  question_score: number;
  choices: Array<{
    choice_id?: number;
    choice_text: string;
    is_correct: boolean;
  }>;
}

export interface CreateInstructorQuestionBankRequest {
  subject_id: string;
  bank_name: string;
  exam_period: InstructorExamPeriod;
  default_draw_count?: number;
  time_limit_minutes?: number;
}

export interface CreateInstructorQuestionBankResponse {
  message: string;
  question_bank: InstructorQuestionBank;
}

export interface ImportInstructorExamResponse {
  message: string;
  question_bank: {
    id: number;
    name: string;
    period: InstructorExamPeriod;
  };
  total_questions_imported: number;
  questions: Array<{
    question_id: number;
    question_text: string;
    question_image_path: string | null;
    choice_count: number;
  }>;
  warnings: unknown[];
}

export interface InstructorExamMessageResponse {
  message: string;
}

export interface InstructorExamErrorResponse {
  message?: string;
}
