import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  finishStudySession,
  getActiveStudySession,
  getStudyDashboard,
  getTimerSetup,
  heartbeatStudySession,
  pauseStudySession,
  recoverStudySession,
  resumeStudySession,
  startStudySession,
} from "../controllers/time.controller";

const router = Router();

router.get("/setup", verifyToken, getTimerSetup);
router.get("/active", verifyToken, getActiveStudySession);
router.get("/dashboard", verifyToken, getStudyDashboard);
router.post("/start", verifyToken, startStudySession);
router.patch("/:study_time_id/pause", verifyToken, pauseStudySession);
router.patch("/:study_time_id/resume", verifyToken, resumeStudySession);
router.post("/:study_time_id/heartbeat", verifyToken, heartbeatStudySession);
router.patch("/:study_time_id/finish", verifyToken, finishStudySession);
router.patch("/:study_time_id/recover", verifyToken, recoverStudySession);

export default router;
