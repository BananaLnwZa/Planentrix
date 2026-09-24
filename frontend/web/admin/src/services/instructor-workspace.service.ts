import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  InstructorWorkspaceErrorResponse,
  InstructorWorkspaceResponse,
} from "@/interfaces/instructor-workspace.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

class InstructorWorkspaceService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);
    this.apiClient.interceptors.request.use((config) => {
      const token = Cookies.get("accessToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  async getDashboard(): Promise<InstructorWorkspaceResponse> {
    try {
      const response = await this.apiClient.get<InstructorWorkspaceResponse>(
        apiEndpoints.instructorWorkspace.dashboard,
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError<InstructorWorkspaceErrorResponse>(error)) {
        if (error.response?.status === 401) expireAdminSession();
        throw new Error(
          error.response?.data?.message ||
            (error.request
              ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
              : error.message),
        );
      }
      throw error instanceof Error
        ? error
        : new Error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
  }
}

export const instructorWorkspaceService = new InstructorWorkspaceService();
