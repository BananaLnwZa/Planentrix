import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  SubjectManagementErrorResponse,
  SubjectMutationResponse,
  SubjectPayload,
  SubjectsResponse,
} from "@/interfaces/subject-management.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";

class SubjectManagementService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);
    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("adminAccessToken");
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });
  }

  async getSubjects(): Promise<SubjectsResponse> {
    try {
      const response = await this.apiClient.get<SubjectsResponse>(
        apiEndpoints.subjects.list,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async createSubject(data: SubjectPayload): Promise<SubjectMutationResponse> {
    try {
      const response = await this.apiClient.post<SubjectMutationResponse>(
        apiEndpoints.subjects.list,
        data,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async updateSubject(
    subjectId: string,
    data: SubjectPayload,
  ): Promise<SubjectMutationResponse> {
    try {
      const response = await this.apiClient.patch<SubjectMutationResponse>(
        apiEndpoints.subjects.byId(subjectId),
        data,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async deactivateSubject(subjectId: string): Promise<SubjectMutationResponse> {
    try {
      const response = await this.apiClient.delete<SubjectMutationResponse>(
        apiEndpoints.subjects.byId(subjectId),
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async setSubjectStatus(
    subjectId: string,
    isActive: boolean,
  ): Promise<SubjectMutationResponse> {
    try {
      const response = await this.apiClient.patch<SubjectMutationResponse>(
        apiEndpoints.subjects.status(subjectId),
        { is_active: isActive },
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError<SubjectManagementErrorResponse>(error)) {
      if (error.response?.status === 401) {
        Cookies.remove("adminAccessToken");
        Cookies.remove("adminName");
        Cookies.remove("adminId");
      }

      const response = error.response?.data;
      let message = response?.message;
      if (response?.references) {
        const { schedule_count: schedules, exam_count: exams } = response.references;
        message = `${message} (ตารางเรียน ${schedules} รายการ, คลังข้อสอบ ${exams} รายการ)`;
      }

      return new Error(
        message ||
          (error.request
            ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ผู้ดูแลระบบได้"
            : error.message) ||
          "เกิดข้อผิดพลาดที่ไม่คาดคิด",
      );
    }

    return error instanceof Error
      ? error
      : new Error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
  }
}

export const subjectManagementService = new SubjectManagementService();
