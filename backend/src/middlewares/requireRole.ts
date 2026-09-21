import type { NextFunction, Request, Response } from "express";
import type { AuthRole } from "./verifyToken";

export const requireRole = (...allowedRoles: AuthRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!req.user.role || !allowedRoles.some((role) => role === req.user?.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    next();
  };
