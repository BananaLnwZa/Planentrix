import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  addTerm,
  getCurrentTerm,
  getAllCurrentTerms,
  getEndedTerms,
  endCurrentTerm,
  getTermsByStatus,
} from "../controllers/terms.controller";

const router = Router();

// POST - Add new term by user_id via URL (require authentication)
router.post("/add/:user_id", verifyToken, addTerm);

// GET - Current term by user_id via URL (require authentication)
router.get("/current/:user_id", verifyToken, getCurrentTerm);

// GET - All current terms (require authentication)
router.get("/active", verifyToken, getAllCurrentTerms);

// GET - All ended terms (require authentication)
router.get("/ended", verifyToken, getEndedTerms);

// GET - Get terms by status (require authentication)
router.get("/status/:status", verifyToken, getTermsByStatus);

// PUT - End current term by user_id via URL (require authentication)
router.put("/end/:user_id", verifyToken, endCurrentTerm);

export default router;