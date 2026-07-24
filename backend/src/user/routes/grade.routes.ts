import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { getAllScheduleTime, saveGrade } from "../controllers/grade.controller";

const router = Router();

router.get("/viewsubject/:id", verifyToken, getAllScheduleTime);
router.get("/grade/:id", verifyToken, saveGrade); // ใช้ path นี้บันทึกเกรดแทน

export default router;