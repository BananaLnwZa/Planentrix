import { Router } from "express";
import {
  createSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
  updateSubjectStatus,
} from "../controllers/subject.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.use(verifyToken);
router.get("/", getSubjects);
router.post("/", createSubject);
router.patch("/:subjectId/status", updateSubjectStatus);
router.patch("/:subjectId", updateSubject);
router.delete("/:subjectId", deleteSubject);

export default router;
