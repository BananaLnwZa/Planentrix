import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getExamsForCurrentTerm,
  getExamDetail,
  getExamInsights,
  startExam,
  saveExamAnswer,
  submitExam,
  getExamScoreHistory,
} from "../controllers/exam.controller";

const router = Router();

router.get("/", verifyToken, getExamsForCurrentTerm);
router.get("/history", verifyToken, getExamScoreHistory);
router.get("/insights", verifyToken, getExamInsights);
router.get("/:exam_repository_id", verifyToken, getExamDetail);
router.post("/:exam_repository_id/start", verifyToken, startExam);
router.put("/:exam_repository_id/attempts/:attempt_id/answers", verifyToken, saveExamAnswer);
router.post("/:exam_repository_id/submit", verifyToken, submitExam);

export default router;
