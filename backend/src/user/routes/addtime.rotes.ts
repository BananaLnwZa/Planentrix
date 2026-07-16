import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getScheduleForCurrentTerm,
  generateScheduleForCurrentTerm,
} from "../controllers/table.controller";
import { addTime } from "../controllers/addtime.controller";

const router = Router();

router.get("/", verifyToken, getScheduleForCurrentTerm);
router.post("/generate", verifyToken, generateScheduleForCurrentTerm);
router.post("/add-time", verifyToken, addTime);

export default router;