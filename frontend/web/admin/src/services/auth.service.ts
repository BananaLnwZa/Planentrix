import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  AdminAuthErrorResponse,
  AdminProfileResponse,
  LogoutAdminResponse,
  RegisterAdminRequest,
  RegisterAdminResponse,
} from "@/interfaces/auth.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { clearAdminSession, expireAdminSession } from "@/services/admin-session.client";

class AdminAuthService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);

    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("accessToken");

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    });
  }

  async register(data: RegisterAdminRequest): Promise<RegisterAdminResponse> {
    try {
      const response = await this.apiClient.post<RegisterAdminResponse>(
        apiEndpoints.auth.register,
        data,
      );

      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  getAccessToken(): string | undefined {
    return Cookies.get("accessToken");
  }

  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  }

  async logout(): Promise<LogoutAdminResponse> {
    try {
      const response = await this.apiClient.post<LogoutAdminResponse>(
        apiEndpoints.auth.logout,
      );

      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    } finally {
      this.clearAuth();
    }
  }

  async getProfile(): Promise<AdminProfileResponse> {
    try {
      const response = await this.apiClient.get<AdminProfileResponse>(
        apiEndpoints.auth.profile,
      );

      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  clearAuth(): void {
    clearAdminSession();
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError<AdminAuthErrorResponse>(error)) {
      if (error.response?.status === 401 && this.isAuthenticated()) {
        expireAdminSession();
      }
      const message =
        error.response?.data?.message ||
        (error.request
          ? "Unable to connect to the admin server. Please try again."
          : error.message) ||
        "An unexpected error occurred";

      return new Error(message);
    }

    return error instanceof Error
      ? error
      : new Error("An unexpected error occurred");
  }
}

export const adminAuthService = new AdminAuthService();
export default adminAuthService;
