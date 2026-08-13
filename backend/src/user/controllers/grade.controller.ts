import { Request, Response } from "express";
import type { RowDataPacket } from "mysql2";
import db from "../../config/db";

const CLASS_SCHEDULE_TYPE_ID = 1;

const GRADE_TO_GPA: Record<string, number> = {
  A: 4,
  "B+": 3.5,
  B: 3,
  "C+": 2.5,
  C: 2,
  "D+": 1.5,
  D: 1,
  F: 0,
};

const PERCENT_TO_GRADE: { min: number; grade: string; gpa: number }[] = [
  { min: 80, grade: "A", gpa: 4 },
  { min: 75, grade: "B+", gpa: 3.5 },
  { min: 70, grade: "B", gpa: 3 },
  { min: 65, grade: "C+", gpa: 2.5 },
  { min: 60, grade: "C", gpa: 2 },
  { min: 55, grade: "D+", gpa: 1.5 },
  { min: 50, grade: "D", gpa: 1 },
  { min: 0, grade: "F", gpa: 0 },
];

interface AuthenticatedRequest extends Request {
  user?: { id: number; role?: string };
}

interface CurrentTermRow extends RowDataPacket {
  term_id: number;
  term: number;
  academic_year: number;
  semester: string;
}

interface SubjectGoalRow extends RowDataPacket {
  schedule_time_id: number;
  subject_id: string;
  subject_name: string;
  credits: number | string;
  teacher_name: string;
  target_score: number | string | null;
}

interface WorkloadRow extends RowDataPacket {
  schedule_time_id: number;
  workload_id: number;
  workload_name: string;
  workload_type_id: number;
  workload_type_name: string;
  deadline_date: Date | string;
  deadline_time: string;
  workload_status: string;
  actual_score: number | string | null;
  max_score: number | string | null;
}

interface SubjectScoreSummaryRow extends RowDataPacket {
  schedule_time_id: number;
  credits: number | string;
  total_actual: number | string | null;
  total_max: number | string | null;
}

const getAuthenticatedUserId = (
  req: AuthenticatedRequest,
  res: Response
): number | null => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing user ID" });
    return null;
  }
  if (req.user.role && req.user.role !== "user") {
    res.status(403).json({ message: "Forbidden: user role required" });
    return null;
  }
  return req.user.id;
};

