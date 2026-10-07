import axios, { type AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  GradingMutationResponse,
  InstructorGradingErrorResponse,
  InstructorGradingWorkspaceResponse,
  UpdateGradingDraftRequest,
} from "@/interfaces/instructor-grading.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

class InstructorGradingService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);
    this.apiClient.interceptors.request.use((config) => {
      const token = Cookies.get("accessToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  getWorkspace(): Promise<InstructorGradingWorkspaceResponse> {
    return this.request(() =>
      this.apiClient.get<InstructorGradingWorkspaceResponse>(
        apiEndpoints.instructorGrading.workspace,
      ),
    );
  }

  createDraft(subjectId: string): Promise<GradingMutationResponse> {
    return this.request(() =>
      this.apiClient.post<GradingMutationResponse>(
        apiEndpoints.instructorGrading.schemes,
        { subject_id: subjectId },
      ),
    );
  }

  updateDraft(
    schemeId: number,
    data: UpdateGradingDraftRequest,
  ): Promise<GradingMutationResponse> {
    return this.request(() =>
      this.apiClient.patch<GradingMutationResponse>(
        apiEndpoints.instructorGrading.byId(schemeId),
        data,
      ),
    );
  }

  publish(schemeId: number): Promise<GradingMutationResponse> {
    return this.request(() =>
      this.apiClient.post<GradingMutationResponse>(
        apiEndpoints.instructorGrading.publish(schemeId),
      ),
    );
  }

  private async request<T>(request: () => Promise<{ data: T }>): Promise<T> {
    try {
      const response = await request();
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError<InstructorGradingErrorResponse>(error)) {
        if (error.response?.status === 401) expireAdminSession();
        throw new Error(
          error.response?.data?.message ||
            (error.request
              ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
              : error.message) ||
            "เกิดข้อผิดพลาดที่ไม่คาดคิด",
        );
      }
      throw error instanceof Error
        ? error
        : new Error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
  }
}

export const instructorGradingService = new InstructorGradingService();
