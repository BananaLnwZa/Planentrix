/**
 * Request and response contracts for backend/src/admin/controllers/auth.controller.ts
 */

export interface RegisterAdminRequest {
  admin_name: string;
  admin_email: string;
  admin_password: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  address?: string | null;
}

export interface RegisterAdminResponse {
  message: string;
}

export interface LoginAdminRequest {
  admin_name: string;
  admin_password: string;
}

export interface LoginAdminResponse {
  message: string;
  role: "admin";
  adminId: number;
  accessToken: string;
  expiresIn: string;
}

export interface LogoutAdminResponse {
  message: string;
}

export interface AdminAuthErrorResponse {
  message: string;
}
