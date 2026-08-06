import { Request, Response } from "express";
import db from "../../config/db";

// ==========================================================================
// 1. แสดงแบบทดสอบตามรายวิชาในเทอมปัจจุบันของผู้ใช้
// ==========================================================================
export const getExamsForCurrentTerm = async (req: Request, res: Response) => {
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
      `SELECT DISTINCT
         er.exam_repository_id,
         er.subject_id,
         s.subject_name,
         er.exam_name,
         er.total_score,
         er.total_question,
         er.time_limit
       FROM exam_repository er
       JOIN subjects s ON er.subject_id = s.subject_id
       JOIN schedule_time st ON st.subject_id = er.subject_id
       JOIN terms t ON st.term_id = t.term_id
       WHERE st.user_id = ? AND t.term_status = 1
       ORDER BY s.subject_name ASC, er.exam_name ASC`,
      [userId]
    );

    res.json({
      message: "Exams retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getExamsForCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// 2. บันทึกคะแนนสอบของผู้ใช้ ลงตาราง exam_score_history
// รับ: schedule_time_id, exam_repository_id, actual_score
// (exam_max_score ดึงจาก exam_repository.total_score เอง, exam_date = NOW())
// ==========================================================================
export const saveExamScore = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { schedule_time_id, exam_repository_id, actual_score } = req.body;

    if (!schedule_time_id || !exam_repository_id || actual_score === undefined) {
      return res.status(400).json({
        message: "schedule_time_id, exam_repository_id, actual_score are required",
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

    // เช็คว่า exam_repository_id มีอยู่จริง แล้วดึง total_score มาใช้เป็น exam_max_score
    const [examRows]: any = await db.query(
      `SELECT total_score FROM exam_repository WHERE exam_repository_id = ?`,
      [exam_repository_id]
    );

    if (examRows.length === 0) {
      return res.status(404).json({ message: "exam_repository_id not found" });
    }

    const examMaxScore = examRows[0].total_score;

    const [result]: any = await db.query(
      `INSERT INTO exam_score_history
         (schedule_time_id, exam_repository_id, actual_score, exam_max_score, exam_date)
       VALUES (?, ?, ?, ?, NOW())`,
      [schedule_time_id, exam_repository_id, actual_score, examMaxScore]
    );

    res.status(201).json({
      message: "Exam score saved successfully",
      exam_score_history_id: result.insertId,
      user_id: userId,
      schedule_time_id,
      exam_repository_id,
      actual_score,
      exam_max_score: examMaxScore,
    });
  } catch (err) {
    console.error("saveExamScore error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// 3. แสดงประวัติคะแนนสอบของผู้ใช้ (ทุกวิชา เรียงล่าสุดก่อน)
// ==========================================================================
export const getExamScoreHistory = async (req: Request, res: Response) => {
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
         esh.exam_score_history_id,
         esh.schedule_time_id,
         esh.exam_repository_id,
         er.exam_name,
         s.subject_id,
         s.subject_name,
         esh.actual_score,
         esh.exam_max_score,
         esh.exam_date
       FROM exam_score_history esh
       JOIN schedule_time st ON esh.schedule_time_id = st.schedule_time_id
       JOIN exam_repository er ON esh.exam_repository_id = er.exam_repository_id
       JOIN subjects s ON er.subject_id = s.subject_id
       WHERE st.user_id = ?
       ORDER BY esh.exam_date DESC`,
      [userId]
    );

    res.json({
      message: "Exam score history retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getExamScoreHistory error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};