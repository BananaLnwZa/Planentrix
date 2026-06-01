/**
 * Auth API Request/Response Interfaces
 */

// ==============================
// REGISTER REQUEST
// ==============================
export interface RegisterRequest {
  user_name: string;
  user_password: string;
  user_birthdate?: string | null;
  user_gender?: "male" | "female" | "other" | null;
  day_off?: number | null;
  continuous_working_duration?: number | null;
  break?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  time_preference?: number | null;
  recurring_busy_time_start?: string | null;
  recurring_busy_time_end?: string | null;
  recurring_busy_day?: number | null;
}

// ==============================
// LOGIN REQUEST & RESPONSE
// ==============================
export interface LoginRequest {
  user_name: string;
  user_password: string;
  platform?: "web" | "mobile";
}

export interface LoginResponse {
  message: string;
  role: string;
  userId: number;
  accessToken: string;
  expiresIn: string;
  refreshToken?: string;
}

// ==============================
// REFRESH TOKEN REQUEST & RESPONSE
// ==============================
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: string;
}

// ==============================
// LOGOUT REQUEST
// ==============================
export interface LogoutRequest {
  // No body required, uses authorization header
}

export interface LogoutResponse {
  message: string;
}

// ==============================
// DELETE ACCOUNT REQUEST & RESPONSE
// ==============================
export interface DeleteAccountRequest {
  // No body required, uses authorization header
}

export interface DeleteAccountResponse {
  message: string;
}

// ==============================
// GENERIC API RESPONSE
// ==============================
export interface ApiResponse<T = void> {
  message: string;
  data?: T;
  statusCode?: number;
  error?: string;
}

// ==============================
// API ERROR RESPONSE
// ==============================
export interface ApiErrorResponse {
  message: string;
  statusCode?: number;
}

// ==============================
// AUTH STATE
// ==============================
export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthUser {
  userId: number;
  role: string;
  username?: string;
}
