import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  ExamChoicePayload,
  ExamDetailResponse,
  ExamManagementErrorResponse,
  ExamMutationResponse,
  ExamPartPayload,
  ExamPayload,
  ExamQuestionPayload,
  ExamsResponse,
  MessageResponse,
} from "@/interfaces/exam-management.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

class ExamManagementService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);
    this.apiClient.interceptors.request.use((config) => {
      const token = Cookies.get("adminAccessToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  async getExams(): Promise<ExamsResponse> {
    return this.request(() =>
      this.apiClient.get<ExamsResponse>(apiEndpoints.exams.list),
    );
  }

  async getExamDetail(examId: number): Promise<ExamDetailResponse> {
    return this.request(() =>
      this.apiClient.get<ExamDetailResponse>(apiEndpoints.exams.byId(examId)),
    );
  }

  async createExam(data: ExamPayload): Promise<ExamMutationResponse> {
    return this.request(() =>
      this.apiClient.post<ExamMutationResponse>(apiEndpoints.exams.list, data),
    );
  }

  async updateExam(examId: number, data: ExamPayload): Promise<ExamMutationResponse> {
    return this.request(() =>
      this.apiClient.patch<ExamMutationResponse>(apiEndpoints.exams.byId(examId), data),
    );
  }

  async createPart(examId: number, data: ExamPartPayload): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.post<MessageResponse>(apiEndpoints.exams.parts(examId), data),
    );
  }

  async updatePart(partId: number, data: ExamPartPayload): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.patch<MessageResponse>(apiEndpoints.exams.partById(partId), data),
    );
  }

  async deletePart(partId: number): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.delete<MessageResponse>(apiEndpoints.exams.partById(partId)),
    );
  }

  async createQuestion(partId: number, data: ExamQuestionPayload): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.post<MessageResponse>(apiEndpoints.exams.questions(partId), data),
    );
  }

  async updateQuestion(questionId: number, data: ExamQuestionPayload): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.patch<MessageResponse>(apiEndpoints.exams.questionById(questionId), data),
    );
  }

  async deleteQuestion(questionId: number): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.delete<MessageResponse>(apiEndpoints.exams.questionById(questionId)),
    );
  }

  async createChoice(questionId: number, data: ExamChoicePayload): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.post<MessageResponse>(apiEndpoints.exams.choices(questionId), data),
    );
  }

  async updateChoice(choiceId: number, data: ExamChoicePayload): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.patch<MessageResponse>(apiEndpoints.exams.choiceById(choiceId), data),
    );
  }

  async deleteChoice(choiceId: number): Promise<MessageResponse> {
    return this.request(() =>
      this.apiClient.delete<MessageResponse>(apiEndpoints.exams.choiceById(choiceId)),
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
    if (axios.isAxiosError<ExamManagementErrorResponse>(error)) {
      if (error.response?.status === 401) {
        expireAdminSession();
      }
      return new Error(
        error.response?.data?.message ||
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

export const examManagementService = new ExamManagementService();
