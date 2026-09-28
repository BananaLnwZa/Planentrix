import { Router } from "express";
import {
  clearInstructorQuestionBankQuestions,
  createInstructorQuestionBank,
  deleteInstructorQuestion,
  deleteInstructorQuestionBank,
  getInstructorDashboard,
  getInstructorExamWorkspace,
  getInstructorQuestionBankDetail,
  importInstructorExamFile,
  updateInstructorQuestion,
} from "../controllers/instructor.controller";
import { examFileUpload } from "../../middlewares/examFileUpload";
import {
  createInstructorGradingDraft,
  getInstructorGradingWorkspace,
  publishInstructorGradingScheme,
  updateInstructorGradingDraft,
} from "../controllers/grading.controller";

const router = Router();

router.get("/dashboard", getInstructorDashboard);
router.get("/grading-schemes", getInstructorGradingWorkspace);
router.post("/grading-schemes", createInstructorGradingDraft);
router.patch("/grading-schemes/:schemeId", updateInstructorGradingDraft);
router.post(
  "/grading-schemes/:schemeId/publish",
  publishInstructorGradingScheme,
);
router.get("/exam-workspace", getInstructorExamWorkspace);
router.get("/question-banks/:bankId", getInstructorQuestionBankDetail);
router.post("/question-banks", createInstructorQuestionBank);
router.patch(
  "/question-banks/:bankId/questions/:questionId",
  updateInstructorQuestion,
);
router.delete(
  "/question-banks/:bankId/questions/:questionId",
  deleteInstructorQuestion,
);
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
