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
  busy_days?: {
    day: number;
    start: string;
    end: string;
  }[] | null;
}

// ==============================
// LOGIN REQUEST & RESPONSE
// ==============================
export interface LoginRequest {
  user_name: string;
  user_password: string;
  platform: "web";
}

export interface LoginResponse {
  message: string;
  role: string;
  userId: number;
  accessToken: string;
  expiresIn: string;
}

export interface LogoutResponse {
  message: string;
}

// ==============================
// DELETE ACCOUNT RESPONSE
// ==============================
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
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthUser {
  userId: number;
  role: string;
  username?: string;
}

// ==============================
// CONSTRAINT DATA INTERFACES
// ==============================
export interface ConstraintData {
  day_off?: number | null; // 1-7 (Monday-Sunday)
  continuous_working_duration?: number | null; // in minutes
  break?: number | null; // in minutes
  start_time?: string | null; // 24-hour HH:mm format
  end_time?: string | null; // 24-hour HH:mm format
}

export interface RecurringBusyTime {
  busy_days?: {
    day: number;
    start: string;
    end: string;
  }[] | null;
}

export interface UpdateConstraintRequest extends ConstraintData, RecurringBusyTime { }

export interface UpdateConstraintResponse {
  message: string;
  data?: unknown;
}
