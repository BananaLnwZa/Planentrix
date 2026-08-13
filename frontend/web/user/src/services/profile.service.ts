import axios from "axios";
import type {
  UpdateAvatarResponse,
  UpdateConstraintRequest,
  UpdateConstraintResponse,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  UserConstraint,
  UserProfile,
} from "@/interfaces/profile.interface";
import type { CurrentTermResponse } from "@/interfaces/term.interface";
import { authenticatedApiClient } from "./api.client";

class ProfileService {
  private readonly apiClient = authenticatedApiClient;

  async getProfile(): Promise<UserProfile> {
    try {
      const response = await this.apiClient.get<UserProfile>("/user/profile/page");
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to load profile");
    }
  }

  async getConstraints(): Promise<UserConstraint> {
    try {
      const response = await this.apiClient.get<UserConstraint>(
        "/user/profile/constraints"
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to load constraints");
    }
  }

  async getCurrentTerm(): Promise<CurrentTermResponse> {
    try {
      const response = await this.apiClient.get<CurrentTermResponse>(
        "/user/terms/current"
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to load current term");
    }
  }

  async updateProfile(
    data: UpdateUserProfileRequest
  ): Promise<UpdateUserProfileResponse> {
    try {
      const response = await this.apiClient.put<UpdateUserProfileResponse>(
        "/user/profile",
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to update profile");
    }
  }

  async updateConstraints(
    data: UpdateConstraintRequest
  ): Promise<UpdateConstraintResponse> {
    try {
      const response = await this.apiClient.put<UpdateConstraintResponse>(
        "/user/profile/constraints",
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to update constraints");
    }
  }

  async updateAvatar(file: File): Promise<UpdateAvatarResponse> {
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await this.apiClient.put<UpdateAvatarResponse>(
        "/user/profile/avatar",
        formData
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "Unable to update profile image");
    }
  }

  private toError(error: unknown, fallbackMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message || fallbackMessage);
    }

    return error instanceof Error ? error : new Error(fallbackMessage);
  }
}

export const profileService = new ProfileService();
export default profileService;
