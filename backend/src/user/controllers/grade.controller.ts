import { Request, Response } from "express";
import db from "../../config/db";

const CLASS_SCHEDULE_TYPE_ID = 1; // "Class" (วิชาเรียน) ใน schedule_types

const GRADE_TO_GPA: Record<string, number> = {
  A: 4.0,
  "B+": 3.5,
  B: 3.0,
  "C+": 2.5,
  C: 2.0,
  "D+": 1.5,
  D: 1.0,
  F: 0.0,
};

export const getAllScheduleTime = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const [rows]: any = await db.query(
      `SELECT
         st.schedule_time_id,
         st.term_id,
         st.user_id,
         st.schedule_type_id,
         st.subject_id,
         s.subject_name,
         s.credits
       FROM schedule_time st
       JOIN subjects s ON st.subject_id = s.subject_id
       WHERE st.user_id = ? AND st.schedule_type_id = ?
       ORDER BY st.schedule_day ASC, st.start_time ASC`,
      [userId, CLASS_SCHEDULE_TYPE_ID]
    );

    res.json({
      message: "Class schedule retrieved successfully",
      user_id: userId,
      schedule_type_id: CLASS_SCHEDULE_TYPE_ID,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getAllScheduleTime error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const saveGrade = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { id: schedule_time_id } = req.params; // ← แก้ตรงนี้
    const { grade } = req.body;

    if (!schedule_time_id) {
      return res.status(400).json({ message: "schedule_time_id is required" });
    }

    if (!grade) {
      return res.status(400).json({ message: "grade is required" });
    }

    const normalizedGrade = String(grade).toUpperCase();
    const gpa = GRADE_TO_GPA[normalizedGrade];

    if (gpa === undefined) {
      return res.status(400).json({
        message: `Invalid grade. Must be one of: ${Object.keys(GRADE_TO_GPA).join(", ")}`,
      });
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

    if (existing[0].schedule_type_id !== CLASS_SCHEDULE_TYPE_ID) {
      return res.status(400).json({
        message: "Grade can only be saved for 'class' type schedule (schedule_type_id = 1)",
      });
    }

    await db.query(
      `UPDATE schedule_time SET target_score = ? WHERE schedule_time_id = ?`,
      [gpa, schedule_time_id]
    );

    res.json({
      message: "Grade saved successfully",
      schedule_time_id,
      user_id: userId,
      subject_id: existing[0].subject_id,
      grade: normalizedGrade,
      target_score: gpa,
    });
  } catch (err) {
    console.error("saveGrade error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};