import { Request, Response } from "express";
import db from "../../config/db";

// ==========================================================================
// ลบรายการตารางเวลา โดยใช้ schedule_time_id
// ==========================================================================
export const deleteScheduleTime = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { schedule_time_id } = req.params;

    if (!schedule_time_id) {
      return res.status(400).json({ message: "schedule_time_id is required" });
    }

    const [existing]: any = await db.query(
      `SELECT * FROM schedule_time WHERE schedule_time_id = ? AND user_id = ?`,
      [schedule_time_id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Schedule time not found or does not belong to this user",
      });
    }

    await db.query(
      `DELETE FROM schedule_time WHERE schedule_time_id = ?`,
      [schedule_time_id]
    );

    res.json({
      message: "Schedule time deleted successfully",
      schedule_time_id,
      user_id: userId,
      deleted_data: existing[0],
    });
  } catch (err) {
    console.error("deleteScheduleTime error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};