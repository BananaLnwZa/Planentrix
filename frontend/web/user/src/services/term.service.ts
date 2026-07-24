import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  CurrentTerm,
  CurrentTermResponse,
} from "@/interfaces/profile.interface";

export interface CreateTermRequest {
  term: string;
  semester: string;
  academic_year: string;
  start_midterm: string | null;
  end_midterm: string | null;
  start_final: string | null;
  end_final: string | null;
}

export interface CreateTermResponse {
  message: string;
  term_id: number;
}

export interface EndTermResponse {
  message: string;
  ended_term: CurrentTerm;
}

class TermService {
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
