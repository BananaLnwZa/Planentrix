import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  CreateHomeworkInput,
  HomeworkSubject,
  HomeworkTask,
  UpdateHomeworkInput,
} from "@/interfaces/homework.interface";

interface HomeworkApiRow {
  workload_id: number | string;
  schedule_time_id: number | string;
  workload_type_id: number | string;
  workload_type_name?: string;
  subject_id?: string;
  subject_name?: string;
  workload_name?: string;
  deadline_date?: string;
  deadline_time?: string;
  note?: string | null;
}

const pad = (value: number) => value.toString().padStart(2, "0");

const dateValue = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;

const timeValue = (value: Date) =>
  `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;

const parseDeadline = (date: string | undefined, time: string | undefined) => {
  const datePart = (date ?? "").slice(0, 10);
  const timePart = (time ?? "00:00:00").slice(0, 8);
  const parsed = new Date(`${datePart}T${timePart}`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toTask = (row: HomeworkApiRow): HomeworkTask => ({
  workload_id: Number(row.workload_id),
  schedule_time_id: Number(row.schedule_time_id),
  workload_type_id: Number(row.workload_type_id),
  workload_type_name: row.workload_type_name ?? "งาน",
  subject_id: row.subject_id ?? "",
  subject_name: row.subject_name ?? "",
  workload_name: row.workload_name ?? "",
  deadline: parseDeadline(row.deadline_date, row.deadline_time),
  note: row.note ?? "",
});

class HomeworkService {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
      timeout: 10000,
    });
    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("accessToken");
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });
  }

  async getPendingHomework(): Promise<HomeworkTask[]> {
    try {
      const response = await this.apiClient.get<{ data?: HomeworkApiRow[] }>(
        "/user/workload/pending"
      );
      return (response.data.data ?? []).map(toTask).sort(
        (left, right) => left.deadline.getTime() - right.deadline.getTime()
      );
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดรายการงานได้");
    }
  }

  async getSubjects(): Promise<HomeworkSubject[]> {
    try {
      const response = await this.apiClient.get<{ data?: HomeworkSubject[] }>(
        "/user/workload/subjects",
        { params: { schedule_type_id: 1 } }
      );
      return response.data.data ?? [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return [];
      throw this.toError(error, "ไม่สามารถโหลดรายวิชาได้");
    }
  }

  async createHomework(
    input: CreateHomeworkInput,
    subjects: HomeworkSubject[]
  ): Promise<HomeworkTask> {
    try {
      const response = await this.apiClient.post<HomeworkApiRow>(
        "/user/workload/add",
        {
          schedule_time_id: input.schedule_time_id,
          workload_type_id: input.workload_type_id,
          workload_name: input.workload_name.trim(),
          deadline_date: dateValue(input.deadline),
          deadline_time: timeValue(input.deadline),
          note: input.note.trim() || null,
        }
      );
      const subject = subjects.find(
        (item) => item.schedule_time_id === input.schedule_time_id
      );
      return {
        workload_id: Number(response.data.workload_id),
        schedule_time_id: input.schedule_time_id,
        workload_type_id: input.workload_type_id,
        workload_type_name: response.data.workload_type_name ?? "งาน",
        subject_id: subject?.subject_id ?? "",
        subject_name: subject?.subject_name ?? "",
        workload_name: input.workload_name.trim(),
        deadline: input.deadline,
        note: input.note.trim(),
      };
    } catch (error) {
      throw this.toError(error, "ไม่สามารถเพิ่มงานได้");
    }
  }

  async updateHomework(
    task: HomeworkTask,
    input: UpdateHomeworkInput
  ): Promise<HomeworkTask> {
    try {
      await this.apiClient.put(`/user/workload/update/${task.workload_id}`, {
        workload_name: input.workload_name.trim(),
        deadline_date: dateValue(input.deadline),
        deadline_time: timeValue(input.deadline),
        note: input.note.trim() || null,
      });
      return {
        ...task,
        workload_name: input.workload_name.trim(),
        deadline: input.deadline,
        note: input.note.trim(),
      };
    } catch (error) {
      throw this.toError(error, "ไม่สามารถแก้ไขงานได้");
    }
  }

  async deleteHomework(workloadId: number): Promise<void> {
    try {
      await this.apiClient.delete(`/user/workload/delete/${workloadId}`);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถลบงานได้");
    }
  }

  async finishHomework(workloadId: number): Promise<void> {
    try {
      await this.apiClient.put(`/user/workload/finish/${workloadId}`);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถส่งงานได้");
    }
  }

  private toError(error: unknown, fallback: string): Error {
    if (axios.isAxiosError(error)) {
      return new Error(error.response?.data?.message || fallback);
    }
    return error instanceof Error ? error : new Error(fallback);
  }
}

export const homeworkService = new HomeworkService();
export default homeworkService;
