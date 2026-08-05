import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getAllScheduleTime,
  saveGrade,
  getSubjectGoals, // เพิ่ม import
  getOverallGradeGoal,
  getSubjectGoalsWithCompleted

} from "../controllers/grade.controller";

const router = Router();

router.get("/viewgrade/:id", verifyToken, getAllScheduleTime);
router.get("/grade/:id", verifyToken, saveGrade);
router.get("/goals", verifyToken, getSubjectGoals); // เพิ่ม route นี้
router.get("/overall", verifyToken, getOverallGradeGoal);
router.get("/completed", verifyToken, getSubjectGoalsWithCompleted);

export default router;