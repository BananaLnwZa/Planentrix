import { Router } from "express";
import {
  createSubjectType,
  deleteSubjectType,
  getSubjectTypes,
  updateSubjectType,
} from "../controllers/subject-type.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.use(verifyToken);
router.get("/", getSubjectTypes);
router.post("/", createSubjectType);
router.patch("/:subjectTypeId", updateSubjectType);
router.delete("/:subjectTypeId", deleteSubjectType);

export default router;
