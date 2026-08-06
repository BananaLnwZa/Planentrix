import { Request, Response } from "express";
import db from "../../config/db";

// ==========================================================================
// 1. แสดงรายวิชาในเทอมปัจจุบันของผู้ใช้ (สำหรับเลือกตอนจับเวลาทบทวน)
// ดึงจาก schedule_time ของ user คนนี้ ในเทอมที่ term_status = 1
// ==========================================================================
export const getSubjectsForTimer = async (req: Request, res: Response) => {
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
         s.subject_id,
         s.subject_name,
         s.teacher_name
       FROM schedule_time st
       JOIN subjects s ON st.subject_id = s.subject_id
       JOIN terms t ON st.term_id = t.term_id
       WHERE st.user_id = ? AND t.term_status = 1
       ORDER BY s.subject_name ASC`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No subjects found for the current term",
      });
    }

    res.json({
      message: "Subjects retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getSubjectsForTimer error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// 2. บันทึกเวลาทบทวน ลงตาราง study_time
// รับ: schedule_time_id (วิชาที่เลือก), study_type_id, start_time, end_time, time_spent (นาที)
// ==========================================================================
export const logStudyTime = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { schedule_time_id, study_type_id, start_time, end_time, time_spent } = req.body;

    if (!schedule_time_id || !study_type_id || !start_time || !end_time || time_spent === undefined) {
      return res.status(400).json({
        message:
          "schedule_time_id, study_type_id, start_time, end_time, time_spent are required",
      });
    }

    // เช็คว่า schedule_time_id เป็นของ user คนนี้จริง
    const [existingSchedule]: any = await db.query(
      `SELECT * FROM schedule_time WHERE schedule_time_id = ? AND user_id = ?`,
      [schedule_time_id, userId]
    );

    if (existingSchedule.length === 0) {
      return res.status(404).json({
        message: "schedule_time_id not found or does not belong to this user",
      });
    }

    const [result]: any = await db.query(
      `INSERT INTO study_time
         (study_type_id, schedule_time_id, start_time, end_time, time_spent)
       VALUES (?, ?, ?, ?, ?)`,
      [study_type_id, schedule_time_id, start_time, end_time, time_spent]
    );

    res.status(201).json({
      message: "Study time logged successfully",
      study_time_id: result.insertId,
      user_id: userId,
      schedule_time_id,
      study_type_id,
      start_time,
      end_time,
      time_spent,
    });
  } catch (err) {
    console.error("logStudyTime error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// 3. แสดงเวลาทบทวนรวมทั้งหมดของ user
// ==========================================================================
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