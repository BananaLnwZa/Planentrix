import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  AcademicTermMutationResponse,
  CourseSectionMutationResponse,
  CourseSectionStatus,
  CreateAcademicTermPayload,
  SaveCourseSectionPayload,
  TeachingErrorResponse,
  TeachingMessageResponse,
  TeachingWorkspaceResponse,
} from "@/interfaces/teaching-management.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

class TeachingManagementService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);
    this.apiClient.interceptors.request.use((config) => {
      const token = Cookies.get("accessToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  getWorkspace(): Promise<TeachingWorkspaceResponse> {
    return this.request(() =>
      this.apiClient.get<TeachingWorkspaceResponse>(apiEndpoints.teaching.workspace),
    );
  }

  createAcademicTerm(
    payload: CreateAcademicTermPayload,
  ): Promise<AcademicTermMutationResponse> {
    return this.request(() =>
      this.apiClient.post<AcademicTermMutationResponse>(
        apiEndpoints.teaching.terms,
        payload,
      ),
    );
  }

  createCourseSection(
    payload: SaveCourseSectionPayload,
  ): Promise<CourseSectionMutationResponse> {
    return this.request(() =>
      this.apiClient.post<CourseSectionMutationResponse>(
        apiEndpoints.teaching.sections,
        payload,
      ),
    );
  }

  updateCourseSection(
    sectionId: number,
    payload: SaveCourseSectionPayload,
  ): Promise<TeachingMessageResponse> {
    return this.request(() =>
      this.apiClient.patch<TeachingMessageResponse>(
        apiEndpoints.teaching.sectionById(sectionId),
        payload,
      ),
    );
  }

  updateCourseSectionStatus(
    sectionId: number,
    status: CourseSectionStatus,
  ): Promise<TeachingMessageResponse> {
    return this.request(() =>
      this.apiClient.patch<TeachingMessageResponse>(
        apiEndpoints.teaching.sectionStatus(sectionId),
        { status },
      ),
    );
  }

  private async request<T>(request: () => Promise<{ data: T }>): Promise<T> {
    try {
      const response = await request();
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError<TeachingErrorResponse>(error)) {
      if (error.response?.status === 401) expireAdminSession();
      return new Error(
        error.response?.data?.message ||
          (error.request
            ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
            : error.message) ||
          "เกิดข้อผิดพลาดที่ไม่คาดคิด",
      );
    }
    return error instanceof Error
      ? error
      : new Error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
  }
}

export const teachingManagementService = new TeachingManagementService();
