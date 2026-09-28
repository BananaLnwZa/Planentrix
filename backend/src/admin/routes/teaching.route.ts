import { Router } from "express";
import {
  createClassMeeting,
  createAcademicTerm,
  createCourseSection,
  deleteClassMeeting,
  getTeachingWorkspace,
  updateClassMeeting,
  updateCourseSection,
  updateCourseSectionStatus,
} from "../controllers/teaching.controller";

const router = Router();

router.get("/", getTeachingWorkspace);
router.post("/terms", createAcademicTerm);
router.post("/sections", createCourseSection);
router.patch("/sections/:sectionId", updateCourseSection);
router.patch("/sections/:sectionId/status", updateCourseSectionStatus);
router.post("/sections/:sectionId/meetings", createClassMeeting);
router.patch("/sections/:sectionId/meetings/:meetingId", updateClassMeeting);
router.delete("/sections/:sectionId/meetings/:meetingId", deleteClassMeeting);

export default router;
