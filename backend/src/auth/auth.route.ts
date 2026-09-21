import { Router } from "express";
import {
  bootstrapAdmin,
  deleteOwnAccount,
  getCurrentAccount,
  listRegistrationOptions,
  login,
  logout,
  refreshToken,
  register,
  registerPrivilegedAccount,
} from "./auth.controller";
import { requireRole } from "../middlewares/requireRole";
import { verifyToken } from "../middlewares/verifyToken";

const router = Router();

router.get("/registration-options", listRegistrationOptions);
router.post("/register", register);
router.post("/bootstrap-admin", bootstrapAdmin);
router.post(
  "/admin/register",
  verifyToken,
  requireRole("university_staff"),
  registerPrivilegedAccount,
);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getCurrentAccount);
router.delete("/me", verifyToken, requireRole("user"), deleteOwnAccount);

export default router;
