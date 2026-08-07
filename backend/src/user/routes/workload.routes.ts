import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  getSubjectsForWorkload,
  createWorkload,
  updateWorkload,
  deleteWorkload,
  finishWorkload,
  getPendingWorkloads,
  saveWorkloadScore, // เพิ่ม import
} from "../controllers/workload.controller";

const router = Router();

router.get("/subjects", verifyToken, getSubjectsForWorkload);
router.post("/add", verifyToken, createWorkload);
router.put("/update/:workload_id", verifyToken, updateWorkload);
router.delete("/delete/:workload_id", verifyToken, deleteWorkload);
router.put("/finish/:workload_id", verifyToken, finishWorkload);
router.get("/pending", verifyToken, getPendingWorkloads);
router.post("/score", verifyToken, saveWorkloadScore); // เพิ่ม route นี้

export default router;
