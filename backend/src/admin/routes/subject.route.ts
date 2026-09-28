import { Router } from "express";
import {
  createCurriculumSubject,
  createSubject,
  deleteSubject,
  getSubjects,
  updateCurriculumSubject,
  updateCurriculumSubjectStatus,
  updateSubject,
  updateSubjectStatus,
} from "../controllers/subject.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.use(verifyToken);
router.get("/", getSubjects);
router.post("/", createSubject);
router.post("/curriculum", createCurriculumSubject);
router.patch("/curriculum/:curriculumSubjectId/status", updateCurriculumSubjectStatus);
router.patch("/curriculum/:curriculumSubjectId", updateCurriculumSubject);
router.patch("/:subjectId/status", updateSubjectStatus);
router.patch("/:subjectId", updateSubject);
router.delete("/:subjectId", deleteSubject);

export default router;
