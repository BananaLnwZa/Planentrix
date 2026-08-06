import { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

const ALLOWED_SCHEDULE_TYPE_IDS = [2, 3]; // 2 = Study, 3 = Homework
const CLASS_SCHEDULE_TYPE_ID = 1;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const normalizeTime = (value: string) =>
  value.length === 5 ? `${value}:00` : value;

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    role?: string;
  };
};

interface TermRow extends RowDataPacket {
  term_id: number;
  user_id: number;
  term: number;
  semester: string;
  academic_year: number;
  term_status: number;
}

interface ScheduleItemRow extends RowDataPacket {
  schedule_time_id: number;
  schedule_type_id: number;
  schedule_type_name: string;
  subject_id: string;
  subject_name: string;
  teacher_name: string;
  credits: number;
  schedule_day: number;
  start_time: string;
  end_time: string;
  classroom: string | null;
  note: string | null;
}

interface ScheduleTimeRow extends RowDataPacket {
  schedule_time_id: number;
  term_id: number;
  user_id: number;
  schedule_type_id: number;
  subject_id: string;
  schedule_day: number | null;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  note: string | null;
}

interface SubjectSummaryRow extends RowDataPacket {
  subject_id: string;
  subject_name: string;
}

interface ScheduleConflictRow extends RowDataPacket {
  schedule_time_id: number;
  subject_name: string;
  start_time: string;
  end_time: string;
}

