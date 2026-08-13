import axios from "axios";
import {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  DeleteAccountResponse,
  ApiResponse,
  UpdateConstraintRequest,
  UpdateConstraintResponse,
} from "@/interfaces/auth.interface";
import { authenticatedApiClient, publicApiClient } from "./api.client";
import {
  clearStoredAuth,
  getStoredAuthSession,
  storeAccessToken,
  type AuthSession,
} from "./auth.session";

/**
 * Auth Service
 * Handles all authentication-related API calls
 */
class AuthService {
  private readonly authEndpoint = "/user/auth";

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<ApiResponse> {
    try {
      const response = await publicApiClient.post<ApiResponse>(
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
      const response = await publicApiClient.post<LoginResponse>(
        `${this.authEndpoint}/login`,
        { ...data, platform: "web" }
      );

      const { accessToken } = response.data;
      storeAccessToken(accessToken);

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
      const response = await authenticatedApiClient.post<LogoutResponse>(
        `${this.authEndpoint}/logout`
      );

      clearStoredAuth();

      return response.data;
    } catch (error) {
      clearStoredAuth();
      throw this.handleError(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<DeleteAccountResponse> {
    try {
      const response = await authenticatedApiClient.delete<DeleteAccountResponse>(
        `${this.authEndpoint}/me`
      );

      clearStoredAuth();

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get access token from cookies
   */
  getAccessToken(): string | undefined {
    return getStoredAuthSession()?.token;
  }

  getSession(): AuthSession | null {
    return getStoredAuthSession();
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
      const response = await authenticatedApiClient.patch<UpdateConstraintResponse>(
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
    clearStoredAuth();
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred";
      
      return new Error(message);
    }
    
    return error instanceof Error
      ? error
      : new Error("An unexpected error occurred");
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
