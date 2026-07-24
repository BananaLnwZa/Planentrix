import { Request, Response } from "express";
import db from "../../config/db";

// ==========================================================================
// ดึงรายชื่อวิชาสำหรับเลือกตอน "เพิ่มภาระงาน"
// กรองจาก: เทอมที่ยังไม่จบ (term_status = 1) + schedule_time_id + schedule_type_id
// แสดง: รหัสวิชา, ชื่อวิชา, ชื่อผู้สอน
// ==========================================================================
export const getSubjectsForWorkload = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { schedule_type_id } = req.query;

    let query = `
      SELECT
        st.schedule_time_id,
        s.subject_id,
        s.subject_name,
        s.teacher_name
      FROM schedule_time st
      JOIN subjects s ON st.subject_id = s.subject_id
      JOIN terms t ON st.term_id = t.term_id
      WHERE st.user_id = ? AND t.term_status = 1
    `;
    const params: any[] = [userId];

    if (schedule_type_id) {
      query += ` AND st.schedule_type_id = ?`;
      params.push(schedule_type_id);
    }

    query += ` ORDER BY s.subject_name ASC`;

    const [rows]: any = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No subjects found for the current (unfinished) term",
      });
    }

    res.json({
      message: "Subjects retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getSubjectsForWorkload error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// เพิ่มภาระงาน (ตามฟอร์ม: วิชา, ประเภท, ชื่องาน, กำหนดส่ง, โน้ต)
// แปลงชื่อประเภทงาน → workload_type_id โดย query จากตาราง workload_types จริง
// ==========================================================================
export const createWorkload = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const {
      schedule_time_id,
      workload_type,
      workload_name,
      deadline_date,
      deadline_time,
      note,
    } = req.body;

    if (!schedule_time_id || !workload_type || !workload_name || !deadline_date || !deadline_time) {
      return res.status(400).json({
        message:
          "schedule_time_id, workload_type, workload_name, deadline_date, deadline_time are required",
      });
    }

    const [typeRows]: any = await db.query(
      `SELECT workload_type_id FROM workload_types WHERE workload_type_name = ?`,
      [String(workload_type).toLowerCase()]
    );

    if (typeRows.length === 0) {
      const [allTypes]: any = await db.query(`SELECT workload_type_name FROM workload_types`);
      return res.status(400).json({
        message: `Invalid workload_type. Must be one of: ${allTypes
          .map((t: any) => t.workload_type_name)
          .join(", ")}`,
      });
    }

    const workloadTypeId = typeRows[0].workload_type_id;

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
      `INSERT INTO workload
         (workload_name, workload_type_id, schedule_time_id, deadline_date, deadline_time, note, workload_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        workload_name,
        workloadTypeId,
        schedule_time_id,
        deadline_date,
        deadline_time,
        note || null,
        0,
      ]
    );

    res.status(201).json({
      message: "Workload created successfully",
      workload_id: result.insertId,
      user_id: userId,
      schedule_time_id,
      workload_type: String(workload_type).toLowerCase(),
      workload_type_id: workloadTypeId,
      workload_name,
      deadline_date,
      deadline_time,
      note: note || null,
    });
  } catch (err) {
    console.error("createWorkload error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};