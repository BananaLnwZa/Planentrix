import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  deleteOwnAccount,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.delete("/me", deleteOwnAccount);

export default router;
