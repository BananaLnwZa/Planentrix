import type { Request, Response } from "express";

export const getInstructorDashboard = (req: Request, res: Response): void => {
  res.json({
    message: "Instructor dashboard is ready",
    instructorId: req.user?.id,
  });
};
