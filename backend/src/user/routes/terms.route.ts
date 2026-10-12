import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  addTerm,
  getAvailableTermSections,
  getCurrentTerm,
  getTermWorkflow,
  acknowledgeMidtermFollowup,
  getTermHistory,
  endCurrentTerm,
} from "../controllers/terms.controller";

const router = Router();

// POST - Start a new term (require authentication)
router.post("/add", verifyToken, addTerm);

// GET - Course sections available for the selected curriculum term
router.get("/available-sections", verifyToken, getAvailableTermSections);

// GET - Current term (require authentication)
router.get("/current", verifyToken, getCurrentTerm);
router.get("/workflow", verifyToken, getTermWorkflow);
router.post("/workflow/midterm-followup/acknowledge", verifyToken, acknowledgeMidtermFollowup);
router.get("/history", verifyToken, getTermHistory);

// PUT - End current term (require authentication)
router.put("/end", verifyToken, endCurrentTerm);

export default router;
