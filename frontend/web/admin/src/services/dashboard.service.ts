import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  DashboardErrorResponse,
  ExamPartRankingsResponse,
  ExamScoreSummariesResponse,
  PopularConstraintsResponse,
  ReviewMethodsResponse,
  StudyTimeOverviewResponse,
  UserYearDistributionResponse,
  WorkloadCompletionResponse,
} from "@/interfaces/dashboard.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { expireAdminSession } from "@/services/admin-session.client";

class DashboardService {
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

  async getStudyTimeOverview(): Promise<StudyTimeOverviewResponse> {
    try {
      const response = await this.apiClient.get<StudyTimeOverviewResponse>(
        apiEndpoints.dashboard.studyTime,
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError<DashboardErrorResponse>(error)) {
        if (error.response?.status === 401) {
          expireAdminSession();
        }

        throw new Error(
          error.response?.data?.message ||
            (error.request
              ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ผู้ดูแลระบบได้"
              : error.message) ||
            "ไม่สามารถโหลดสถิติการใช้งานได้",
        );
      }

      throw error instanceof Error
        ? error
        : new Error("ไม่สามารถโหลดสถิติการใช้งานได้");
    }
  }

  async getPopularConstraints(): Promise<PopularConstraintsResponse> {
    try {
      const response = await this.apiClient.get<PopularConstraintsResponse>(
        apiEndpoints.dashboard.constraints,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error, "ไม่สามารถโหลดสถิติข้อจำกัดได้");
    }
  }

  async getExamPartRankings(): Promise<ExamPartRankingsResponse> {
    try {
      const response = await this.apiClient.get<ExamPartRankingsResponse>(
        apiEndpoints.dashboard.examParts,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error, "ไม่สามารถโหลดอันดับ Part ข้อสอบได้");
    }
  }

  async getUserYearDistribution(): Promise<UserYearDistributionResponse> {
    try {
      const response = await this.apiClient.get<UserYearDistributionResponse>(
        apiEndpoints.dashboard.usersByYear,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error, "ไม่สามารถโหลดจำนวนบัญชีตามชั้นปีได้");
    }
  }

  async getWorkloadCompletion(): Promise<WorkloadCompletionResponse> {
    try {
      const response = await this.apiClient.get<WorkloadCompletionResponse>(
        apiEndpoints.dashboard.workloads,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error, "ไม่สามารถโหลดสัดส่วนสถานะงานได้");
    }
  }

  async getExamScoreSummaries(): Promise<ExamScoreSummariesResponse> {
    try {
      const response = await this.apiClient.get<ExamScoreSummariesResponse>(
        apiEndpoints.dashboard.examScores,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error, "ไม่สามารถโหลดคะแนนแยกตามข้อสอบได้");
    }
  }

  async getReviewMethods(): Promise<ReviewMethodsResponse> {
    try {
      const response = await this.apiClient.get<ReviewMethodsResponse>(
        apiEndpoints.dashboard.reviewMethods,
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error, "ไม่สามารถโหลดวิธีทบทวนที่นิยมได้");
    }
  }

  private handleError(error: unknown, fallbackMessage: string): Error {
    if (axios.isAxiosError<DashboardErrorResponse>(error)) {
      if (error.response?.status === 401) {
        expireAdminSession();
      }

      return new Error(
        error.response?.data?.message ||
          (error.request
            ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ผู้ดูแลระบบได้"
            : error.message) ||
          fallbackMessage,
      );
    }

    return error instanceof Error ? error : new Error(fallbackMessage);
  }
}

export const dashboardService = new DashboardService();
