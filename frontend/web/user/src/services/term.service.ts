import axios from "axios";
import type {
  AvailableTermSectionsRequest,
  AvailableTermSectionsResponse,
  CreateTermRequest,
  CreateTermResponse,
  CurrentTerm,
  CurrentTermResponse,
  EndTermResponse,
  PendingSystemEvaluation,
  SystemEvaluationAnswers,
} from "@/interfaces/term.interface";
import { authenticatedApiClient } from "./api.client";

class TermService {
  private readonly apiClient = authenticatedApiClient;

  async getCurrentTerm(): Promise<CurrentTerm | null> {
    try {
      const response = await this.apiClient.get<CurrentTermResponse>(
        "/user/terms/current"
      );
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw this.toError(error, "Unable to load current term");
    }
  }

  async createTerm(data: CreateTermRequest): Promise<CreateTermResponse> {
    try {
      const response = await this.apiClient.post<CreateTermResponse>(
        "/user/terms/add",
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to create term");
    }
  }

  async getAvailableSections(
    params: AvailableTermSectionsRequest,
  ): Promise<AvailableTermSectionsResponse> {
    try {
      const response = await this.apiClient.get<AvailableTermSectionsResponse>(
        "/user/terms/available-sections",
        { params },
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดกลุ่มเรียนที่เปิดอยู่ได้");
    }
  }

  async endCurrentTerm(): Promise<EndTermResponse> {
    try {
      const response = await this.apiClient.put<EndTermResponse>(
        "/user/terms/end"
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to end current term");
    }
  }

  async getPendingSystemEvaluation(): Promise<PendingSystemEvaluation | null> {
    try {
      const response = await this.apiClient.get<{ data: PendingSystemEvaluation | null }>(
        "/user/terms/evaluation/pending"
      );
      return response.data.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดแบบประเมินระบบได้");
    }
  }

  async submitSystemEvaluation(studentTermId: number, responses: SystemEvaluationAnswers): Promise<void> {
    try {
      await this.apiClient.post("/user/terms/evaluation", {
        student_term_id: studentTermId,
        responses,
      });
    } catch (error) {
      throw this.toError(error, "ส่งแบบประเมินไม่สำเร็จ");
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

export const termService = new TermService();
export default termService;
