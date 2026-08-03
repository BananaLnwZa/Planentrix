export interface ExamSubjectOption {
  subject_id: string;
  subject_name: string;
  academic_year: number;
  term: number;
}

export interface ExamSummary {
  exam_repository_id: number;
  subject_id: string;
  subject_name: string;
  exam_name: string;
  total_score: number;
  total_question: number;
  time_limit: number;
  admin_id: number;
  admin_name: string;
  academic_year: number;
  term: number;
  subject_is_active: boolean;
  part_count: number;
  attempt_count: number;
}

export interface ExamChoice {
  choice_id: number;
  question_id: number;
  choice_order: number;
  choice_text: string;
  is_correct: boolean;
}

export interface ExamQuestion {
  question_id: number;
  exam_part_id: number;
  question_order: number;
  question_text: string;
  question_score: number;
  choices: ExamChoice[];
}

export interface ExamPart {
  exam_part_id: number;
  exam_repository_id: number;
  part_order: number;
  exam_part_name: string;
  total_question: number;
  part_score: number;
  questions: ExamQuestion[];
}

export interface ExamDetail extends ExamSummary {
  parts: ExamPart[];
}

export interface ExamsResponse {
  message: string;
  exams: ExamSummary[];
  subjects: ExamSubjectOption[];
}

export interface ExamDetailResponse {
  message: string;
  exam: ExamDetail;
}

export interface ExamMutationResponse {
  message: string;
  exam: ExamSummary;
}

export interface MessageResponse {
  message: string;
}

export interface ExamPayload {
  subject_id: string;
  exam_name: string;
  time_limit: number;
}

export interface ExamPartPayload {
  part_order: number;
  exam_part_name: string;
}

export interface ExamQuestionPayload {
  question_order: number;
  question_text: string;
  question_score: number;
}

export interface ExamChoicePayload {
  choice_order: number;
  choice_text: string;
  is_correct: boolean;
}

export interface ExamManagementErrorResponse {
  message: string;
}
