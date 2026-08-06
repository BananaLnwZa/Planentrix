import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  SaveGradeGoalsRequest,
  SaveGradeGoalsResponse,
  SubjectGoalsResponse,
} from "@/interfaces/grade.interface";

class GradeService {
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

  async getSubjectGoals(): Promise<SubjectGoalsResponse | null> {
    try {
      const response = await this.apiClient.get<SubjectGoalsResponse>(
        "/user/grade/goals"
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw this.toError(error, "ไม่สามารถโหลดข้อมูลคะแนนได้");
    }
  }

  async saveGradeGoals(
    data: SaveGradeGoalsRequest
  ): Promise<SaveGradeGoalsResponse> {
    try {
      const response = await this.apiClient.post<SaveGradeGoalsResponse>(
        "/user/grade/goals",
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถบันทึกเป้าหมายเกรดได้");
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

export const gradeService = new GradeService();
export default gradeService;
