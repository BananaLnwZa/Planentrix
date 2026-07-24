import { Router } from "express";
import {
  loginAdmin,
  logoutAdmin,
  registerAdmin,
} from "../controllers/auth.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/logout", verifyToken, logoutAdmin);

export default router;
