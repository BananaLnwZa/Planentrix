import { Router } from "express";
import {
  createAcademicTerm,
  createCourseSection,
  getTeachingWorkspace,
  updateCourseSection,
  updateCourseSectionStatus,
} from "../controllers/teaching.controller";

const router = Router();

router.get("/", getTeachingWorkspace);
router.post("/terms", createAcademicTerm);
router.post("/sections", createCourseSection);
router.patch("/sections/:sectionId", updateCourseSection);
router.patch("/sections/:sectionId/status", updateCourseSectionStatus);

export default router;
