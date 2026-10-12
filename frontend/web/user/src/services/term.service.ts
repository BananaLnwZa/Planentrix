import axios from "axios";
import type {
  AvailableTermSectionsRequest,
  AvailableTermSectionsResponse,
  CreateTermRequest,
  CreateTermResponse,
  CurrentTerm,
  CurrentTermResponse,
  EndTermResponse,
  TermHistoryItem,
  TermWorkflow,
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

  async getWorkflow(): Promise<TermWorkflow | null> {
    try {
      const response = await this.apiClient.get<{ data: TermWorkflow | null }>(
        "/user/terms/workflow",
      );
      return response.data.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถตรวจสอบโฟลวของเทอมได้");
    }
  }

  async acknowledgeMidtermFollowup(): Promise<void> {
    try {
      await this.apiClient.post("/user/terms/workflow/midterm-followup/acknowledge");
    } catch (error) {
      throw this.toError(error, "ไม่สามารถบันทึกการแจ้งเตือนได้");
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

  async getTermHistory(): Promise<TermHistoryItem[]> {
    try {
      const response = await this.apiClient.get<{ data: TermHistoryItem[] }>(
        "/user/terms/history"
      );
      return response.data.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดประวัติเทอมได้");
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
