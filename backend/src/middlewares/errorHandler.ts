import { NextFunction, Request, Response } from "express";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("[ERROR]", err);

  const status = typeof err === "object" && err !== null && "statusCode" in err
    ? (err as any).statusCode
    : 500;

  const message = typeof err === "string"
    ? err
    : err instanceof Error
    ? err.message
    : "Internal server error";

  res.status(status).json({
    success: false,
    message,
  });
};
