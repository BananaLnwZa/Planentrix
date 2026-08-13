import axios from "axios";
import type {
  SaveGradeGoalsRequest,
  SaveGradeGoalsResponse,
  OverallGradeSummary,
  SubjectGoalsResponse,
  WorkloadScoreInput,
} from "@/interfaces/grade.interface";
import { authenticatedApiClient } from "./api.client";

class GradeService {
  private readonly apiClient = authenticatedApiClient;

  async getSubjectGoals(): Promise<SubjectGoalsResponse | null> {
    try {
      const response = await this.apiClient.get<SubjectGoalsResponse>(
        "/user/grade/goals"
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw this.toError(error, "ไม่สามารถโหลดข้อมูลคะแนนได้");
    }
  }

  async getOverallGrade(): Promise<OverallGradeSummary | null> {
    try {
      const response = await this.apiClient.get<OverallGradeSummary>(
        "/user/grade/overall"
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw this.toError(error, "ไม่สามารถโหลด GPA ได้");
    }
  }

  async saveGradeGoals(
    data: SaveGradeGoalsRequest
  ): Promise<SaveGradeGoalsResponse> {
    try {
      const response = await this.apiClient.post<SaveGradeGoalsResponse>(
        "/user/grade/goals",
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถบันทึกเป้าหมายเกรดได้");
    }
  }

  async saveWorkloadScore(
    workloadId: number,
    input: WorkloadScoreInput
  ): Promise<void> {
    try {
      await this.apiClient.post("/user/workload/score", {
        workload_id: workloadId,
        actual_score: input.actual_score,
        max_score: input.max_score,
      });
    } catch (error) {
      throw this.toError(error, "ไม่สามารถบันทึกคะแนนได้");
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

export const gradeService = new GradeService();
export default gradeService;
