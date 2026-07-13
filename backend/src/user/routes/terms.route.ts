import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  addTerm,
  getCurrentTerm,
  endCurrentTerm,
} from "../controllers/terms.controller";

const router = Router();

// POST - Start a new term by user_id via URL (require authentication)
router.post("/add/:id", verifyToken, addTerm);

// GET - Current term by user_id via URL (require authentication)
router.get("/current/:id", verifyToken, getCurrentTerm);

// PUT - End current term by user_id via URL (require authentication)
router.put("/end/:id", verifyToken, endCurrentTerm);

export default router;