import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  AdminAuthErrorResponse,
  LoginAdminRequest,
  LoginAdminResponse,
  LogoutAdminResponse,
  RegisterAdminRequest,
  RegisterAdminResponse,
} from "@/interfaces/auth.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";

class AdminAuthService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);

    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("adminAccessToken");

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

  async login(data: LoginAdminRequest): Promise<LoginAdminResponse> {
    try {
      const response = await this.apiClient.post<LoginAdminResponse>(
        apiEndpoints.auth.login,
        data,
      );

      if (response.data.role !== "admin") {
        throw new Error("This account does not have administrator access.");
      }

      Cookies.set("adminAccessToken", response.data.accessToken, {
        expires: 1,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  getAccessToken(): string | undefined {
    return Cookies.get("adminAccessToken");
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

  clearAuth(): void {
    Cookies.remove("adminAccessToken");
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError<AdminAuthErrorResponse>(error)) {
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
