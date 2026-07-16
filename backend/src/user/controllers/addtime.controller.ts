import { Request, Response } from "express";
import db from "../../config/db";

const ALLOWED_SCHEDULE_TYPE_IDS = [2, 3]; // 2 = Study, 3 = Homework

// ==========================================================================
// เพิ่มรายการตารางเวลาของตัวเอง (อ่านหนังสือ/ทำการบ้าน)
// user เลือกวิชาเอง + กรอกวัน/เวลาเริ่ม/เวลาจบ + เลือกประเภท (Study หรือ Homework)
// ==========================================================================
export const addTime = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { subject_id, schedule_day, start_time, end_time, schedule_type_id } = req.body;

    // 1. ตรวจสอบข้อมูลที่จำเป็น
    if (!subject_id || !schedule_day || !start_time || !end_time || !schedule_type_id) {
      return res.status(400).json({
        message: "subject_id, schedule_day, start_time, end_time, schedule_type_id are required",
      });
    }

    // 2. เช็คว่า schedule_type_id ที่ส่งมาเป็น Study หรือ Homework เท่านั้น
    if (!ALLOWED_SCHEDULE_TYPE_IDS.includes(Number(schedule_type_id))) {
      return res.status(400).json({
        message: "schedule_type_id must be 2 (Study) or 3 (Homework)",
      });
    }

    // 3. เช็คว่าวิชาที่เลือกมีอยู่จริง
    const [subjectRows]: any = await db.query(
      `SELECT * FROM subjects WHERE subject_id = ?`,
      [subject_id]
    );

    if (subjectRows.length === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // 4. หาเทอมปัจจุบัน (term_status = 1)
    const [currentTermRows]: any = await db.query(
      `SELECT * FROM terms WHERE term_status = 1 ORDER BY term_id DESC LIMIT 1`
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    const currentTerm = currentTermRows[0];

    // 5. บันทึกลง schedule_time
    const [result]: any = await db.query(
      `INSERT INTO schedule_time
         (term_id, user_id, schedule_type_id, subject_id, schedule_day, start_time, end_time, target_score, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentTerm.term_id,
        userId,
        schedule_type_id,
        subject_id,
        schedule_day,
        start_time,
        end_time,
        null,
        null,
      ]
    );

    res.status(201).json({
      message: "Schedule time added successfully",
      schedule_time_id: result.insertId,
      user_id: userId,
      term_id: currentTerm.term_id,
      subject_id,
      subject_name: subjectRows[0].subject_name,
      schedule_day,
      start_time,
      end_time,
      schedule_type_id,
    });
  } catch (err) {
    console.error("addTime error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};