import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getAllScheduleTime,
  saveGrade,
  saveGradeGoals,
  getSubjectGoals,
  getOverallGradeGoal,
  getSubjectGoalsWithCompleted

} from "../controllers/grade.controller";

const router = Router();

router.get("/viewgrade", verifyToken, getAllScheduleTime);
router.get("/viewgrade/:id", verifyToken, getAllScheduleTime);
router.put("/grade/:id", verifyToken, saveGrade);
router.get("/goals", verifyToken, getSubjectGoals);
router.post("/goals", verifyToken, saveGradeGoals);
router.get("/overall", verifyToken, getOverallGradeGoal);
router.get("/completed", verifyToken, getSubjectGoalsWithCompleted);

export default router;
