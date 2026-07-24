import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  deleteOwnAccount,
} from "../controllers/auth.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", verifyToken, logout);
router.delete("/me", verifyToken, deleteOwnAccount);

export default router;
