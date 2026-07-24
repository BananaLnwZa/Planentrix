import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { getSubjectsForWorkload, createWorkload } from "../controllers/workload.controller";

const router = Router();

router.get("/subjects", verifyToken, getSubjectsForWorkload);
router.post("/add", verifyToken, createWorkload);

export default router;