import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getExamsForCurrentTerm,
  getExamDetail,
  getExamInsights,
  submitExam,
  getExamScoreHistory,
} from "../controllers/exam.controller";

const router = Router();

router.get("/", verifyToken, getExamsForCurrentTerm);
router.get("/history", verifyToken, getExamScoreHistory);
router.get("/insights", verifyToken, getExamInsights);
router.get("/:exam_repository_id", verifyToken, getExamDetail);
router.post("/:exam_repository_id/submit", verifyToken, submitExam);

export default router;
