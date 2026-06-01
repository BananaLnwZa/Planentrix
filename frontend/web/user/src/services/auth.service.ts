import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutResponse,
  DeleteAccountResponse,
  ApiResponse,
  ApiErrorResponse,
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

    // Add response interceptor to handle token expiration
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If token expired and not already retrying
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          Cookies.get("refreshToken")
        ) {
          originalRequest._retry = true;

          try {
            const refreshToken = Cookies.get("refreshToken");
            const response = await this.refreshToken({ refreshToken: refreshToken || "" });
            
            // Update access token
            Cookies.set("accessToken", response.accessToken, {
              expires: 1, // 1 day
              secure: true,
              sameSite: "Strict",
            });

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
            return this.apiClient(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            Cookies.remove("accessToken");
            Cookies.remove("refreshToken");
            window.location.href = "/login";
            return Promise.reject(refreshError);
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

      // Save tokens to cookies
      const { accessToken, refreshToken } = response.data;
      
      Cookies.set("accessToken", accessToken, {
        expires: 1, // 1 day for web
        secure: true,
        sameSite: "Strict",
      });

      // Store refresh token if provided (mobile)
      if (refreshToken) {
        Cookies.set("refreshToken", refreshToken, {
          expires: 30,
          secure: true,
          sameSite: "Strict",
        });
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      const response = await this.apiClient.post<RefreshTokenResponse>(
        `${this.authEndpoint}/refresh-token`,
        data
      );
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

      // Clear tokens from cookies
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");

      return response.data;
    } catch (error) {
      // Clear tokens even if request fails
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");
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

      // Clear tokens from cookies
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");

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
   * Get refresh token from cookies
   */
  getRefreshToken(): string | undefined {
    return Cookies.get("refreshToken");
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Clear all auth data
   */
  clearAuth(): void {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
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
