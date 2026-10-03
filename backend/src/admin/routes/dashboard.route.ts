import { Router } from "express";
import {
  getExamPartRankings,
  getExamScoreSummaries,
  getPopularConstraints,
  getStudyTimeOverview,
  getUserYearDistribution,
  getWorkloadCompletion,
} from "../controllers/dashboard.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.use(verifyToken);
router.get("/study-time", getStudyTimeOverview);
router.get("/constraints", getPopularConstraints);
router.get("/exam-parts", getExamPartRankings);
router.get("/users-by-year", getUserYearDistribution);
router.get("/workloads", getWorkloadCompletion);
router.get("/exam-scores", getExamScoreSummaries);

export default router;
