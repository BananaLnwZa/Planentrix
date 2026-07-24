import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  DeleteAccountResponse,
  ApiResponse,
  ApiErrorResponse,
  UpdateConstraintRequest,
  UpdateConstraintResponse,
} from "@/interfaces/auth.interface";

/**
 * Auth Service
 * Handles all authentication-related API calls
 */
class AuthService {
  private apiClient: AxiosInstance;
  private readonly baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  private readonly authEndpoint = "/user/auth";

  constructor() {
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include access token
    this.apiClient.interceptors.request.use(
      (config) => {
        const accessToken = Cookies.get("accessToken");
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Web sessions do not use refresh tokens. Expired sessions must log in again.
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          Cookies.remove("accessToken");

          if (
            typeof window !== "undefined" &&
            window.location.pathname !== "/LogIn"
          ) {
            window.location.href = "/LogIn";
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<ApiResponse> {
    try {
      const response = await this.apiClient.post<ApiResponse>(
        `${this.authEndpoint}/register`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.apiClient.post<LoginResponse>(
        `${this.authEndpoint}/login`,
        { ...data, platform: "web" }
      );

      // Save the web access token to a cookie.
      const { accessToken } = response.data;
      
      Cookies.set("accessToken", accessToken, {
        expires: 1, // 1 day for web
        secure: true,
        sameSite: "Strict",
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const response = await this.apiClient.post<LogoutResponse>(
        `${this.authEndpoint}/logout`
      );

      // Clear the web access token from cookies
      Cookies.remove("accessToken");

      return response.data;
    } catch (error) {
      // Clear the token even if the request fails
      Cookies.remove("accessToken");
      throw this.handleError(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<DeleteAccountResponse> {
    try {
      const response = await this.apiClient.delete<DeleteAccountResponse>(
        `${this.authEndpoint}/me`
      );

      // Clear the web access token from cookies
      Cookies.remove("accessToken");

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get access token from cookies
   */
  getAccessToken(): string | undefined {
    return Cookies.get("accessToken");
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Update user constraints (working hours, breaks, busy times)
   */
  async updateConstraints(data: UpdateConstraintRequest): Promise<UpdateConstraintResponse> {
    try {
      const response = await this.apiClient.patch<UpdateConstraintResponse>(
        `${this.authEndpoint}/constraints`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Clear all auth data
   */
  clearAuth(): void {
    Cookies.remove("accessToken");
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): ApiErrorResponse {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred";
      
      return {
        message,
        statusCode: error.response?.status,
      };
    }
    
    return {
      message: "An unexpected error occurred",
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