// ==========================================================================
// ดึงบล็อกตารางเวลาทั้งหมดของเทอมปัจจุบัน
// ==========================================================================
export const getScheduleForCurrentTerm = async (req: Request, res: Response) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const [currentTermRows] = await db.query<TermRow[]>(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC LIMIT 1`,
      [userId]
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    const currentTerm = currentTermRows[0];

    const [scheduleItems] = await db.query<ScheduleItemRow[]>(
      `SELECT
         st.schedule_time_id,
         st.schedule_type_id,
         sty.schedule_type_name,
         st.subject_id,
         s.subject_name,
         s.teacher_name,
         CAST(s.credits AS DOUBLE) AS credits,
         st.schedule_day,
         TIME_FORMAT(st.start_time, '%H:%i') AS start_time,
         TIME_FORMAT(st.end_time, '%H:%i') AS end_time,
         COALESCE(st.classroom, s.classroom) AS classroom,
         st.note
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       INNER JOIN schedule_types sty ON sty.schedule_type_id = st.schedule_type_id
       WHERE st.user_id = ? AND st.term_id = ?
       ORDER BY st.schedule_day, st.start_time, st.schedule_time_id`,
      [userId, currentTerm.term_id]
    );

    res.json({
      message: "Schedule retrieved successfully",
      user_id: userId,
      current_term: {
        term_id: currentTerm.term_id,
        term: currentTerm.term,
        academic_year: currentTerm.academic_year,
        semester: currentTerm.semester,
      },
      total: scheduleItems.length,
      data: scheduleItems,
    });
  } catch (err) {
    console.error("getScheduleForCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// ดึงรายวิชาที่เปิดใช้งานสำหรับเทอมปัจจุบัน เพื่อใช้เลือกสร้างบล็อกเวลา
// ==========================================================================
export const getSubjectsForCurrentTerm = async (req: Request, res: Response) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }

    const [currentTermRows] = await db.query<TermRow[]>(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC LIMIT 1`,
      [authUser.id]
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    const currentTerm = currentTermRows[0];
    const [subjects] = await db.query<SubjectSummaryRow[]>(
      `SELECT subject_id, subject_name
       FROM subjects
       WHERE term = ? AND academic_year = ? AND is_active = 1
       ORDER BY subject_name, subject_id`,
      [currentTerm.term, currentTerm.academic_year]
    );

    return res.json({
      message: "Current term subjects retrieved successfully",
      current_term: {
        term_id: currentTerm.term_id,
        term: currentTerm.term,
        academic_year: currentTerm.academic_year,
        semester: currentTerm.semester,
      },
      total: subjects.length,
      data: subjects,
    });
  } catch (err) {
    console.error("getSubjectsForCurrentTerm error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// ดูรายละเอียดตารางเวลา 1 รายการ โดยใช้ schedule_time_id (join กับ subjects)
// ==========================================================================
export const getScheduleTimeById = async (req: Request, res: Response) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { schedule_time_id } = req.params;

    const [rows] = await db.query<ScheduleItemRow[]>(
      `SELECT
         st.schedule_time_id,
         st.schedule_type_id,
         sty.schedule_type_name,
         st.schedule_day,
         TIME_FORMAT(st.start_time, '%H:%i') AS start_time,
         TIME_FORMAT(st.end_time, '%H:%i') AS end_time,
         COALESCE(st.classroom, s.classroom) AS classroom,
         st.note,
         s.subject_id,
         s.subject_name,
         s.teacher_name,
         CAST(s.credits AS DOUBLE) AS credits
       FROM schedule_time st
       INNER JOIN subjects s ON st.subject_id = s.subject_id
       INNER JOIN schedule_types sty ON sty.schedule_type_id = st.schedule_type_id
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
// แก้ไขรายการตารางเวลา
// โดยใช้ schedule_time_id
// ==========================================================================
export const updateScheduleTime = async (req: Request, res: Response) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { schedule_time_id } = req.params;
    const { schedule_day, start_time, end_time, classroom, note } = req.body;

    if (!schedule_time_id) {
      return res.status(400).json({ message: "schedule_time_id is required" });
    }

    if (
      schedule_day === undefined &&
      start_time === undefined &&
      end_time === undefined &&
      classroom === undefined &&
      note === undefined
    ) {
      return res.status(400).json({
        message:
          "At least one of schedule_day, start_time, end_time, classroom, note is required",
      });
    }

    const [existing] = await db.query<ScheduleTimeRow[]>(
      `SELECT * FROM schedule_time WHERE schedule_time_id = ? AND user_id = ?`,
      [schedule_time_id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Schedule time not found or does not belong to this user",
      });
    }

    const current = existing[0];
    const scheduleTypeId = Number(current.schedule_type_id);

    if (
      scheduleTypeId !== CLASS_SCHEDULE_TYPE_ID &&
      (classroom !== undefined || note !== undefined)
    ) {
      return res.status(400).json({
        message: "Study and homework schedules only allow day and time updates",
      });
    }

    const updatedScheduleDay =
      schedule_day !== undefined ? Number(schedule_day) : Number(current.schedule_day);
    if (
      !Number.isInteger(updatedScheduleDay) ||
      updatedScheduleDay < 1 ||
      updatedScheduleDay > 7
    ) {
      return res.status(400).json({
        message: "schedule_day must be an integer between 1 and 7",
      });
    }

    const updatedStartTime = String(
      start_time !== undefined ? start_time : current.start_time
    );
    const updatedEndTime = String(
      end_time !== undefined ? end_time : current.end_time
    );

    if (!timePattern.test(updatedStartTime) || !timePattern.test(updatedEndTime)) {
      return res.status(400).json({
        message: "start_time and end_time must use HH:mm or HH:mm:ss format",
      });
    }

    if (normalizeTime(updatedStartTime) >= normalizeTime(updatedEndTime)) {
      return res.status(400).json({
        message: "start_time must be before end_time",
      });
    }

    const [scheduleConflicts] = await db.query<ScheduleConflictRow[]>(
      `SELECT
         st.schedule_time_id,
         s.subject_name,
         TIME_FORMAT(st.start_time, '%H:%i') AS start_time,
         TIME_FORMAT(st.end_time, '%H:%i') AS end_time
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       WHERE st.user_id = ?
         AND st.term_id = ?
         AND st.schedule_day = ?
         AND st.schedule_time_id <> ?
         AND st.start_time < ?
         AND st.end_time > ?
       LIMIT 1`,
      [
        userId,
        current.term_id,
        updatedScheduleDay,
        schedule_time_id,
        normalizeTime(updatedEndTime),
        normalizeTime(updatedStartTime),
      ]
    );

    if (scheduleConflicts.length > 0) {
      return res.status(409).json({
        message: "ช่วงเวลานี้ทับซ้อนกับบล็อกเวลาอื่น",
        conflict: scheduleConflicts[0],
      });
    }

    const updatedClassroom =
      scheduleTypeId === CLASS_SCHEDULE_TYPE_ID
        ? classroom !== undefined
          ? classroom || null
          : current.classroom
        : null;
    const updatedNote =
      scheduleTypeId === CLASS_SCHEDULE_TYPE_ID
        ? note !== undefined
          ? note || null
          : current.note
        : null;

    if (
      updatedClassroom !== null &&
      (typeof updatedClassroom !== "string" || updatedClassroom.length > 10)
    ) {
      return res.status(400).json({
        message: "classroom must not exceed 10 characters",
      });
    }

    await db.query(
      `UPDATE schedule_time
       SET schedule_day = ?, start_time = ?, end_time = ?, classroom = ?, note = ?
       WHERE schedule_time_id = ? AND user_id = ?`,
      [
        updatedScheduleDay,
        updatedStartTime,
        updatedEndTime,
        updatedClassroom,
        updatedNote,
        schedule_time_id,
        userId,
      ]
    );

    res.json({
      message: "Schedule time updated successfully",
      schedule_time_id,
      user_id: userId,
      updated_data: {
        schedule_day: updatedScheduleDay,
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
    const authUser = (req as AuthenticatedRequest).user;
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

    const normalizedScheduleDay = Number(schedule_day);
    const normalizedStartTime = String(start_time);
    const normalizedEndTime = String(end_time);

    if (
      !Number.isInteger(normalizedScheduleDay) ||
      normalizedScheduleDay < 1 ||
      normalizedScheduleDay > 7
    ) {
      return res.status(400).json({
        message: "schedule_day must be an integer between 1 and 7",
      });
    }

    if (
      !timePattern.test(normalizedStartTime) ||
      !timePattern.test(normalizedEndTime)
    ) {
      return res.status(400).json({
        message: "start_time and end_time must use HH:mm or HH:mm:ss format",
      });
    }

    if (normalizeTime(normalizedStartTime) >= normalizeTime(normalizedEndTime)) {
      return res.status(400).json({
        message: "start_time must be before end_time",
      });
    }

    // 3. หาเทอมปัจจุบัน (term_status = 1)
    const [currentTermRows] = await db.query<TermRow[]>(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC LIMIT 1`,
      [userId]
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    const currentTerm = currentTermRows[0];

    // 4. วิชาที่เลือกต้องเป็นวิชาที่เปิดใช้งานและตรงกับเทอมปัจจุบัน
    const [subjectRows] = await db.query<SubjectSummaryRow[]>(
      `SELECT subject_id, subject_name
       FROM subjects
       WHERE subject_id = ?
         AND term = ?
         AND academic_year = ?
         AND is_active = 1
       LIMIT 1`,
      [subject_id, currentTerm.term, currentTerm.academic_year]
    );

    if (subjectRows.length === 0) {
      return res.status(404).json({
        message: "Active subject for the current term was not found",
      });
    }

    const [scheduleConflicts] = await db.query<ScheduleConflictRow[]>(
      `SELECT
         st.schedule_time_id,
         s.subject_name,
         TIME_FORMAT(st.start_time, '%H:%i') AS start_time,
         TIME_FORMAT(st.end_time, '%H:%i') AS end_time
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       WHERE st.user_id = ?
         AND st.term_id = ?
         AND st.schedule_day = ?
         AND st.start_time < ?
         AND st.end_time > ?
       LIMIT 1`,
      [
        userId,
        currentTerm.term_id,
        normalizedScheduleDay,
        normalizeTime(normalizedEndTime),
        normalizeTime(normalizedStartTime),
      ]
    );

    if (scheduleConflicts.length > 0) {
      return res.status(409).json({
        message: "ช่วงเวลานี้ทับซ้อนกับบล็อกเวลาอื่น",
        conflict: scheduleConflicts[0],
      });
    }

    // 5. บันทึกลง schedule_time
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO schedule_time
         (term_id, user_id, schedule_type_id, subject_id, schedule_day, start_time, end_time, target_score, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentTerm.term_id,
        userId,
        schedule_type_id,
        subject_id,
        normalizedScheduleDay,
        normalizedStartTime,
        normalizedEndTime,
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
      schedule_day: normalizedScheduleDay,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      schedule_type_id: Number(schedule_type_id),
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
    const authUser = (req as AuthenticatedRequest).user;
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

    const [existing] = await db.query<ScheduleTimeRow[]>(
      `SELECT * FROM schedule_time WHERE schedule_time_id = ? AND user_id = ?`,
      [schedule_time_id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Schedule time not found or does not belong to this user",
      });
    }

    if (Number(existing[0].schedule_type_id) === CLASS_SCHEDULE_TYPE_ID) {
      return res.status(403).json({
        message: "Class schedule blocks cannot be deleted",
      });
    }

    await db.query(
      `DELETE FROM schedule_time WHERE schedule_time_id = ? AND user_id = ?`,
      [schedule_time_id, userId]
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
