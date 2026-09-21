import { Router } from "express";
import {
  createDepartment,
  getDepartments,
  updateDepartment,
  updateDepartmentStatus,
} from "../controllers/academic-unit.controller";

const router = Router();

router.get("/", getDepartments);
router.post("/", createDepartment);
router.patch("/:departmentId", updateDepartment);
router.patch("/:departmentId/status", updateDepartmentStatus);

export default router;
