import axios from "axios";
import type {
  AcceptedWeeklySchedule,
  RecommendationChange,
  RecommendationReason,
  RecurringClassBlock,
  WeeklyBlockInput,
  WeeklyBlockUpdate,
  WeeklyRecommendation,
  WeeklyRecommendationItem,
  WeeklyScheduleBlock,
} from "@/interfaces/recommendation.interface";
import { authenticatedApiClient } from "./api.client";

interface DataResponse<T> {
  message: string;
  data: T;
}

type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord =>
  value && typeof value === "object" ? (value as JsonRecord) : {};
const list = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};
const number = (value: unknown) => Number(value) || 0;
const nullableNumber = (value: unknown) =>
  value === null || value === undefined ? null : number(value);
const text = (value: unknown) => (value == null ? "" : String(value));
const nullableText = (value: unknown) =>
  value === null || value === undefined ? null : String(value);
const boolean = (value: unknown) =>
  value === true || value === 1 || value === "1";

const reasonFromJson = (value: unknown): RecommendationReason => {
  const json = record(value);
  return {
    code: text(json.code),
    minutes: number(json.minutes),
    message: text(json.message),
    metadata: record(json.metadata),
  };
};

const changeFromJson = (value: unknown): RecommendationChange => {
  const json = record(value);
  return {
    action: text(json.action),
    ...(json.from ? { from: record(json.from) } : {}),
    ...(json.to ? { to: record(json.to) } : {}),
  };
};

const blockFromJson = (value: unknown): WeeklyScheduleBlock => {
  const json = record(value);
  return {
    weekly_block_id: number(json.weekly_block_id),
    recommendation_id: number(json.recommendation_id),
    recommendation_item_id: nullableNumber(json.recommendation_item_id),
    schedule_time_id: nullableNumber(json.schedule_time_id),
    source_weekly_block_id: nullableNumber(json.source_weekly_block_id),
    user_id: number(json.user_id),
    term_id: number(json.term_id),
    subject_id: text(json.subject_id),
    subject_name: text(json.subject_name),
    schedule_type_id: number(json.schedule_type_id) as 2 | 3,
    schedule_type_name: text(json.schedule_type_name),
    scheduled_date: text(json.scheduled_date),
    start_time: text(json.start_time),
    end_time: text(json.end_time),
    source: text(json.source),
    is_user_modified: boolean(json.is_user_modified),
  };
};

const itemFromJson = (value: unknown): WeeklyRecommendationItem => {
  const json = record(value);
  return {
    recommendation_item_id: number(json.recommendation_item_id),
    recommendation_id: number(json.recommendation_id),
    subject_id: text(json.subject_id),
    subject_name: text(json.subject_name),
    schedule_type_id: number(json.schedule_type_id) as 2 | 3,
    schedule_type_name: text(json.schedule_type_name),
    current_minutes: number(json.current_minutes),
    base_minutes: number(json.base_minutes),
    score_gap_minutes: number(json.score_gap_minutes),
    weak_topic_minutes: number(json.weak_topic_minutes),
    exam_proximity_minutes: number(json.exam_proximity_minutes),
    quiz_floor_minutes: number(json.quiz_floor_minutes),
    workload_minutes: number(json.workload_minutes),
    deadline_minutes: number(json.deadline_minutes),
    raw_target_minutes: number(json.raw_target_minutes),
    max_target_minutes: number(json.max_target_minutes),
    target_minutes: number(json.target_minutes),
    allocated_minutes: number(json.allocated_minutes),
    unallocated_minutes: number(json.unallocated_minutes),
    difference_minutes: number(json.difference_minutes),
    primary_action: text(json.primary_action) as WeeklyRecommendationItem["primary_action"],
    cap_applied: boolean(json.cap_applied),
    capacity_limited: boolean(json.capacity_limited),
    reasons_json: list(json.reasons_json).map(reasonFromJson),
    changes_json: list(json.changes_json).map(changeFromJson),
    blocks: list(json.blocks).map(blockFromJson),
  };
};

const recommendationFromJson = (value: unknown): WeeklyRecommendation => {
  const json = record(value);
  return {
    recommendation_id: number(json.recommendation_id),
    user_id: number(json.user_id),
    term_id: number(json.term_id),
    previous_recommendation_id: nullableNumber(json.previous_recommendation_id),
    exam_score_history_id: nullableNumber(json.exam_score_history_id),
    workload_id: nullableNumber(json.workload_id),
    week_start: text(json.week_start),
    week_end: text(json.week_end),
    version: number(json.version),
    trigger_type: text(json.trigger_type) as WeeklyRecommendation["trigger_type"],
    rule_version: text(json.rule_version),
    status: text(json.status) as WeeklyRecommendation["status"],
    generated_at: text(json.generated_at),
    accepted_at: nullableText(json.accepted_at),
    rejected_at: nullableText(json.rejected_at),
    superseded_at: nullableText(json.superseded_at),
    updated_at: text(json.updated_at),
    items: list(json.items).map(itemFromJson),
    blocks: list(json.blocks).map(blockFromJson),
  };
};

