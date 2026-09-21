import { Router } from "express";
import { getInstructorDashboard } from "../controllers/instructor.controller";

const router = Router();

router.get("/dashboard", getInstructorDashboard);

export default router;
