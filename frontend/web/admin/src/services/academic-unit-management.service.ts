import axios, { type AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  AcademicUnitErrorResponse,
  DepartmentMutationResponse,
  DepartmentPayload,
  DepartmentsResponse,
  FacultiesResponse,
  FacultyMutationResponse,
  FacultyPayload,
} from "@/interfaces/academic-unit.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

class AcademicUnitManagementService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);
    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("accessToken");
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });
  }

  async getFaculties(): Promise<FacultiesResponse> {
    try {
      const response = await this.apiClient.get<FacultiesResponse>(
        apiEndpoints.faculties.list,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createFaculty(data: FacultyPayload): Promise<FacultyMutationResponse> {
    try {
      const response = await this.apiClient.post<FacultyMutationResponse>(
        apiEndpoints.faculties.list,
        data,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateFaculty(
    facultyId: number,
    data: FacultyPayload,
  ): Promise<FacultyMutationResponse> {
    try {
      const response = await this.apiClient.patch<FacultyMutationResponse>(
        apiEndpoints.faculties.byId(facultyId),
        data,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async setFacultyStatus(
    facultyId: number,
    isActive: boolean,
  ): Promise<FacultyMutationResponse> {
    try {
      const response = await this.apiClient.patch<FacultyMutationResponse>(
        apiEndpoints.faculties.status(facultyId),
        { is_active: isActive },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDepartments(): Promise<DepartmentsResponse> {
    try {
      const response = await this.apiClient.get<DepartmentsResponse>(
        apiEndpoints.departments.list,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createDepartment(
    data: DepartmentPayload,
  ): Promise<DepartmentMutationResponse> {
    try {
      const response = await this.apiClient.post<DepartmentMutationResponse>(
        apiEndpoints.departments.list,
        data,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateDepartment(
    departmentId: number,
    data: DepartmentPayload,
  ): Promise<DepartmentMutationResponse> {
    try {
      const response = await this.apiClient.patch<DepartmentMutationResponse>(
        apiEndpoints.departments.byId(departmentId),
        data,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async setDepartmentStatus(
    departmentId: number,
    isActive: boolean,
  ): Promise<DepartmentMutationResponse> {
    try {
      const response = await this.apiClient.patch<DepartmentMutationResponse>(
        apiEndpoints.departments.status(departmentId),
        { is_active: isActive },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError<AcademicUnitErrorResponse>(error)) {
      if (error.response?.status === 401) expireAdminSession();
      return new Error(
        error.response?.data?.message ||
          (error.request
            ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
            : error.message) ||
          "เกิดข้อผิดพลาดที่ไม่คาดคิด",
      );
    }
    return error instanceof Error
      ? error
      : new Error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
  }
}

export const academicUnitManagementService =
  new AcademicUnitManagementService();
