import { Router } from "express";
import { importExamFile } from "../controllers/examimport.controller";
import { verifyToken } from "../../middlewares/verifyToken";
import { requireRole } from "../../middlewares/requireRole";
import { examFileUpload } from "../../middlewares/examFileUpload";

const router = Router();

// POST /api/admin/exams/import
router.post(
  "/import",
  verifyToken,
  requireRole("university_staff"),
  examFileUpload.single("exam_file"),
  importExamFile
);

export default router;
