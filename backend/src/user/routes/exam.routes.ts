import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getExamsForCurrentTerm,
  saveExamScore,
  getExamScoreHistory,
} from "../controllers/exam.controller";

const router = Router();

router.get("/", verifyToken, getExamsForCurrentTerm);
router.post("/score", verifyToken, saveExamScore);
router.get("/history", verifyToken, getExamScoreHistory);

export default router;