const getCurrentTerm = async (userId: number) => {
  const [rows] = await db.query<CurrentTermRow[]>(
    `SELECT term_id, term, academic_year, semester
     FROM terms
     WHERE user_id = ? AND term_status = 1
     ORDER BY term_id DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
};

const percentToGrade = (percent: number) =>
  PERCENT_TO_GRADE.find((range) => percent >= range.min) ??
  PERCENT_TO_GRADE[PERCENT_TO_GRADE.length - 1];

const numberOrNull = (value: number | string | null) =>
  value === null ? null : Number(value);

const gradeFromGpa = (gpa: number | string | null) => {
  if (gpa === null) return null;
  const numericGpa = Number(gpa);
  return (
    Object.entries(GRADE_TO_GPA).find(([, value]) => value === numericGpa)?.[0] ??
    null
  );
};

const gradeFromGpaBand = (gpa: number) => {
  if (gpa >= 4) return "A";
  if (gpa >= 3.5) return "B+";
  if (gpa >= 3) return "B";
  if (gpa >= 2.5) return "C+";
  if (gpa >= 2) return "C";
  if (gpa >= 1.5) return "D+";
  if (gpa >= 1) return "D";
  return "F";
};

export const calculateWeightedGradeSummary = (
  subjects: Array<{
    credits: number;
    actualScore: number;
    maximumScore: number;
  }>
) => {
  let totalCredits = 0;
  let weightedGpa = 0;
  let weightedPercent = 0;
  let totalActualScore = 0;
  let totalMaximumScore = 0;

  for (const subject of subjects) {
    const credits = Number.isFinite(subject.credits)
      ? Math.max(subject.credits, 0)
      : 0;
    const actualScore = Number.isFinite(subject.actualScore)
      ? Math.max(subject.actualScore, 0)
      : 0;
    const maximumScore = Number.isFinite(subject.maximumScore)
      ? Math.max(subject.maximumScore, 0)
      : 0;
    // Each subject is accumulated directly on a 100-point scale. The sum of
    // max_score is only used to limit score entry; it must not make an early
    // 8/10 look like 80/100 before the remaining coursework is graded.
    const percent = Math.min(actualScore, 100);
    const grade = percentToGrade(percent);

    totalCredits += credits;
    weightedGpa += grade.gpa * credits;
    weightedPercent += percent * credits;
    totalActualScore += actualScore;
    totalMaximumScore += maximumScore;
  }

  const gpa = totalCredits > 0 ? weightedGpa / totalCredits : 0;
  const percent = totalCredits > 0 ? weightedPercent / totalCredits : 0;

  return {
    gpa,
    grade: gradeFromGpaBand(gpa),
    percent,
    totalCredits,
    totalActualScore,
    totalMaximumScore,
  };
};

const loadCurrentSubjectGoals = async (userId: number, termId: number) => {
  const [rows] = await db.query<SubjectGoalRow[]>(
    `SELECT
       st.schedule_time_id,
       s.subject_id,
       s.subject_name,
       s.credits,
       s.teacher_name,
       st.target_score
     FROM schedule_time st
     INNER JOIN subjects s ON s.subject_id = st.subject_id
     WHERE st.user_id = ?
       AND st.term_id = ?
       AND st.schedule_type_id = ?
     ORDER BY s.subject_name ASC, st.schedule_time_id ASC`,
    [userId, termId, CLASS_SCHEDULE_TYPE_ID]
  );
  return rows;
};

export const getAllScheduleTime = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (userId === null) return;

    const currentTerm = await getCurrentTerm(userId);
    if (!currentTerm) {
      return res.status(404).json({ message: "No current term found" });
    }

    const rows = await loadCurrentSubjectGoals(userId, currentTerm.term_id);
    return res.json({
      message: "Current-term class schedule retrieved successfully",
      current_term: currentTerm,
      schedule_type_id: CLASS_SCHEDULE_TYPE_ID,
      total: rows.length,
      data: rows.map((row) => ({
        ...row,
        credits: Number(row.credits),
        target_score: numberOrNull(row.target_score),
        target_grade: gradeFromGpa(row.target_score),
      })),
    });
  } catch (error) {
    console.error("getAllScheduleTime error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Legacy single-subject endpoint. Existing targets remain immutable.
export const saveGrade = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (userId === null) return;

    const scheduleTimeId = Number(req.params.id);
    const normalizedGrade = String(req.body.grade ?? "").toUpperCase();
    const gpa = GRADE_TO_GPA[normalizedGrade];
    if (!Number.isInteger(scheduleTimeId) || gpa === undefined) {
      return res.status(400).json({
        message: `A valid schedule_time_id and grade (${Object.keys(GRADE_TO_GPA).join(
          ", "
        )}) are required`,
      });
    }

    const currentTerm = await getCurrentTerm(userId);
    if (!currentTerm) {
      return res.status(404).json({ message: "No current term found" });
    }

    const [rows] = await db.query<SubjectGoalRow[]>(
      `SELECT st.schedule_time_id, st.subject_id, st.target_score,
              s.subject_name, s.credits, s.teacher_name
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       WHERE st.schedule_time_id = ? AND st.user_id = ? AND st.term_id = ?
         AND st.schedule_type_id = ?
       LIMIT 1`,
      [scheduleTimeId, userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Current-term class was not found" });
    }
    if (rows[0].target_score !== null) {
      return res.status(409).json({ message: "Grade goal has already been finalized" });
    }

    await db.query(
      `UPDATE schedule_time SET target_score = ?
       WHERE schedule_time_id = ? AND user_id = ? AND target_score IS NULL`,
      [gpa, scheduleTimeId, userId]
    );
    return res.json({
      message: "Grade goal saved successfully",
      schedule_time_id: scheduleTimeId,
      grade: normalizedGrade,
      target_score: gpa,
    });
  } catch (error) {
    console.error("saveGrade error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const saveGradeGoals = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = getAuthenticatedUserId(req, res);
  if (userId === null) return;

  const goals = req.body?.goals;
  if (!Array.isArray(goals) || goals.length === 0) {
    return res.status(400).json({ message: "goals must be a non-empty array" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [termRows] = await connection.query<CurrentTermRow[]>(
      `SELECT term_id, term, academic_year, semester
       FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );
    const currentTerm = termRows[0];
    if (!currentTerm) {
      await connection.rollback();
      return res.status(404).json({ message: "No current term found" });
    }

    const [subjects] = await connection.query<SubjectGoalRow[]>(
      `SELECT st.schedule_time_id, st.subject_id, st.target_score,
              s.subject_name, s.credits, s.teacher_name
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
       ORDER BY st.schedule_time_id
       FOR UPDATE`,
      [userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );
    if (subjects.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "No classes found in the current term" });
    }

    const normalizedGoals = goals.map((goal: unknown) => {
      const value = goal as { schedule_time_id?: unknown; grade?: unknown };
      const grade = String(value.grade ?? "").toUpperCase();
      return {
        schedule_time_id: Number(value.schedule_time_id),
        grade,
        gpa: GRADE_TO_GPA[grade],
      };
    });
    const uniqueIds = new Set(normalizedGoals.map((goal) => goal.schedule_time_id));
    const subjectIds = new Set(subjects.map((subject) => subject.schedule_time_id));
    const includesEverySubject =
      normalizedGoals.length === subjects.length &&
      uniqueIds.size === subjects.length &&
      normalizedGoals.every(
        (goal) =>
          Number.isInteger(goal.schedule_time_id) &&
          goal.gpa !== undefined &&
          subjectIds.has(goal.schedule_time_id)
      );
    if (!includesEverySubject) {
      await connection.rollback();
      return res.status(400).json({
        message: "Choose one valid grade for every current-term class",
      });
    }

    for (const subject of subjects) {
      const selected = normalizedGoals.find(
        (goal) => goal.schedule_time_id === subject.schedule_time_id
      )!;
      const existingTarget = numberOrNull(subject.target_score);
      if (existingTarget !== null && existingTarget !== selected.gpa) {
        await connection.rollback();
        return res.status(409).json({
          message: `The goal for ${subject.subject_name} has already been finalized`,
        });
      }
      if (existingTarget === null) {
        await connection.query(
          `UPDATE schedule_time SET target_score = ?
           WHERE schedule_time_id = ? AND user_id = ? AND term_id = ?
             AND target_score IS NULL`,
          [selected.gpa, subject.schedule_time_id, userId, currentTerm.term_id]
        );
      }
    }

    const totalCredits = subjects.reduce(
      (sum, subject) => sum + Number(subject.credits),
      0
    );
    const weightedGpa = subjects.reduce((sum, subject) => {
      const selected = normalizedGoals.find(
        (goal) => goal.schedule_time_id === subject.schedule_time_id
      )!;
      return sum + selected.gpa * Number(subject.credits);
    }, 0);

    await connection.commit();
    return res.status(201).json({
      message: "Grade goals finalized successfully",
      current_term: currentTerm,
      goals_locked: true,
      target_gpa: totalCredits > 0 ? Number((weightedGpa / totalCredits).toFixed(2)) : 0,
      data: normalizedGoals.map(({ schedule_time_id, grade, gpa }) => ({
        schedule_time_id,
        grade,
        target_score: gpa,
      })),
    });
  } catch (error) {
    await connection.rollback();
    console.error("saveGradeGoals error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};

export const getSubjectGoals = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (userId === null) return;

    const currentTerm = await getCurrentTerm(userId);
    if (!currentTerm) {
      return res.status(404).json({ message: "No current term found" });
    }
    const subjects = await loadCurrentSubjectGoals(userId, currentTerm.term_id);
    const [workloads] = await db.query<WorkloadRow[]>(
      `SELECT
         w.schedule_time_id, w.workload_id, w.workload_name,
         w.workload_type_id, wt.workload_type_name, w.deadline_date,
         w.deadline_time, w.workload_status, sc.actual_score, sc.max_score
       FROM workloads w
       INNER JOIN workload_types wt ON wt.workload_type_id = w.workload_type_id
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       LEFT JOIN score sc ON sc.workload_id = w.workload_id
       WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
       ORDER BY w.deadline_date ASC, w.deadline_time ASC`,
      [userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );

    const data = subjects.map((subject) => ({
      schedule_time_id: subject.schedule_time_id,
      subject_id: subject.subject_id,
      subject_name: subject.subject_name,
      credits: Number(subject.credits),
      teacher_name: subject.teacher_name,
      target_score: numberOrNull(subject.target_score),
      target_grade: gradeFromGpa(subject.target_score),
      workloads: workloads
        .filter((workload) => workload.schedule_time_id === subject.schedule_time_id)
        .map((workload) => ({
          ...workload,
          actual_score: numberOrNull(workload.actual_score),
          max_score: numberOrNull(workload.max_score),
        })),
    }));
    const savedCount = subjects.filter((subject) => subject.target_score !== null).length;

    return res.json({
      message: "Current-term subject goals retrieved successfully",
      current_term: currentTerm,
      total: data.length,
      saved_goal_count: savedCount,
      goals_locked: data.length > 0 && savedCount === data.length,
      data,
    });
  } catch (error) {
    console.error("getSubjectGoals error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOverallGradeGoal = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (userId === null) return;
    const currentTerm = await getCurrentTerm(userId);
    if (!currentTerm) {
      return res.status(404).json({ message: "No current term found" });
    }

    const [targetRows] = await db.query<RowDataPacket[]>(
      `SELECT
         SUM(st.target_score * s.credits) / NULLIF(SUM(s.credits), 0) AS target_gpa
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
         AND st.target_score IS NOT NULL`,
      [userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );
    const [scoreRows] = await db.query<SubjectScoreSummaryRow[]>(
      `SELECT
         st.schedule_time_id,
         s.credits,
         COALESCE(SUM(sc.actual_score), 0) AS total_actual,
         COALESCE(SUM(sc.max_score), 0) AS total_max
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       LEFT JOIN workloads w ON w.schedule_time_id = st.schedule_time_id
       LEFT JOIN score sc ON sc.workload_id = w.workload_id
       WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
       GROUP BY st.schedule_time_id, s.credits
       ORDER BY st.schedule_time_id`,
      [userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );

    const actual = calculateWeightedGradeSummary(
      scoreRows.map((row) => ({
        credits: Number(row.credits) || 0,
        actualScore: Number(row.total_actual) || 0,
        maximumScore: Number(row.total_max) || 0,
      }))
    );

    return res.json({
      message: "Current-term overall grade goal retrieved successfully",
      current_term: currentTerm,
      overall_target_gpa: Number(Number(targetRows[0]?.target_gpa || 0).toFixed(2)),
      overall_actual_gpa: Number(actual.gpa.toFixed(2)),
      overall_grade: actual.grade,
      overall_percent: Number(actual.percent.toFixed(2)),
      max_gpa: 4,
      raw: {
        total_actual_score: actual.totalActualScore,
        total_max_score: actual.totalMaximumScore,
        total_credits: actual.totalCredits,
      },
    });
  } catch (error) {
    console.error("getOverallGradeGoal error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getSubjectGoalsWithCompleted = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (userId === null) return;
    const currentTerm = await getCurrentTerm(userId);
    if (!currentTerm) {
      return res.status(404).json({ message: "No current term found" });
    }
    const subjects = await loadCurrentSubjectGoals(userId, currentTerm.term_id);
    const [workloads] = await db.query<WorkloadRow[]>(
      `SELECT
         w.schedule_time_id, w.workload_id, w.workload_name,
         w.workload_type_id, wt.workload_type_name, w.deadline_date,
         w.deadline_time, w.workload_status, sc.actual_score, sc.max_score
       FROM workloads w
       INNER JOIN workload_types wt ON wt.workload_type_id = w.workload_type_id
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       LEFT JOIN score sc ON sc.workload_id = w.workload_id
       WHERE st.user_id = ? AND st.term_id = ? AND st.schedule_type_id = ?
         AND w.workload_status = 'completed'
       ORDER BY w.deadline_date ASC, w.deadline_time ASC`,
      [userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );

    return res.json({
      message: "Completed current-term workloads retrieved successfully",
      current_term: currentTerm,
      total: subjects.length,
      data: subjects.map((subject) => ({
        schedule_time_id: subject.schedule_time_id,
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        credits: Number(subject.credits),
        teacher_name: subject.teacher_name,
        target_score: numberOrNull(subject.target_score),
        target_grade: gradeFromGpa(subject.target_score),
        completed_workloads: workloads.filter(
          (workload) => workload.schedule_time_id === subject.schedule_time_id
        ),
      })),
    });
  } catch (error) {
    console.error("getSubjectGoalsWithCompleted error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
