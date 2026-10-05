export interface HomeworkSubject {
  schedule_time_id: number;
  subject_id: string;
  subject_name: string;
  teacher_name: string;
}

export interface HomeworkTypeOption {
  id: number;
  code: string;
  name: string;
}

export interface HomeworkTask {
  workload_id: number;
  schedule_time_id: number;
  workload_type_id: number;
  workload_type_code: string;
  workload_type_name: string;
  subject_id: string;
  subject_name: string;
  workload_name: string;
  deadline: Date;
  note: string;
}

export interface HomeworkOverview {
  tasks: HomeworkTask[];
  hasCurrentTerm: boolean;
  hasWorkloads: boolean;
}

export interface CreateHomeworkInput {
  schedule_time_id: number;
  workload_type_id: number;
  workload_name: string;
  deadline: Date;
  note: string;
}

export interface UpdateHomeworkInput {
  workload_name: string;
  deadline: Date;
  note: string;
}

export type HomeworkSectionType = "tomorrow" | "date" | "overdue";

export interface HomeworkSectionData {
  title: string;
  type: HomeworkSectionType;
  tasks: HomeworkTask[];
}
