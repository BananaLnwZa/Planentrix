import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getScheduleForCurrentTerm,
  generateScheduleForCurrentTerm,
  getScheduleTimeById,
  updateScheduleTime,
  addTime,
  deleteScheduleTime,
} from "../controllers/table.controller";

const router = Router();

router.get("/", verifyToken, getScheduleForCurrentTerm);
router.post("/generate", verifyToken, generateScheduleForCurrentTerm);
router.post("/add-time", verifyToken, addTime);
router.get("/detail/:schedule_time_id", verifyToken, getScheduleTimeById);
router.put("/edit/:schedule_time_id", verifyToken, updateScheduleTime);
router.delete("/:schedule_time_id", verifyToken, deleteScheduleTime);

export default router;
