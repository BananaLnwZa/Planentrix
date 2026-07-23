import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getScheduleForCurrentTerm,
  generateScheduleForCurrentTerm,
  getScheduleTimeById,
  updateScheduleTime,
  getAllScheduleTime,
} from "../controllers/table.controller";
import { addTime } from "../controllers/addtime.controller";

const router = Router();

router.get("/:id", verifyToken, getScheduleForCurrentTerm);
router.post("/generate/:id", verifyToken, generateScheduleForCurrentTerm);
router.post("/add-time/:id", verifyToken, addTime);
router.get("/detail/:schedule_time_id", verifyToken, getScheduleTimeById);
router.put("/edit/:schedule_time_id", verifyToken, updateScheduleTime);
router.get("/all/:id", verifyToken, getAllScheduleTime);
export default router;