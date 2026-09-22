import type { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";
import { safelyGenerateRecommendation } from "../services/recommendation.engine";

interface WorkloadTypeRow extends RowDataPacket {
  workload_type_id: number;
  workload_type_name: string;
}

interface WorkloadOwnerRow extends RowDataPacket {
  workload_id: number;
  enrollment_id: number;
  status: "pending" | "completed" | "cancelled";
}

interface ScoreTotalRow extends RowDataPacket {
  total_max_score: number | string;
}

const authenticatedUserId = (req: Request, res: Response): number | null => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing user ID" });
    return null;
  }
  if (req.user.role && req.user.role !== "user") {
    res.status(403).json({ message: "Forbidden: user role required" });
    return null;
  }
  return Number(req.user.id);
};

const validDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const validTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

const findOwnedWorkload = async (userId: number, workloadId: number) => {
  const [rows] = await db.query<WorkloadOwnerRow[]>(
    `SELECT workload.workload_id, workload.enrollment_id, workload.status
     FROM workloads workload
     INNER JOIN enrollments enrollment
       ON enrollment.enrollment_id = workload.enrollment_id
     INNER JOIN student_terms student_term
       ON student_term.student_term_id = enrollment.student_term_id
     WHERE workload.workload_id = ?
       AND student_term.user_id = ?
       AND student_term.status = 'active'
       AND enrollment.status IN ('enrolled', 'completed')
     LIMIT 1`,
    [workloadId, userId],
  );
  return rows[0] ?? null;
};

const recommendationForWorkload = (userId: number, workloadId: number | null) =>
  safelyGenerateRecommendation({
    userId,
    triggerType: "workload_changed",
    workloadId,
  });

