export interface Faculty {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  is_active: boolean;
  department_count: number;
  active_department_count: number;
}

export interface FacultyOption {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  is_active: boolean;
}

export interface Department {
  department_id: number;
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  department_code: string;
  department_name: string;
  is_active: boolean;
}

export interface FacultyPayload {
  faculty_code: string;
  faculty_name: string;
}

export interface DepartmentPayload {
  faculty_id: number;
  department_code: string;
  department_name: string;
}

export interface FacultiesResponse {
  message: string;
  faculties: Faculty[];
}

export interface FacultyMutationResponse {
  message: string;
  faculty: Faculty;
}

export interface DepartmentsResponse {
  message: string;
  departments: Department[];
  faculties: FacultyOption[];
}

export interface DepartmentMutationResponse {
  message: string;
  department: Department;
}

export interface AcademicUnitErrorResponse {
  message: string;
  active_department_count?: number;
}
