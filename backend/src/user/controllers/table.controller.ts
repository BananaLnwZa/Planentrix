import { Request, Response } from "express";
import db from "../../config/db";

const ALLOWED_SCHEDULE_TYPE_IDS = [2, 3]; // 2 = Study, 3 = Homework

// ==========================================================================
// ดึงวิชาเรียนของเทอมปัจจุบัน (แค่ดู ไม่บันทึก)
// (แสดงเฉพาะ subject_id และ subject_name)
// ==========================================================================
export const getScheduleForCurrentTerm = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const [currentTermRows]: any = await db.query(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC LIMIT 1`,
      [userId]
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    const currentTerm = currentTermRows[0];

    const [subjects]: any = await db.query(
      `SELECT subject_id, subject_name
       FROM subjects
       WHERE term = ? AND academic_year = ? AND is_active = 1`,
      [currentTerm.term, currentTerm.academic_year]
    );

    res.json({
      message: "Schedule retrieved successfully",
      user_id: userId,
      current_term: {
        term_id: currentTerm.term_id,
        term: currentTerm.term,
        academic_year: currentTerm.academic_year,
      },
      total: subjects.length,
      schedule_type: "วิชาเรียน",
      data: subjects,
    });
  } catch (err) {
    console.error("getScheduleForCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// ดูรายละเอียดตารางเวลา 1 รายการ โดยใช้ schedule_time_id (join กับ subjects)
// (ไม่แสดง term_id, user_id, schedule_type_id ใน response)
// ==========================================================================
export const getScheduleTimeById = async (req: Request, res: Response) => {
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

    const [rows]: any = await db.query(
      `SELECT
         st.schedule_time_id,
         st.schedule_day,
         st.start_time,
         st.end_time,
         st.classroom AS schedule_classroom,
         st.note,
         s.subject_id,
         s.subject_name,
         s.teacher_name
       FROM schedule_time st
       JOIN subjects s ON st.subject_id = s.subject_id
       WHERE st.schedule_time_id = ? AND st.user_id = ?`,
      [schedule_time_id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Schedule time not found or does not belong to this user",
      });
    }

    res.json({
      message: "Schedule time detail retrieved successfully",
      data: rows[0],
    });
  } catch (err) {
    console.error("getScheduleTimeById error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// แก้ไขรายการตารางเวลา (start_time, end_time, classroom, note)
// โดยใช้ schedule_time_id
// ==========================================================================
export const updateScheduleTime = async (req: Request, res: Response) => {
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
    const { start_time, end_time, classroom, note } = req.body;

    if (!schedule_time_id) {
      return res.status(400).json({ message: "schedule_time_id is required" });
    }

    if (
      start_time === undefined &&
      end_time === undefined &&
      classroom === undefined &&
      note === undefined
    ) {
      return res.status(400).json({
        message: "At least one of start_time, end_time, classroom, note is required",
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

    const current = existing[0];

    const updatedStartTime = start_time !== undefined ? start_time : current.start_time;
    const updatedEndTime = end_time !== undefined ? end_time : current.end_time;
    const updatedClassroom = classroom !== undefined ? classroom : current.classroom;
    const updatedNote = note !== undefined ? note : current.note;

    await db.query(
      `UPDATE schedule_time
       SET start_time = ?, end_time = ?, classroom = ?, note = ?
       WHERE schedule_time_id = ?`,
      [updatedStartTime, updatedEndTime, updatedClassroom, updatedNote, schedule_time_id]
    );

    res.json({
      message: "Schedule time updated successfully",
      schedule_time_id,
      user_id: userId,
      updated_data: {
        start_time: updatedStartTime,
        end_time: updatedEndTime,
        classroom: updatedClassroom,
        note: updatedNote,
      },
    });
  } catch (err) {
    console.error("updateScheduleTime error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

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
      `SELECT * FROM subjects WHERE subject_id = ? AND is_active = 1`,
      [subject_id]
    );

    if (subjectRows.length === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // 4. หาเทอมปัจจุบัน (term_status = 1)
    const [currentTermRows]: any = await db.query(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC LIMIT 1`,
      [userId]
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