const recurringClassFromJson = (value: unknown): RecurringClassBlock => {
  const json = record(value);
  return {
    schedule_time_id: number(json.schedule_time_id),
    subject_id: text(json.subject_id),
    subject_name: text(json.subject_name),
    schedule_type_id: 1,
    schedule_type_name: text(json.schedule_type_name),
    schedule_day: number(json.schedule_day),
    start_time: text(json.start_time),
    end_time: text(json.end_time),
    classroom: nullableText(json.classroom),
    note: nullableText(json.note),
  };
};

const weeklyScheduleFromJson = (value: unknown): AcceptedWeeklySchedule => {
  const json = record(value);
  return {
    week_start: text(json.week_start),
    week_end: text(json.week_end),
    recurring_classes: list(json.recurring_classes).map(recurringClassFromJson),
    accepted_recommendation: json.accepted_recommendation
      ? recommendationFromJson(json.accepted_recommendation)
      : null,
    weekly_blocks: list(json.weekly_blocks).map(blockFromJson),
  };
};

class RecommendationService {
  private readonly apiClient = authenticatedApiClient;

  async getLatest(weekStart?: string): Promise<WeeklyRecommendation | null> {
    try {
      const response = await this.apiClient.get<DataResponse<unknown>>(
        "/user/recommendations/latest",
        {
        params: weekStart ? { week_start: weekStart } : undefined,
        }
      );
      return response.data.data
        ? recommendationFromJson(response.data.data)
        : null;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดคำแนะนำล่าสุดได้");
    }
  }

  async getDetail(recommendationId: number): Promise<WeeklyRecommendation> {
    try {
      const response = await this.apiClient.get<DataResponse<unknown>>(
        `/user/recommendations/${recommendationId}`
      );
      return recommendationFromJson(response.data.data);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดรายละเอียดคำแนะนำได้");
    }
  }

  async getWeeklySchedule(weekStart?: string): Promise<AcceptedWeeklySchedule> {
    try {
      const response = await this.apiClient.get<DataResponse<unknown>>(
        "/user/recommendations/schedule",
        {
        params: weekStart ? { week_start: weekStart } : undefined,
        }
      );
      return weeklyScheduleFromJson(response.data.data);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดแผนประจำสัปดาห์ได้");
    }
  }

  async generate(targetWeekStart?: string): Promise<WeeklyRecommendation> {
    try {
      const response = await this.apiClient.post<DataResponse<unknown>>(
        "/user/recommendations/generate",
        {
        trigger_type: "manual",
        ...(targetWeekStart
          ? { target_week_start: targetWeekStart }
          : {}),
        }
      );
      return recommendationFromJson(response.data.data);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถสร้างคำแนะนำได้");
    }
  }

  async accept(recommendationId: number): Promise<WeeklyRecommendation> {
    return this.postAction(recommendationId, "accept", "ไม่สามารถยอมรับคำแนะนำได้");
  }

  async reject(recommendationId: number): Promise<WeeklyRecommendation> {
    return this.postAction(recommendationId, "reject", "ไม่สามารถปฏิเสธคำแนะนำได้");
  }

  async addBlock(
    recommendationId: number,
    input: WeeklyBlockInput
  ): Promise<WeeklyRecommendation> {
    try {
      const response = await this.apiClient.post<DataResponse<unknown>>(
        `/user/recommendations/${recommendationId}/blocks`,
        input
      );
      return recommendationFromJson(response.data.data);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถเพิ่มบล็อกเวลาได้");
    }
  }

  async updateBlock(
    recommendationId: number,
    weeklyBlockId: number,
    input: WeeklyBlockUpdate
  ): Promise<WeeklyRecommendation> {
    try {
      const response = await this.apiClient.put<DataResponse<unknown>>(
        `/user/recommendations/${recommendationId}/blocks/${weeklyBlockId}`,
        input
      );
      return recommendationFromJson(response.data.data);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถแก้ไขบล็อกเวลาได้");
    }
  }

  async deleteBlock(
    recommendationId: number,
    weeklyBlockId: number
  ): Promise<WeeklyRecommendation> {
    try {
      const response = await this.apiClient.delete<DataResponse<unknown>>(
        `/user/recommendations/${recommendationId}/blocks/${weeklyBlockId}`
      );
      return recommendationFromJson(response.data.data);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถลบบล็อกเวลาได้");
    }
  }

  private async postAction(
    recommendationId: number,
    action: "accept" | "reject",
    fallback: string
  ): Promise<WeeklyRecommendation> {
    try {
      const response = await this.apiClient.post<DataResponse<unknown>>(
        `/user/recommendations/${recommendationId}/${action}`
      );
      return recommendationFromJson(response.data.data);
    } catch (error) {
      throw this.toError(error, fallback);
    }
  }

  private toError(error: unknown, fallback: string): Error {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as
        | { message?: string; details?: { warning?: string } }
        | undefined;
      return new Error(data?.message || data?.details?.warning || fallback);
    }
    return error instanceof Error ? error : new Error(fallback);
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;
