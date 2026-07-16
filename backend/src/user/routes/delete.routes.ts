import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { deleteScheduleTime } from "../controllers/deletetime.controller";

const router = Router();

router.delete("/:schedule_time_id", verifyToken, deleteScheduleTime);

export default router;