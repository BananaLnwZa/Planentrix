import type { Request, Response } from "express";
import type { AuthRole } from "../middlewares/verifyToken";
import {
  AuthServiceError,
  authenticate,
  bootstrapFirstAdmin,
  deleteUserAccount,
  getAccountProfile,
  getRegistrationOptions,
  logoutAccount,
  refreshUserAccessToken,
  registerAdmin,
  registerUser,
} from "./auth.service";

export const listRegistrationOptions = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    res.json(await getRegistrationOptions());
  } catch (error) {
    handleAuthError(res, error, "listRegistrationOptions");
  }
};

const authenticatedAccount = (
  req: Request,
  res: Response,
): { id: number; role: AuthRole } | null => {
  const role = req.user?.role;
  if (
    !req.user ||
    (role !== "user" &&
      role !== "instructor" &&
      role !== "university_staff")
  ) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  return { id: req.user.id, role };
};

const handleAuthError = (
  res: Response,
  error: unknown,
  operation: string,
): void => {
  if (error instanceof AuthServiceError) {
    res.status(error.statusCode).json({
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
    });
    return;
  }

  console.error(`${operation} error:`, error);
  res.status(500).json({ message: "Internal server error" });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    await registerUser(req.body);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    handleAuthError(res, error, "register");
  }
};

export const registerPrivilegedAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const role = await registerAdmin(req.body);
    res.status(201).json({
      message: `${role === "instructor" ? "Instructor" : "University staff"} registered successfully`,
      role,
    });
  } catch (error) {
    handleAuthError(res, error, "registerPrivilegedAccount");
  }
};

export const bootstrapAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await bootstrapFirstAdmin(
      req.body,
      req.get("x-bootstrap-secret"),
      req.ip ?? req.socket.remoteAddress,
    );
    res.status(201).json({
      message: "First administrator registered successfully",
      role: "university_staff",
    });
  } catch (error) {
    handleAuthError(res, error, "bootstrapAdmin");
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await authenticate(req.body));
  } catch (error) {
    handleAuthError(res, error, "login");
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    res.json(await refreshUserAccessToken(req.body));
  } catch (error) {
    handleAuthError(res, error, "refreshToken");
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const account = authenticatedAccount(req, res);
  if (!account) return;

  try {
    const message = await logoutAccount(account.id, account.role);
    res.json({ message });
  } catch (error) {
    handleAuthError(res, error, "logout");
  }
};

export const getCurrentAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const account = authenticatedAccount(req, res);
  if (!account) return;

  try {
    res.json(await getAccountProfile(account.id, account.role));
  } catch (error) {
    handleAuthError(res, error, "getCurrentAccount");
  }
};

export const deleteOwnAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const account = authenticatedAccount(req, res);
  if (!account) return;

  try {
    await deleteUserAccount(account.id);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    handleAuthError(res, error, "deleteOwnAccount");
  }
};
