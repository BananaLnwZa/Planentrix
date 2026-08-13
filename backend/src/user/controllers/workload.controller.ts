import { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

type UserRequest = Request & {
  user?: { id?: number | string; role?: string };
};

interface EditableWorkloadRow extends RowDataPacket {
  workload_id: number;
  workload_status: number;
}

interface ScoreTotalRow extends RowDataPacket {
  total_max_score: number | string;
}

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

    const query = `
      SELECT
        st.schedule_time_id,
        s.subject_id,
        s.subject_name,
        s.teacher_name
      FROM schedule_time st
      JOIN subjects s ON st.subject_id = s.subject_id
      JOIN terms t ON st.term_id = t.term_id
      WHERE st.user_id = ?
        AND t.user_id = ?
        AND t.term_status = 1
        AND st.schedule_type_id = 1
      ORDER BY s.subject_name ASC
    `;

    const [rows]: any = await db.query(query, [userId, userId]);

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
      `SELECT st.*
       FROM schedule_time st
       INNER JOIN terms t ON t.term_id = st.term_id
       WHERE st.schedule_time_id = ?
         AND st.user_id = ?
         AND st.schedule_type_id = 1
         AND t.user_id = ?
         AND t.term_status = 1`,
      [schedule_time_id, userId, userId]
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
// แก้ไขข้อมูลงานที่ยังไม่ส่ง
// ==========================================================================
export const updateWorkload = async (req: Request, res: Response) => {
  try {
    const authUser = (req as UserRequest).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }

    const userId = authUser.id;
    const workloadId = Number(req.params.workload_id);
    const workloadName = String(req.body.workload_name ?? "").trim();
    const deadlineDate = String(req.body.deadline_date ?? "").trim();
    const deadlineTime = String(req.body.deadline_time ?? "").trim();
    const note = String(req.body.note ?? "").trim();

    if (
      !Number.isInteger(workloadId) ||
      workloadId <= 0 ||
      !workloadName ||
      !/^\d{4}-\d{2}-\d{2}$/.test(deadlineDate) ||
      !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(deadlineTime)
    ) {
      return res.status(400).json({
        message:
          "A valid workload_id, workload_name, deadline_date, and deadline_time are required",
      });
    }

    const [existing] = await db.query<EditableWorkloadRow[]>(
      `SELECT w.workload_id, w.workload_status
       FROM workloads w
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       INNER JOIN terms t ON t.term_id = st.term_id
       WHERE w.workload_id = ?
         AND st.user_id = ?
         AND st.schedule_type_id = 1
         AND t.user_id = ?
         AND t.term_status = 1
       LIMIT 1`,
      [workloadId, userId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Workload not found or does not belong to this user",
      });
    }
    if (Number(existing[0].workload_status) !== 0) {
      return res.status(409).json({
        message: "A finished workload cannot be edited",
      });
    }

    await db.query(
      `UPDATE workloads
       SET workload_name = ?, deadline_date = ?, deadline_time = ?, note = ?
       WHERE workload_id = ?`,
      [workloadName, deadlineDate, deadlineTime, note || null, workloadId]
    );

    return res.json({
      message: "Workload updated successfully",
      workload_id: workloadId,
      workload_name: workloadName,
      deadline_date: deadlineDate,
      deadline_time: deadlineTime,
      note: note || null,
    });
  } catch (err) {
    console.error("updateWorkload error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// ลบงานที่ยังไม่ส่ง
// ==========================================================================
export const deleteWorkload = async (req: Request, res: Response) => {
  try {
    const authUser = (req as UserRequest).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }

    const workloadId = Number(req.params.workload_id);
    if (!Number.isInteger(workloadId) || workloadId <= 0) {
      return res.status(400).json({ message: "A valid workload_id is required" });
    }

    const [result] = await db.query<ResultSetHeader>(
      `DELETE w
       FROM workloads w
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       INNER JOIN terms t ON t.term_id = st.term_id
       WHERE w.workload_id = ?
         AND st.user_id = ?
         AND st.schedule_type_id = 1
         AND t.user_id = ?
         AND t.term_status = 1
         AND w.workload_status = 0`,
      [workloadId, authUser.id, authUser.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Pending workload not found or does not belong to this user",
      });
    }

    return res.json({
      message: "Workload deleted successfully",
      workload_id: workloadId,
    });
  } catch (err) {
    console.error("deleteWorkload error:", err);
    return res.status(500).json({ message: "Internal server error" });
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
       JOIN terms t ON t.term_id = st.term_id
       WHERE w.workload_id = ?
         AND st.user_id = ?
         AND st.schedule_type_id = 1
         AND t.user_id = ?
         AND t.term_status = 1`,
      [workload_id, userId, userId]
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

// ==========================================================================
// แสดงภาระงานที่ยังไม่เสร็จสิ้น (workload_status = 0)
// เรียงตามกำหนดส่ง (deadline_date, deadline_time) จากใกล้ไปไกล
// ==========================================================================
export const getPendingWorkloads = async (req: Request, res: Response) => {
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
         w.workload_id,
         w.workload_name,
         w.workload_type_id,
         wt.workload_type_name,
         w.schedule_time_id,
         s.subject_id,
         s.subject_name,
         DATE_FORMAT(w.deadline_date, '%Y-%m-%d') AS deadline_date,
         TIME_FORMAT(w.deadline_time, '%H:%i:%s') AS deadline_time,
         w.note,
         w.create_at,
         w.workload_status
       FROM workloads w
       JOIN schedule_time st ON w.schedule_time_id = st.schedule_time_id
       JOIN subjects s ON st.subject_id = s.subject_id
       JOIN workload_types wt ON w.workload_type_id = wt.workload_type_id
       JOIN terms t ON st.term_id = t.term_id
       WHERE st.user_id = ?
         AND t.user_id = ?
         AND t.term_status = 1
         AND st.schedule_type_id = 1
         AND w.workload_status = 0
       ORDER BY w.deadline_date ASC, w.deadline_time ASC`,
      [userId, userId]
    );

    res.json({
      message: "Pending workloads retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getPendingWorkloads error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// บันทึกคะแนน (actual_score, max_score) ของภาระงานที่เสร็จแล้ว ลงตาราง score
// เฉพาะ workload ที่ workload_status = 1 (เสร็จแล้ว) เท่านั้น
// ==========================================================================
export const saveWorkloadScore = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const { workload_id, actual_score, max_score } = req.body;

    if (!workload_id || actual_score === undefined || max_score === undefined) {
      return res.status(400).json({
        message: "workload_id, actual_score, max_score are required",
      });
    }

    const actualScoreNum = Number(actual_score);
    const maxScoreNum = Number(max_score);

    if (isNaN(actualScoreNum) || isNaN(maxScoreNum)) {
      return res.status(400).json({ message: "actual_score and max_score must be numbers" });
    }

    if (actualScoreNum < 0 || maxScoreNum <= 0 || actualScoreNum > maxScoreNum) {
      return res.status(400).json({
        message: "Invalid score range: 0 <= actual_score <= max_score, and max_score > 0",
      });
    }

    const [existingWorkload]: any = await db.query(
      `SELECT w.* FROM workloads w
       JOIN schedule_time st ON w.schedule_time_id = st.schedule_time_id
       JOIN terms t ON t.term_id = st.term_id
       WHERE w.workload_id = ?
         AND st.user_id = ?
         AND st.schedule_type_id = 1
         AND t.user_id = ?
         AND t.term_status = 1`,
      [workload_id, userId, userId]
    );

    if (existingWorkload.length === 0) {
      return res.status(404).json({
        message: "Workload not found or does not belong to this user",
      });
    }

    if (existingWorkload[0].workload_status !== 1) {
      return res.status(400).json({
        message: "Score can only be saved for a finished workload (workload_status = 1)",
      });
    }

    const [scoreTotalRows] = await db.query<ScoreTotalRow[]>(
      `SELECT COALESCE(SUM(sc.max_score), 0) AS total_max_score
       FROM workloads w
       LEFT JOIN score sc ON sc.workload_id = w.workload_id
       WHERE w.schedule_time_id = ? AND w.workload_id <> ?`,
      [existingWorkload[0].schedule_time_id, workload_id]
    );
    const otherMaximumScore = Number(scoreTotalRows[0]?.total_max_score) || 0;
    if (otherMaximumScore + maxScoreNum > 100) {
      return res.status(400).json({
        message: "The accumulated maximum score for a subject cannot exceed 100",
      });
    }

    const [existingScore]: any = await db.query(
      `SELECT * FROM score WHERE workload_id = ?`,
      [workload_id]
    );

    if (existingScore.length > 0) {
      await db.query(
        `UPDATE score SET actual_score = ?, max_score = ? WHERE workload_id = ?`,
        [actualScoreNum, maxScoreNum, workload_id]
      );

      return res.json({
        message: "Score updated successfully",
        workload_id,
        actual_score: actualScoreNum,
        max_score: maxScoreNum,
      });
    }

    const [result]: any = await db.query(
      `INSERT INTO score (workload_id, actual_score, max_score) VALUES (?, ?, ?)`,
      [workload_id, actualScoreNum, maxScoreNum]
    );

    res.status(201).json({
      message: "Score saved successfully",
      score_id: result.insertId,
      workload_id,
      actual_score: actualScoreNum,
      max_score: maxScoreNum,
    });
  } catch (err) {
    console.error("saveWorkloadScore error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
