import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (
      typeof decoded === "string" ||
      !Number.isSafeInteger(decoded.id) ||
      !isAuthRole(decoded.role)
    ) {
      res.status(401).json({ message: "Invalid token payload" });
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
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token expired" });
      return;
    }
    res.status(401).json({ message: "Invalid token" });
  }
};
