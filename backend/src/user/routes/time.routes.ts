import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { 
    getTotalStudyTime
 } from "../controllers/time.controller";

const router = Router();
router.get("/total/:userId", verifyToken, getTotalStudyTime);

export default router;