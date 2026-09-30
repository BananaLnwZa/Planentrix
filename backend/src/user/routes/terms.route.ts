import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  addTerm,
  getAvailableTermSections,
  getCurrentTerm,
  getTermHistory,
  endCurrentTerm,
  getPendingSystemEvaluation,
  submitSystemEvaluation,
} from "../controllers/terms.controller";

const router = Router();

// POST - Start a new term (require authentication)
router.post("/add", verifyToken, addTerm);

// GET - Course sections available for the selected curriculum term
router.get("/available-sections", verifyToken, getAvailableTermSections);

// GET - Current term (require authentication)
router.get("/current", verifyToken, getCurrentTerm);
router.get("/history", verifyToken, getTermHistory);

// GET/POST - Optional end-of-term system evaluation
router.get("/evaluation/pending", verifyToken, getPendingSystemEvaluation);
router.post("/evaluation", verifyToken, submitSystemEvaluation);

// PUT - End current term (require authentication)
router.put("/end", verifyToken, endCurrentTerm);

export default router;
