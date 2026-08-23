import axios from "axios";
import type {
  ExamAnswer,
  ExamCheckpointInsight,
  ExamChoice,
  ExamDetail,
  ExamHistoryItem,
  ExamHistoryWeakTopic,
  ExamInsights,
  ExamQuestion,
  ExamSubmissionResult,
  ExamSummary,
  WeakTopicInsight,
} from "@/interfaces/exam.interface";
import { authenticatedApiClient } from "./api.client";

type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord =>
  value && typeof value === "object" ? (value as JsonRecord) : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const number = (value: unknown): number => Number(value) || 0;
const text = (value: unknown): string => (value == null ? "" : String(value));
const date = (value: unknown): Date | null => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const summaryFromJson = (value: unknown): ExamSummary => {
  const json = record(value);
  return {
    examRepositoryId: number(json.exam_repository_id),
    scheduleTimeId: number(json.schedule_time_id),
    subjectId: text(json.subject_id),
    subjectName: text(json.subject_name),
    examName: text(json.exam_name),
    totalScore: number(json.total_score),
    totalQuestion: number(json.total_question),
    timeLimitMinutes: number(json.time_limit),
  };
};

const choiceFromJson = (value: unknown): ExamChoice => {
  const json = record(value);
  return {
    choiceId: number(json.choice_id),
    order: number(json.choice_order),
    text: text(json.choice_text),
  };
};

const historyTopicFromJson = (value: unknown): ExamHistoryWeakTopic => {
  const json = record(value);
  return {
    topicName: text(json.topic_name),
    percentage: number(json.percentage),
  };
};

const historyFromJson = (value: unknown): ExamHistoryItem => {
  const json = record(value);
  return {
    historyId: number(json.exam_score_history_id),
    examRepositoryId: number(json.exam_repository_id),
    subjectId: text(json.subject_id),
    examName: text(json.exam_name),
    subjectName: text(json.subject_name),
    actualScore: number(json.actual_score),
    maximumScore: number(json.exam_max_score),
    examDate: date(json.exam_date),
    weakTopics: list(json.weak_topics).map(historyTopicFromJson),
  };
};

const weakTopicFromJson = (value: unknown): WeakTopicInsight => {
  const json = record(value);
  return {
    scheduleTimeId: number(json.schedule_time_id),
    examRepositoryId: number(json.exam_repository_id),
    examPartId: number(json.exam_part_id),
    topicName: text(json.topic_name),
    subjectId: text(json.subject_id),
    subjectName: text(json.subject_name),
    examName: text(json.exam_name),
    actualScore: number(json.actual_score),
    maximumScore: number(json.max_score),
    percentage: number(json.percentage),
    studyTypeId: number(json.study_type_id),
    studyTypeName: text(json.study_type_name),
  };
};

const checkpointFromJson = (value: unknown): ExamCheckpointInsight => {
  const json = record(value);
  return {
    scheduleTimeId: number(json.schedule_time_id),
    examRepositoryId: number(json.exam_repository_id),
    examName: text(json.exam_name),
    subjectId: text(json.subject_id),
    subjectName: text(json.subject_name),
    nextCheckpointAt: date(json.next_checkpoint_at) ?? new Date(),
    intervalWeeks: number(json.interval_weeks),
    weakTopicCount: number(json.weak_topic_count),
    reviewMinutesDelta: number(json.review_minutes_delta),
    reviewScheduleTypeId: number(json.review_schedule_type_id) || 2,
  };
};

class ExamService {
  private readonly apiClient = authenticatedApiClient;

  async getExams(): Promise<ExamSummary[]> {
    try {
      const response = await this.apiClient.get("/user/exam");
      return list(record(response.data).data).map(summaryFromJson);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดชุดข้อสอบได้");
    }
  }

  async getExamDetail(examRepositoryId: number): Promise<ExamDetail> {
    try {
      const response = await this.apiClient.get(`/user/exam/${examRepositoryId}`);
      const json = record(record(response.data).data);
      const questions: ExamQuestion[] = [];
      for (const rawPart of list(json.parts)) {
        const part = record(rawPart);
        for (const rawQuestion of list(part.questions)) {
          const question = record(rawQuestion);
          questions.push({
            questionId: number(question.question_id),
            order: number(question.question_order),
            text: text(question.question_text),
            score: number(question.question_score),
            partName: text(part.exam_part_name),
            choices: list(question.choices).map(choiceFromJson),
          });
        }
      }
      return { summary: summaryFromJson(json), questions };
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดรายละเอียดข้อสอบได้");
    }
  }

  async getHistory(): Promise<ExamHistoryItem[]> {
    try {
      const response = await this.apiClient.get("/user/exam/history");
      return list(record(response.data).data).map(historyFromJson);
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดประวัติการทำข้อสอบได้");
    }
  }

  async getInsights(): Promise<ExamInsights> {
    try {
      const response = await this.apiClient.get("/user/exam/insights");
      const json = record(response.data);
      return {
        weakTopics: list(json.weak_topics).map(weakTopicFromJson),
        nextCheckpoints: list(json.next_checkpoints).map(checkpointFromJson),
      };
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดคำแนะนำการทบทวนได้");
    }
  }

  async submitExam(
    examRepositoryId: number,
    answers: ExamAnswer[]
  ): Promise<ExamSubmissionResult> {
    try {
      const response = await this.apiClient.post(
        `/user/exam/${examRepositoryId}/submit`,
        {
          answers: answers.map((answer) => ({
            question_id: answer.questionId,
            choice_id: answer.choiceId,
          })),
        }
      );
      const json = record(response.data);
      const reviewMethodJson = record(json.review_method);
      return {
        historyId: number(json.exam_score_history_id),
        actualScore: number(json.actual_score),
        maximumScore: number(json.exam_max_score),
        correctAnswers: number(json.correct_answers),
        totalQuestions: number(json.total_questions),
        nextCheckpointAt: date(json.next_checkpoint_at),
        checkpointIntervalWeeks: number(json.checkpoint_interval_weeks),
        weakTopicCount: number(json.weak_topic_count),
        reviewMinutesDelta: number(json.review_minutes_delta),
        scheduleRecommendationId: json.schedule_recommendation_id
          ? number(json.schedule_recommendation_id)
          : null,
        reviewMethod: reviewMethodJson.study_type_id
          ? {
              studyTypeId: number(reviewMethodJson.study_type_id),
              studyTypeName: text(reviewMethodJson.study_type_name),
              fallbackUsed: Boolean(reviewMethodJson.fallback_used),
            }
          : null,
      };
    } catch (error) {
      throw this.toError(error, "ไม่สามารถส่งข้อสอบได้");
    }
  }

  private toError(error: unknown, fallback: string): Error {
    if (axios.isAxiosError(error)) {
      return new Error(error.response?.data?.message || fallback);
    }
    return error instanceof Error ? error : new Error(fallback);
  }
}

export const examService = new ExamService();
export default examService;
