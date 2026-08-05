import { Request, Response } from "express";
import db from "../../config/db";

export const getTotalStudyTime = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authUser = (req as any).user;

    if (!authUser?.id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Missing user ID",
      });
      return;
    }

    if (authUser.role && authUser.role !== "user") {
      res.status(403).json({
        success: false,
        message: "Forbidden: user role required",
      });
      return;
    }

    const userId = authUser.id;

    const [rows]: any = await db.query(
      `
      SELECT
        COALESCE(SUM(st.time_spent), 0) AS totalStudyTime
      FROM study_time st
      INNER JOIN schedule_time s
        ON st.schedule_time_id = s.schedule_time_id
      WHERE s.user_id = ?
      `,
      [userId]
    );

    res.status(200).json({
      success: true,
      user_id: userId,
      totalStudyTime: rows[0].totalStudyTime,
    });
  } catch (error) {
    console.error("getTotalStudyTime error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};