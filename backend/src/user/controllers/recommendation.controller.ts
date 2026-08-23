import { Request, Response } from "express";
import {
  acceptRecommendation,
  addPreviewBlock,
  deletePreviewBlock,
  generateRecommendation,
  getAcceptedWeeklySchedule,
  getLatestRecommendation,
  getRecommendationById,
  RecommendationServiceError,
  rejectRecommendation,
  updatePreviewBlock,
} from "../services/recommendation.engine";
import type { RecommendationTrigger } from "../services/recommendation.types";

const triggers: RecommendationTrigger[] = [
  "weekend",
  "exam_submitted",
  "workload_changed",
  "constraint_changed",
  "manual",
];

const getUserId = (req: Request, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required" });
    return null;
  }
  if (req.user.role && req.user.role !== "user") {
    res.status(403).json({ code: "FORBIDDEN", message: "User role required" });
    return null;
  }
  return Number(req.user.id);
};

const positiveInteger = (value: unknown) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const sendError = (res: Response, error: unknown, operation: string) => {
  console.error(`${operation} error:`, error);
  if (error instanceof RecommendationServiceError) {
    return res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
  if (error instanceof Error && error.message.includes("target_week_start")) {
    return res.status(400).json({ code: "INVALID_TARGET_WEEK", message: error.message });
  }
  return res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error",
  });
};

export const generateWeeklyRecommendation = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const triggerType = String(req.body.trigger_type ?? "manual") as RecommendationTrigger;
    if (!triggers.includes(triggerType)) {
      return res.status(400).json({
        code: "INVALID_TRIGGER_TYPE",
        message: `trigger_type must be one of: ${triggers.join(", ")}`,
      });
    }
    const targetWeekStart = req.body.target_week_start;
    if (targetWeekStart !== undefined && !isDate(targetWeekStart)) {
      return res.status(400).json({
        code: "INVALID_TARGET_WEEK",
        message: "target_week_start must use YYYY-MM-DD format",
      });
    }
    const recommendation = await generateRecommendation({
      userId,
      triggerType,
      targetWeekStart,
      examScoreHistoryId: positiveInteger(req.body.exam_score_history_id),
      workloadId: positiveInteger(req.body.workload_id),
    });
    return res.status(201).json({
      message: "Weekly recommendation generated successfully",
      data: recommendation,
    });
  } catch (error) {
    return sendError(res, error, "generateWeeklyRecommendation");
  }
};

export const getLatestWeeklyRecommendation = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const weekStart = req.query.week_start;
    if (weekStart !== undefined && !isDate(weekStart)) {
      return res.status(400).json({
        code: "INVALID_WEEK_START",
        message: "week_start must use YYYY-MM-DD format",
      });
    }
    const recommendation = await getLatestRecommendation(userId, weekStart);
    return res.json({
      message: recommendation
        ? "Latest weekly recommendation retrieved successfully"
        : "No weekly recommendation found",
      data: recommendation,
    });
  } catch (error) {
    return sendError(res, error, "getLatestWeeklyRecommendation");
  }
};

export const getWeeklyRecommendationDetail = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const recommendationId = positiveInteger(req.params.recommendation_id);
    if (!recommendationId) {
      return res.status(400).json({ code: "INVALID_RECOMMENDATION_ID", message: "A valid recommendation_id is required" });
    }
    return res.json({
      message: "Weekly recommendation retrieved successfully",
      data: await getRecommendationById(userId, recommendationId),
    });
  } catch (error) {
    return sendError(res, error, "getWeeklyRecommendationDetail");
  }
};

export const acceptWeeklyRecommendation = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const recommendationId = positiveInteger(req.params.recommendation_id);
    if (!recommendationId) {
      return res.status(400).json({ code: "INVALID_RECOMMENDATION_ID", message: "A valid recommendation_id is required" });
    }
    return res.json({
      message: "Weekly recommendation accepted successfully",
      data: await acceptRecommendation(userId, recommendationId),
    });
  } catch (error) {
    return sendError(res, error, "acceptWeeklyRecommendation");
  }
};

export const rejectWeeklyRecommendation = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const recommendationId = positiveInteger(req.params.recommendation_id);
    if (!recommendationId) {
      return res.status(400).json({ code: "INVALID_RECOMMENDATION_ID", message: "A valid recommendation_id is required" });
    }
    return res.json({
      message: "Weekly recommendation rejected successfully",
      data: await rejectRecommendation(userId, recommendationId),
    });
  } catch (error) {
    return sendError(res, error, "rejectWeeklyRecommendation");
  }
};

export const updateWeeklyPreviewBlock = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const recommendationId = positiveInteger(req.params.recommendation_id);
    const weeklyBlockId = positiveInteger(req.params.weekly_block_id);
    if (!recommendationId || !weeklyBlockId) {
      return res.status(400).json({ code: "INVALID_BLOCK_ID", message: "Valid recommendation_id and weekly_block_id are required" });
    }
    return res.json({
      message: "Preview block updated successfully",
      data: await updatePreviewBlock(userId, recommendationId, weeklyBlockId, req.body),
    });
  } catch (error) {
    return sendError(res, error, "updateWeeklyPreviewBlock");
  }
};

export const addWeeklyPreviewBlock = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const recommendationId = positiveInteger(req.params.recommendation_id);
    if (!recommendationId) {
      return res.status(400).json({ code: "INVALID_RECOMMENDATION_ID", message: "A valid recommendation_id is required" });
    }
    return res.status(201).json({
      message: "Preview block added successfully",
      data: await addPreviewBlock(userId, recommendationId, req.body),
    });
  } catch (error) {
    return sendError(res, error, "addWeeklyPreviewBlock");
  }
};

export const deleteWeeklyPreviewBlock = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const recommendationId = positiveInteger(req.params.recommendation_id);
    const weeklyBlockId = positiveInteger(req.params.weekly_block_id);
    if (!recommendationId || !weeklyBlockId) {
      return res.status(400).json({ code: "INVALID_BLOCK_ID", message: "Valid recommendation_id and weekly_block_id are required" });
    }
    return res.json({
      message: "Preview block deleted successfully",
      data: await deletePreviewBlock(userId, recommendationId, weeklyBlockId),
    });
  } catch (error) {
    return sendError(res, error, "deleteWeeklyPreviewBlock");
  }
};

export const getWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const weekStart = req.query.week_start;
    if (weekStart !== undefined && !isDate(weekStart)) {
      return res.status(400).json({ code: "INVALID_WEEK_START", message: "week_start must use YYYY-MM-DD format" });
    }
    return res.json({
      message: "Weekly schedule retrieved successfully",
      data: await getAcceptedWeeklySchedule(userId, weekStart),
    });
  } catch (error) {
    return sendError(res, error, "getWeeklySchedule");
  }
};

