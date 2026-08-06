import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  AddScheduleRequest,
  AddScheduleResponse,
  CurrentScheduleResponse,
  CurrentTermSubjectsResponse,
  DeleteScheduleResponse,
  ScheduleItem,
  ScheduleDetailResponse,
  UpdateScheduleRequest,
  UpdateScheduleResponse,
} from "@/interfaces/table.interface";

class TableService {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
      timeout: 10000,
    });

    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("accessToken");
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    });
  }

  async getCurrentSchedule(): Promise<CurrentScheduleResponse | null> {
    try {
      const response = await this.apiClient.get<CurrentScheduleResponse>(
        "/user/schedule"
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw this.toError(error, "Unable to load schedule");
    }
  }

  async getScheduleDetail(scheduleTimeId: number): Promise<ScheduleItem> {
    try {
      const response = await this.apiClient.get<ScheduleDetailResponse>(
        `/user/schedule/detail/${scheduleTimeId}`
      );
      return response.data.data;
    } catch (error) {
      throw this.toError(error, "Unable to load schedule details");
    }
  }

  async getCurrentTermSubjects(): Promise<CurrentTermSubjectsResponse> {
    try {
      const response = await this.apiClient.get<CurrentTermSubjectsResponse>(
        "/user/schedule/subjects"
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to load current term subjects");
    }
  }

  async addSchedule(data: AddScheduleRequest): Promise<AddScheduleResponse> {
    try {
      const response = await this.apiClient.post<AddScheduleResponse>(
        "/user/schedule/add-time",
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to add schedule block");
    }
  }

  async updateSchedule(
    scheduleTimeId: number,
    data: UpdateScheduleRequest
  ): Promise<UpdateScheduleResponse> {
    try {
      const response = await this.apiClient.put<UpdateScheduleResponse>(
        `/user/schedule/edit/${scheduleTimeId}`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to update schedule");
    }
  }

  async deleteSchedule(scheduleTimeId: number): Promise<DeleteScheduleResponse> {
    try {
      const response = await this.apiClient.delete<DeleteScheduleResponse>(
        `/user/schedule/${scheduleTimeId}`
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to delete schedule");
    }
  }

  private toError(error: unknown, fallbackMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message || fallbackMessage);
    }
    return error instanceof Error ? error : new Error(fallbackMessage);
  }
}

export const tableService = new TableService();
export default tableService;
