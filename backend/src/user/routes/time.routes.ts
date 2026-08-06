import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getSubjectsForTimer,
  logStudyTime,
  getTotalStudyTime,
} from "../controllers/time.controller";

const router = Router();

router.get("/subjects", verifyToken, getSubjectsForTimer);
router.post("/log", verifyToken, logStudyTime);
router.get("/total", verifyToken, getTotalStudyTime);

export default router;