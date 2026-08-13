export type GradeLetter = "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F";

export interface GradeTerm {
  term_id: number;
  term: number;
  academic_year: number;
  semester: string;
}

export interface GradeWorkload {
  schedule_time_id: number;
  workload_id: number;
  workload_name: string;
  workload_type_id: number;
  workload_type_name: string;
  deadline_date: string;
  deadline_time: string;
  workload_status: string | number | boolean;
  actual_score: number | null;
  max_score: number | null;
}

export interface WorkloadScoreInput {
  actual_score: number;
  max_score: number;
}

export interface SubjectGradeGoal {
  schedule_time_id: number;
  subject_id: string;
  subject_name: string;
  credits: number;
  teacher_name: string;
  target_score: number | null;
  target_grade: GradeLetter | null;
  workloads: GradeWorkload[];
}

export interface SubjectGoalsResponse {
  message: string;
  current_term: GradeTerm;
  total: number;
  saved_goal_count: number;
  goals_locked: boolean;
  data: SubjectGradeGoal[];
}

export interface SaveGradeGoalItem {
  schedule_time_id: number;
  grade: GradeLetter;
}

export interface SaveGradeGoalsRequest {
  goals: SaveGradeGoalItem[];
}

export interface SaveGradeGoalsResponse {
  message: string;
  current_term: GradeTerm;
  goals_locked: true;
  target_gpa: number;
  data: Array<SaveGradeGoalItem & { target_score: number }>;
}

export interface OverallGradeSummary {
  overall_target_gpa: number;
  overall_actual_gpa: number;
  overall_grade: string;
  overall_percent: number;
  max_gpa: number;
}
