import { Router } from "express";
import {
  clearInstructorQuestionBankQuestions,
  createInstructorQuestionBank,
  deleteInstructorQuestionBank,
  getInstructorDashboard,
  getInstructorExamWorkspace,
  importInstructorExamFile,
} from "../controllers/instructor.controller";
import { examFileUpload } from "../../middlewares/examFileUpload";

const router = Router();

router.get("/dashboard", getInstructorDashboard);
router.get("/exam-workspace", getInstructorExamWorkspace);
router.post("/question-banks", createInstructorQuestionBank);
router.delete("/question-banks/:bankId", deleteInstructorQuestionBank);
router.delete(
  "/question-banks/:bankId/questions",
  clearInstructorQuestionBankQuestions,
);
router.post(
  "/question-banks/:bankId/import",
  examFileUpload.single("exam_file"),
  importInstructorExamFile,
);

export default router;
