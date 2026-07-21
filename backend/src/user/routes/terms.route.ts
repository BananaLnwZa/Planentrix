import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import {
  addTerm,
  getCurrentTerm,
  endCurrentTerm,
} from "../controllers/terms.controller";

const router = Router();

// POST - Start a new term (require authentication)
router.post("/add", verifyToken, addTerm);

// GET - Current term (require authentication)
router.get("/current", verifyToken, getCurrentTerm);

// PUT - End current term (require authentication)
router.put("/end", verifyToken, endCurrentTerm);

export default router;
