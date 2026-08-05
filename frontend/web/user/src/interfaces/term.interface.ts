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
  start_midterm: string;
  end_midterm: string;
  start_final: string;
  end_final: string;
}

export interface CreateTermResponse {
  message: string;
  term_id: number;
  user_id: number;
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
