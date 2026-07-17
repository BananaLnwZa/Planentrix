import { Request, Response } from "express";
import db from "../../config/db";

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
      `SELECT * FROM terms WHERE term_status = 1 ORDER BY term_id DESC LIMIT 1`
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    const currentTerm = currentTermRows[0];

    const [subjects]: any = await db.query(
      `SELECT subject_id, subject_name FROM subjects WHERE term = ? AND academic_year = ?`,
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
// ดึงวิชาเรียนของเทอมปัจจุบัน แล้วบันทึกลงตาราง schedule_time
// (schedule_type_id = 1 (Class) เสมอ, ดึง classroom จาก subjects มาเก็บด้วย)
// ==========================================================================
const CLASS_SCHEDULE_TYPE_ID = 1; // "Class" ใน schedule_types

export const generateScheduleForCurrentTerm = async (req: Request, res: Response) => {
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
      `SELECT * FROM terms WHERE term_status = 1 ORDER BY term_id DESC LIMIT 1`
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    const currentTerm = currentTermRows[0];

    const [subjects]: any = await db.query(
      `SELECT * FROM subjects WHERE term = ? AND academic_year = ?`,
      [currentTerm.term, currentTerm.academic_year]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        message: "No subjects found for this term/academic_year",
      });
    }

    const inserted = [];
    const skipped: { subject_id: string; reason: string }[] = [];

    for (const subject of subjects) {
      const [existing]: any = await db.query(
        `SELECT * FROM schedule_time WHERE user_id = ? AND subject_id = ? AND term_id = ?`,
        [userId, subject.subject_id, currentTerm.term_id]
      );

      if (existing.length > 0) {
        skipped.push({ subject_id: subject.subject_id, reason: "already exists" });
        continue;
      }

      const [result]: any = await db.query(
        `INSERT INTO schedule_time
           (term_id, user_id, schedule_type_id, subject_id, schedule_day, start_time, end_time, classroom, target_score, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          currentTerm.term_id,
          userId,
          CLASS_SCHEDULE_TYPE_ID,
          subject.subject_id,
          subject.schedule_day,
          subject.start_time,
          subject.end_time,
          subject.classroom,
          null,
          null,
        ]
      );

      inserted.push({
        schedule_time_id: result.insertId,
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        classroom: subject.classroom,
      });
    }

    res.status(201).json({
      message: "Schedule generated and saved successfully",
      user_id: userId,
      term_id: currentTerm.term_id,
      total_subjects_found: subjects.length,
      newly_added: inserted.length,
      skipped_count: skipped.length,
      inserted,
      skipped,
    });
  } catch (err) {
    console.error("generateScheduleForCurrentTerm error:", err);
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