import { Router } from "express";
import {
  createChoice,
  createExam,
  createExamPart,
  createQuestion,
  deleteChoice,
  deleteExamPart,
  deleteQuestion,
  getExamDetail,
  getExams,
  updateChoice,
  updateExam,
  updateExamPart,
  updateQuestion,
} from "../controllers/exam.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.use(verifyToken);
router.get("/", getExams);
router.post("/", createExam);
router.patch("/parts/:partId", updateExamPart);
router.delete("/parts/:partId", deleteExamPart);
router.post("/parts/:partId/questions", createQuestion);
router.patch("/questions/:questionId", updateQuestion);
router.delete("/questions/:questionId", deleteQuestion);
router.post("/questions/:questionId/choices", createChoice);
router.patch("/choices/:choiceId", updateChoice);
router.delete("/choices/:choiceId", deleteChoice);
router.post("/:examId/parts", createExamPart);
router.get("/:examId", getExamDetail);
router.patch("/:examId", updateExam);

export default router;
