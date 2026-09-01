import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  DeleteSubjectTypeResponse,
  SubjectTypeErrorResponse,
  SubjectTypeMutationResponse,
  SubjectTypePayload,
  SubjectTypesResponse,
} from "@/interfaces/subject-type-management.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

class SubjectTypeManagementService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);
    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("adminAccessToken");
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });
  }

  async getSubjectTypes(): Promise<SubjectTypesResponse> {
    try {
      const response = await this.apiClient.get<SubjectTypesResponse>(
        apiEndpoints.subjectTypes.list,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async createSubjectType(
    data: SubjectTypePayload,
  ): Promise<SubjectTypeMutationResponse> {
    try {
      const response = await this.apiClient.post<SubjectTypeMutationResponse>(
        apiEndpoints.subjectTypes.list,
        data,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async updateSubjectType(
    subjectTypeId: number,
    data: SubjectTypePayload,
  ): Promise<SubjectTypeMutationResponse> {
    try {
      const response = await this.apiClient.patch<SubjectTypeMutationResponse>(
        apiEndpoints.subjectTypes.byId(subjectTypeId),
        data,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async deleteSubjectType(
    subjectTypeId: number,
  ): Promise<DeleteSubjectTypeResponse> {
    try {
      const response = await this.apiClient.delete<DeleteSubjectTypeResponse>(
        apiEndpoints.subjectTypes.byId(subjectTypeId),
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError<SubjectTypeErrorResponse>(error)) {
      if (error.response?.status === 401) {
        expireAdminSession();
      }

      const response = error.response?.data;
      const message = response?.subject_count
        ? `${response.message} (${response.subject_count} วิชา)`
        : response?.message;

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

export const subjectTypeManagementService = new SubjectTypeManagementService();
