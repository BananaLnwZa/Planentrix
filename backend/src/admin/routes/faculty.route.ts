import { Router } from "express";
import {
  createFaculty,
  getFaculties,
  updateFaculty,
  updateFacultyStatus,
} from "../controllers/academic-unit.controller";

const router = Router();

router.get("/", getFaculties);
router.post("/", createFaculty);
router.patch("/:facultyId", updateFaculty);
router.patch("/:facultyId/status", updateFacultyStatus);

export default router;