export const getSubjectsForWorkload = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT enrollment.enrollment_id AS schedule_time_id,
              subject.subject_id,
              subject.subject_name,
              COALESCE(
                GROUP_CONCAT(
                  DISTINCT CONCAT(instructor.first_name, ' ', instructor.last_name)
                  ORDER BY instructor.first_name, instructor.last_name
                  SEPARATOR ', '
                ),
                '-'
              ) AS teacher_name
       FROM student_terms student_term
       INNER JOIN enrollments enrollment
         ON enrollment.student_term_id = student_term.student_term_id
        AND enrollment.status IN ('enrolled', 'completed')
       INNER JOIN course_sections section
         ON section.section_id = enrollment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       LEFT JOIN section_instructors section_instructor
         ON section_instructor.section_id = section.section_id
       LEFT JOIN admin instructor
         ON instructor.admin_id = section_instructor.instructor_id
       WHERE student_term.user_id = ? AND student_term.status = 'active'
       GROUP BY enrollment.enrollment_id, subject.subject_id, subject.subject_name
       ORDER BY subject.subject_name ASC`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No subjects found for the current term",
      });
    }

    return res.json({
      message: "Subjects retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("getSubjectsForWorkload error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createWorkload = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;

    const enrollmentId = Number(req.body.schedule_time_id);
    const workloadTypeId = Number(req.body.workload_type_id);
    const workloadName = String(req.body.workload_name ?? "").trim();
    const deadlineDate = req.body.deadline_date;
    const deadlineTime = req.body.deadline_time;
    const note = String(req.body.note ?? "").trim() || null;

    if (
      !Number.isInteger(enrollmentId) ||
      enrollmentId <= 0 ||
      !Number.isInteger(workloadTypeId) ||
      workloadTypeId <= 0 ||
      !workloadName ||
      !validDate(deadlineDate) ||
      !validTime(deadlineTime)
    ) {
      return res.status(400).json({
        message:
          "A valid schedule_time_id, workload_type_id, workload_name, deadline_date, and deadline_time are required",
      });
    }

    const [[typeRows], [enrollmentRows]] = await Promise.all([
      db.query<WorkloadTypeRow[]>(
        `SELECT workload_type_id, type_name AS workload_type_name
         FROM workload_types
         WHERE workload_type_id = ? AND is_active = 1
         LIMIT 1`,
        [workloadTypeId],
      ),
      db.query<RowDataPacket[]>(
        `SELECT enrollment.enrollment_id
         FROM enrollments enrollment
         INNER JOIN student_terms student_term
           ON student_term.student_term_id = enrollment.student_term_id
         WHERE enrollment.enrollment_id = ?
           AND student_term.user_id = ?
           AND student_term.status = 'active'
           AND enrollment.status = 'enrolled'
         LIMIT 1`,
        [enrollmentId, userId],
      ),
    ]);

    if (!typeRows[0]) {
      return res.status(400).json({ message: "Invalid workload_type_id" });
    }
    if (!enrollmentRows[0]) {
      return res.status(404).json({
        message: "schedule_time_id not found or does not belong to this user",
      });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO workloads
         (enrollment_id, workload_type_id, workload_name, deadline_date,
          deadline_time, note, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        enrollmentId,
        workloadTypeId,
        workloadName,
        deadlineDate,
        deadlineTime,
        note,
      ],
    );
    const recommendationResult = await recommendationForWorkload(
      userId,
      result.insertId,
    );

    return res.status(201).json({
      message: "Workload created successfully",
      workload_id: result.insertId,
      user_id: userId,
      schedule_time_id: enrollmentId,
      workload_type_id: workloadTypeId,
      workload_type_name: typeRows[0].workload_type_name,
      workload_name: workloadName,
      deadline_date: deadlineDate,
      deadline_time: deadlineTime,
      note,
      schedule_recommendation: recommendationResult.recommendation,
      recommendation_warning: recommendationResult.warning,
    });
  } catch (error) {
    console.error("createWorkload error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateWorkload = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;

    const workloadId = Number(req.params.workload_id);
    const workloadName = String(req.body.workload_name ?? "").trim();
    const deadlineDate = req.body.deadline_date;
    const deadlineTime = req.body.deadline_time;
    const note = String(req.body.note ?? "").trim() || null;
    if (
      !Number.isInteger(workloadId) ||
      workloadId <= 0 ||
      !workloadName ||
      !validDate(deadlineDate) ||
      !validTime(deadlineTime)
    ) {
      return res.status(400).json({
        message:
          "A valid workload_id, workload_name, deadline_date, and deadline_time are required",
      });
    }

    const existing = await findOwnedWorkload(userId, workloadId);
    if (!existing) {
      return res.status(404).json({
        message: "Workload not found or does not belong to this user",
      });
    }
    if (existing.status !== "pending") {
      return res.status(409).json({
        message: "A finished workload cannot be edited",
      });
    }

    await db.query(
      `UPDATE workloads
       SET workload_name = ?, deadline_date = ?, deadline_time = ?, note = ?
       WHERE workload_id = ?`,
      [workloadName, deadlineDate, deadlineTime, note, workloadId],
    );
    const recommendationResult = await recommendationForWorkload(
      userId,
      workloadId,
    );

    return res.json({
      message: "Workload updated successfully",
      workload_id: workloadId,
      workload_name: workloadName,
      deadline_date: deadlineDate,
      deadline_time: deadlineTime,
      note,
      schedule_recommendation: recommendationResult.recommendation,
      recommendation_warning: recommendationResult.warning,
    });
  } catch (error) {
    console.error("updateWorkload error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteWorkload = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const workloadId = Number(req.params.workload_id);
    if (!Number.isInteger(workloadId) || workloadId <= 0) {
      return res.status(400).json({ message: "A valid workload_id is required" });
    }

    const existing = await findOwnedWorkload(userId, workloadId);
    if (!existing || existing.status !== "pending") {
      return res.status(404).json({
        message: "Pending workload not found or does not belong to this user",
      });
    }
    await db.query("DELETE FROM workloads WHERE workload_id = ?", [workloadId]);
    const recommendationResult = await recommendationForWorkload(userId, null);

    return res.json({
      message: "Workload deleted successfully",
      workload_id: workloadId,
      schedule_recommendation: recommendationResult.recommendation,
      recommendation_warning: recommendationResult.warning,
    });
  } catch (error) {
    console.error("deleteWorkload error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const finishWorkload = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const workloadId = Number(req.params.workload_id);
    if (!Number.isInteger(workloadId) || workloadId <= 0) {
      return res.status(400).json({ message: "A valid workload_id is required" });
    }

    const existing = await findOwnedWorkload(userId, workloadId);
    if (!existing) {
      return res.status(404).json({
        message: "Workload not found or does not belong to this user",
      });
    }
    if (existing.status === "completed") {
      return res.status(400).json({ message: "This workload is already finished" });
    }
    if (existing.status !== "pending") {
      return res.status(409).json({ message: "This workload cannot be finished" });
    }

    await db.query(
      `UPDATE workloads
       SET status = 'completed', finished_at = NOW()
       WHERE workload_id = ?`,
      [workloadId],
    );
    const recommendationResult = await recommendationForWorkload(
      userId,
      workloadId,
    );
    return res.json({
      message: "Workload finished successfully",
      workload_id: workloadId,
      user_id: userId,
      schedule_recommendation: recommendationResult.recommendation,
      recommendation_warning: recommendationResult.warning,
    });
  } catch (error) {
    console.error("finishWorkload error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getPendingWorkloads = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;

    const [overviewRows] = await db.query<RowDataPacket[]>(
      `SELECT
         EXISTS(
           SELECT 1 FROM student_terms
           WHERE user_id = ? AND status = 'active'
         ) AS has_current_term,
         EXISTS(
           SELECT 1
           FROM workloads workload
           INNER JOIN enrollments enrollment
             ON enrollment.enrollment_id = workload.enrollment_id
           INNER JOIN student_terms student_term
             ON student_term.student_term_id = enrollment.student_term_id
           WHERE student_term.user_id = ?
             AND student_term.status = 'active'
         ) AS has_workloads`,
      [userId, userId],
    );
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT workload.workload_id,
              workload.workload_name,
              workload.workload_type_id,
              workload_type.type_name AS workload_type_name,
              workload.enrollment_id AS schedule_time_id,
              subject.subject_id,
              subject.subject_name,
              DATE_FORMAT(workload.deadline_date, '%Y-%m-%d') AS deadline_date,
              TIME_FORMAT(workload.deadline_time, '%H:%i:%s') AS deadline_time,
              workload.note,
              workload.created_at AS create_at,
              workload.status AS workload_status
       FROM workloads workload
       INNER JOIN workload_types workload_type
         ON workload_type.workload_type_id = workload.workload_type_id
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = workload.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       INNER JOIN course_sections section
         ON section.section_id = enrollment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       WHERE student_term.user_id = ?
         AND student_term.status = 'active'
         AND workload.status = 'pending'
       ORDER BY workload.deadline_date ASC, workload.deadline_time ASC`,
      [userId],
    );

    return res.json({
      message: "Pending workloads retrieved successfully",
      user_id: userId,
      total: rows.length,
      has_current_term: Boolean(Number(overviewRows[0]?.has_current_term)),
      has_workloads: Boolean(Number(overviewRows[0]?.has_workloads)),
      data: rows,
    });
  } catch (error) {
    console.error("getPendingWorkloads error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const saveWorkloadScore = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const workloadId = Number(req.body.workload_id);
    const actualScore = Number(req.body.actual_score);
    const maxScore = Number(req.body.max_score);
    if (
      !Number.isInteger(workloadId) ||
      workloadId <= 0 ||
      !Number.isFinite(actualScore) ||
      !Number.isFinite(maxScore) ||
      actualScore < 0 ||
      maxScore <= 0 ||
      actualScore > maxScore
    ) {
      return res.status(400).json({
        message:
          "A valid workload_id and score range (0 <= actual_score <= max_score) are required",
      });
    }

    const workload = await findOwnedWorkload(userId, workloadId);
    if (!workload) {
      return res.status(404).json({
        message: "Workload not found or does not belong to this user",
      });
    }
    if (workload.status !== "completed") {
      return res.status(400).json({
        message: "Score can only be saved for a finished workload",
      });
    }

    const [totalRows] = await db.query<ScoreTotalRow[]>(
      `SELECT COALESCE(SUM(score.max_score), 0) AS total_max_score
       FROM workloads workload
       LEFT JOIN score ON score.workload_id = workload.workload_id
       WHERE workload.enrollment_id = ? AND workload.workload_id <> ?`,
      [workload.enrollment_id, workloadId],
    );
    if (Number(totalRows[0]?.total_max_score ?? 0) + maxScore > 100) {
      return res.status(400).json({
        message: "The accumulated maximum score for a subject cannot exceed 100",
      });
    }

    const [existingScores] = await db.query<RowDataPacket[]>(
      "SELECT score_id FROM score WHERE workload_id = ? LIMIT 1",
      [workloadId],
    );
    if (existingScores[0]) {
      await db.query(
        `UPDATE score
         SET actual_score = ?, max_score = ?, updated_at = NOW()
         WHERE workload_id = ?`,
        [actualScore, maxScore, workloadId],
      );
    } else {
      await db.query(
        `INSERT INTO score (workload_id, actual_score, max_score)
         VALUES (?, ?, ?)`,
        [workloadId, actualScore, maxScore],
      );
    }

    const recommendationResult = await recommendationForWorkload(
      userId,
      workloadId,
    );
    return res.status(existingScores[0] ? 200 : 201).json({
      message: existingScores[0] ? "Score updated successfully" : "Score saved successfully",
      workload_id: workloadId,
      actual_score: actualScore,
      max_score: maxScore,
      schedule_recommendation: recommendationResult.recommendation,
      recommendation_warning: recommendationResult.warning,
    });
  } catch (error) {
    console.error("saveWorkloadScore error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
