export type UserGender = "male" | "female" | "other" | "unspecified";

export type ManagedAccountStatus = "active" | "suspended" | "archived";

export interface ManagedAccountActivity {
  last_login: string | null;
  is_inactive: boolean;
  inactive_days: number | null;
  status: ManagedAccountStatus;
  version: string;
}

export interface ManagedUser extends ManagedAccountActivity {
  user_id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: number;
  department_code: string;
  department_name: string;
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  year_level: number | null;
  user_pic: string | null;
  user_birthdate: string | null;
  user_gender: UserGender;
}

export interface ManagedInstructor extends ManagedAccountActivity {
  admin_id: number;
  admin_name: string;
  first_name: string;
  last_name: string;
  admin_email: string;
  phone: string | null;
  address: string | null;
  department_id: number | null;
  department_code: string | null;
  department_name: string | null;
  faculty_id: number | null;
  faculty_code: string | null;
  faculty_name: string | null;
}

export interface UserFacultyFilterOption {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
}

export interface UserDepartmentFilterOption {
  department_id: number;
  department_code: string;
  department_name: string;
  faculty_id: number;
}

export interface ManagedUsersResponse {
  message: string;
  users: ManagedUser[];
  instructors: ManagedInstructor[];
  faculties: UserFacultyFilterOption[];
  departments: UserDepartmentFilterOption[];
}

export interface UpdateManagedUserRequest {
  department_id: number;
  version: string;
}

export interface UpdateManagedUserResponse {
  message: string;
  user: ManagedUser;
}

export interface UpdateManagedInstructorRequest {
  admin_name: string;
  admin_email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  department_id: number;
  version: string;
}

export interface UpdateManagedInstructorResponse {
  message: string;
  instructor: ManagedInstructor;
}

export interface DeleteManagedUserResponse {
  message: string;
}

export interface UserManagementErrorResponse {
  message: string;
  code?: "EDIT_CONFLICT";
}
