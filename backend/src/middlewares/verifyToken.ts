import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username?: string;
        role?: string;
      };
    }
  }
}

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization || (req.headers as any).Authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    let token = String(authHeader);
    // Accept either "Bearer <token>" or raw token value
    if (token.includes(" ")) {
      const parts = token.split(" ");
      token = parts[parts.length - 1];
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not set");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    req.user = {
      id: decoded.id,
      username: decoded.username || decoded.user_name,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};
