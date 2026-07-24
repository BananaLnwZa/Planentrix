import { Request, Response } from "express";
import db from "../../config/db";

// ==========================================================================
// ดึงรายชื่อวิชาสำหรับเลือกตอน "เพิ่มภาระงาน"
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
// รับ workload_type_id เป็นตัวเลขตรงๆ จาก body (ไม่ต้องแปลงจากชื่อ)
// create_at = NOW() ตอน insert อัตโนมัติ
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
      workload_type_id,
      workload_name,
      deadline_date,
      deadline_time,
      note,
    } = req.body;

    if (!schedule_time_id || !workload_type_id || !workload_name || !deadline_date || !deadline_time) {
      return res.status(400).json({
        message:
          "schedule_time_id, workload_type_id, workload_name, deadline_date, deadline_time are required",
      });
    }

    // เช็คว่า workload_type_id ที่ส่งมามีอยู่จริงในตาราง workload_types
    const [typeRows]: any = await db.query(
      `SELECT workload_type_id, workload_type_name FROM workload_types WHERE workload_type_id = ?`,
      [workload_type_id]
    );

    if (typeRows.length === 0) {
      const [allTypes]: any = await db.query(
        `SELECT workload_type_id, workload_type_name FROM workload_types`
      );
      return res.status(400).json({
        message: "Invalid workload_type_id",
        valid_options: allTypes,
      });
    }

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
      `INSERT INTO workloads
         (workload_name, workload_type_id, schedule_time_id, deadline_date, deadline_time, note, create_at, workload_status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        workload_name,
        workload_type_id,
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
      workload_type_id,
      workload_type_name: typeRows[0].workload_type_name,
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

// ==========================================================================
// จบงาน (กด "เสร็จแล้ว") — บันทึก finish_at = NOW() และเปลี่ยน workload_status = 1
// ==========================================================================
export const finishWorkload = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { workload_id } = req.params;

    if (!workload_id) {
      return res.status(400).json({ message: "workload_id is required" });
    }

    const [existing]: any = await db.query(
      `SELECT w.* FROM workloads w
       JOIN schedule_time st ON w.schedule_time_id = st.schedule_time_id
       WHERE w.workload_id = ? AND st.user_id = ?`,
      [workload_id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Workload not found or does not belong to this user",
      });
    }

    if (existing[0].workload_status === 1) {
      return res.status(400).json({ message: "This workload is already finished" });
    }

    await db.query(
      `UPDATE workloads SET workload_status = 1, finish_at = NOW() WHERE workload_id = ?`,
      [workload_id]
    );

    res.json({
      message: "Workload finished successfully",
      workload_id,
      user_id: userId,
    });
  } catch (err) {
    console.error("finishWorkload error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};