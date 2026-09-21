/**
 * Request and response contracts for backend/src/auth/auth.controller.ts
 */

export interface RegisterAdminRequest {
  admin_name: string;
  admin_email: string;
  admin_password: string;
  role?: "university_staff" | "instructor";
  major?: string | null;
  department_id?: number | null;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  address?: string | null;
}

export interface RegisterAdminResponse {
  message: string;
  role: "university_staff" | "instructor";
}

export interface LogoutAdminResponse {
  message: string;
}

export interface AdminProfile {
  admin_id: number;
  admin_name: string;
  admin_email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  address: string | null;
  department_id: number | null;
  role: "university_staff" | "instructor";
  status: string;
}

export interface AdminProfileResponse {
  message: string;
  admin: AdminProfile;
}

export interface AdminAuthErrorResponse {
  message: string;
}
