import { Router } from "express";
import {
  clearInstructorQuestionBankQuestions,
  createInstructorQuestion,
  createInstructorQuestionBank,
  deleteInstructorQuestion,
  deleteInstructorQuestionBank,
  getInstructorDashboard,
  getInstructorExamWorkspace,
  getInstructorQuestionImage,
  getInstructorQuestionBankDetail,
  importInstructorExamFile,
  publishInstructorQuestionBank,
  updateInstructorQuestionBankSettings,
  updateInstructorQuestion,
  uploadInstructorQuestionImage,
} from "../controllers/instructor.controller";
import { uploadExamFile } from "../../middlewares/examFileUpload";
import { uploadQuestionImage } from "../../middlewares/questionImageUpload";
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
  "/question-banks/:bankId",
  updateInstructorQuestionBankSettings,
);
router.post(
  "/question-banks/:bankId/publish",
  publishInstructorQuestionBank,
);
router.post(
  "/question-banks/:bankId/questions",
  createInstructorQuestion,
);
router.get(
  "/question-banks/:bankId/images/:filename",
  getInstructorQuestionImage,
);
router.post(
  "/question-banks/:bankId/images",
  uploadQuestionImage,
  uploadInstructorQuestionImage,
);
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
  uploadExamFile,
  importInstructorExamFile,
);

export default router;
