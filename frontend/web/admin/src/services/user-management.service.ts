import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  DeleteManagedUserResponse,
  ManagedUsersResponse,
  UpdateManagedUserRequest,
  UpdateManagedUserResponse,
  UserManagementErrorResponse,
} from "@/interfaces/user-management.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

export class UserEditConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserEditConflictError";
  }
}

class UserManagementService {
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create(apiConfig);
    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("adminAccessToken");

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    });
  }

  async getUsers(): Promise<ManagedUsersResponse> {
    try {
      const response = await this.apiClient.get<ManagedUsersResponse>(
        apiEndpoints.users.list,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async updateUser(
    userId: number,
    data: UpdateManagedUserRequest,
  ): Promise<UpdateManagedUserResponse> {
    try {
      const response = await this.apiClient.patch<UpdateManagedUserResponse>(
        apiEndpoints.users.byId(userId),
        data,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async deleteUser(userId: number): Promise<DeleteManagedUserResponse> {
    try {
      const response = await this.apiClient.delete<DeleteManagedUserResponse>(
        apiEndpoints.users.byId(userId),
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError<UserManagementErrorResponse>(error)) {
      if (error.response?.status === 401) {
        expireAdminSession();
      }

      if (
        error.response?.status === 409 &&
        error.response.data?.code === "EDIT_CONFLICT"
      ) {
        return new UserEditConflictError(error.response.data.message);
      }

      return new Error(
        error.response?.data?.message ||
          (error.request
            ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ผู้ดูแลระบบได้"
            : error.message) ||
          "เกิดข้อผิดพลาดที่ไม่คาดคิด",
      );
    }

    return error instanceof Error
      ? error
      : new Error("เกิดข้อผิดพลาดที่ไม่คาดคิด");
  }
}

export const userManagementService = new UserManagementService();
