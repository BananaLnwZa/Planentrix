import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  acceptWeeklyRecommendation,
  addWeeklyPreviewBlock,
  deleteWeeklyPreviewBlock,
  generateWeeklyRecommendation,
  getLatestWeeklyRecommendation,
  getWeeklyRecommendationDetail,
  getWeeklySchedule,
  rejectWeeklyRecommendation,
  updateWeeklyPreviewBlock,
} from "../controllers/recommendation.controller";

const router = Router();

router.post("/generate", verifyToken, generateWeeklyRecommendation);
router.get("/latest", verifyToken, getLatestWeeklyRecommendation);
router.get("/schedule", verifyToken, getWeeklySchedule);
router.get("/:recommendation_id", verifyToken, getWeeklyRecommendationDetail);
router.post("/:recommendation_id/accept", verifyToken, acceptWeeklyRecommendation);
router.post("/:recommendation_id/reject", verifyToken, rejectWeeklyRecommendation);
router.post("/:recommendation_id/blocks", verifyToken, addWeeklyPreviewBlock);
router.put(
  "/:recommendation_id/blocks/:weekly_block_id",
  verifyToken,
  updateWeeklyPreviewBlock
);
router.delete(
  "/:recommendation_id/blocks/:weekly_block_id",
  verifyToken,
  deleteWeeklyPreviewBlock
);

export default router;

