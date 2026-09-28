import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";
import db from "../config/db";

export type AuthRole = "user" | "instructor" | "university_staff";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: number;
      username?: string;
      role?: string;
    };
  }
}

const isAuthRole = (value: unknown): value is AuthRole =>
  value === "user" ||
  value === "instructor" ||
  value === "university_staff";

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  void verifyActiveToken(req, res, next);
};

const verifyActiveToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  let decoded: jwt.JwtPayload;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      res.status(401).json({ message: "Invalid authorization header" });
      return;
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not set");
      res.status(500).json({ message: "Server configuration error" });
      return;
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (
      typeof verified === "string" ||
      !Number.isSafeInteger(verified.id) ||
      !isAuthRole(verified.role)
    ) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }
    decoded = verified;

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token expired" });
      return;
    }
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  try {
    const [accounts] =
      decoded.role === "user"
        ? await db.query<RowDataPacket[]>(
            "SELECT status FROM user WHERE user_id = ? LIMIT 1",
            [decoded.id],
          )
        : await db.query<RowDataPacket[]>(
            "SELECT status, role FROM admin WHERE admin_id = ? LIMIT 1",
            [decoded.id],
          );
    const account = accounts[0];
    if (!account || account.status !== "active" || (decoded.role !== "user" && account.role !== decoded.role)) {
      res.status(403).json({
        code: "ACCOUNT_INACTIVE",
        message: "Account is suspended or archived",
      });
      return;
    }
    req.user = {
      id: Number(decoded.id),
      username:
        typeof decoded.username === "string"
          ? decoded.username
          : typeof decoded.user_name === "string"
            ? decoded.user_name
            : undefined,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("verifyToken account status error:", error);
    res.status(500).json({ message: "Unable to verify account status" });
  }
};
