import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  CreateInstructorQuestionBankRequest,
  CreateInstructorQuestionBankResponse,
  ImportInstructorExamResponse,
  InstructorExamErrorResponse,
  InstructorExamMessageResponse,
  InstructorExamWorkspaceResponse,
  InstructorQuestionBankDetailResponse,
  UpdateInstructorQuestionRequest,
} from "@/interfaces/instructor-exam.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

class InstructorExamService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
    });
    this.apiClient.interceptors.request.use((config) => {
      const token = Cookies.get("accessToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  async getWorkspace(): Promise<InstructorExamWorkspaceResponse> {
    return this.request(() =>
      this.apiClient.get<InstructorExamWorkspaceResponse>(
        apiEndpoints.instructorExams.workspace,
      ),
    );
  }

  async createQuestionBank(
    data: CreateInstructorQuestionBankRequest,
  ): Promise<CreateInstructorQuestionBankResponse> {
    return this.request(() =>
      this.apiClient.post<CreateInstructorQuestionBankResponse>(
        apiEndpoints.instructorExams.questionBanks,
        data,
      ),
    );
  }

  async getQuestionBankDetail(
    questionBankId: number,
  ): Promise<InstructorQuestionBankDetailResponse> {
    return this.request(() =>
      this.apiClient.get<InstructorQuestionBankDetailResponse>(
        apiEndpoints.instructorExams.questionBankById(questionBankId),
      ),
    );
  }

  async importExamFile(
    questionBankId: number,
    file: File,
  ): Promise<ImportInstructorExamResponse> {
    const formData = new FormData();
    formData.append("exam_file", file);

    return this.request(() =>
      this.apiClient.post<ImportInstructorExamResponse>(
        apiEndpoints.instructorExams.importFile(questionBankId),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120_000,
        },
      ),
    );
  }

  async deleteQuestionBank(
    questionBankId: number,
  ): Promise<InstructorExamMessageResponse> {
    return this.request(() =>
      this.apiClient.delete<InstructorExamMessageResponse>(
        apiEndpoints.instructorExams.questionBankById(questionBankId),
      ),
    );
  }

  async clearQuestions(
    questionBankId: number,
  ): Promise<InstructorExamMessageResponse> {
    return this.request(() =>
      this.apiClient.delete<InstructorExamMessageResponse>(
        apiEndpoints.instructorExams.questions(questionBankId),
      ),
    );
  }

  async updateQuestion(
    questionBankId: number,
    questionId: number,
    data: UpdateInstructorQuestionRequest,
  ): Promise<InstructorExamMessageResponse> {
    return this.request(() =>
      this.apiClient.patch<InstructorExamMessageResponse>(
        apiEndpoints.instructorExams.questionById(questionBankId, questionId),
        data,
      ),
    );
  }

  async deleteQuestion(
    questionBankId: number,
    questionId: number,
  ): Promise<InstructorExamMessageResponse> {
    return this.request(() =>
      this.apiClient.delete<InstructorExamMessageResponse>(
        apiEndpoints.instructorExams.questionById(questionBankId, questionId),
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
    if (axios.isAxiosError<InstructorExamErrorResponse>(error)) {
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

export const instructorExamService = new InstructorExamService();
export default instructorExamService;
