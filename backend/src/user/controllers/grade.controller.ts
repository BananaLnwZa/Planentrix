import type { Request, Response } from "express";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";

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

const PERCENT_TO_GRADE = [
  { min: 80, grade: "A", gpa: 4 },
  { min: 75, grade: "B+", gpa: 3.5 },
  { min: 70, grade: "B", gpa: 3 },
  { min: 65, grade: "C+", gpa: 2.5 },
  { min: 60, grade: "C", gpa: 2 },
  { min: 55, grade: "D+", gpa: 1.5 },
  { min: 50, grade: "D", gpa: 1 },
  { min: 0, grade: "F", gpa: 0 },
];

interface CurrentTermRow extends RowDataPacket {
  term_id: number;
  user_id: number;
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
  target_grade_code: string | null;
}

interface WorkloadRow extends RowDataPacket {
  schedule_time_id: number;
  workload_id: number;
  workload_name: string;
  workload_type_id: number;
  workload_type_name: string;
  deadline_date: string;
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

const termSelect = `
  SELECT student_term.student_term_id AS term_id,
         student_term.user_id,
         academic_term.semester_no AS term,
         student_term.year_level AS academic_year,
         CAST(academic_term.academic_year AS CHAR) AS semester
  FROM student_terms student_term
  INNER JOIN academic_terms academic_term
    ON academic_term.academic_term_id = student_term.academic_term_id
  WHERE student_term.user_id = ? AND student_term.status = 'active'
  ORDER BY student_term.student_term_id DESC
  LIMIT 1`;

const getCurrentTerm = async (
  userId: number,
  connection: PoolConnection | typeof db = db,
  lock = false,
) => {
  const [rows] = await connection.query<CurrentTermRow[]>(
    `${termSelect}${lock ? " FOR UPDATE" : ""}`,
    [userId],
  );
  return rows[0] ?? null;
};

const subjectSelect = `
  SELECT enrollment.enrollment_id AS schedule_time_id,
         subject.subject_id,
         subject.subject_name,
         subject.credits,
         COALESCE(
           GROUP_CONCAT(
             DISTINCT CONCAT(instructor.first_name, ' ', instructor.last_name)
             ORDER BY instructor.first_name, instructor.last_name
             SEPARATOR ', '
           ),
           '-'
         ) AS teacher_name,
         enrollment.target_grade_code
  FROM enrollments enrollment
  INNER JOIN course_sections section ON section.section_id = enrollment.section_id
  INNER JOIN subjects subject ON subject.subject_id = section.subject_id
  LEFT JOIN section_instructors section_instructor
    ON section_instructor.section_id = section.section_id
  LEFT JOIN admin instructor
    ON instructor.admin_id = section_instructor.instructor_id
  WHERE enrollment.student_term_id = ?
    AND enrollment.status IN ('enrolled', 'completed')
  GROUP BY enrollment.enrollment_id, subject.subject_id, subject.subject_name,
           subject.credits, enrollment.target_grade_code
  ORDER BY subject.subject_name ASC, enrollment.enrollment_id ASC`;

const loadSubjects = async (
  termId: number,
  connection: PoolConnection | typeof db = db,
) => {
  const [rows] = await connection.query<SubjectGoalRow[]>(subjectSelect, [termId]);
  return rows;
};

const loadWorkloads = async (termId: number, completedOnly = false) => {
  const [rows] = await db.query<WorkloadRow[]>(
    `SELECT workload.enrollment_id AS schedule_time_id,
            workload.workload_id,
            workload.workload_name,
            workload.workload_type_id,
            workload_type.type_name AS workload_type_name,
            DATE_FORMAT(workload.deadline_date, '%Y-%m-%d') AS deadline_date,
            TIME_FORMAT(workload.deadline_time, '%H:%i:%s') AS deadline_time,
            workload.status AS workload_status,
            score.actual_score,
            score.max_score
     FROM workloads workload
     INNER JOIN workload_types workload_type
       ON workload_type.workload_type_id = workload.workload_type_id
     INNER JOIN enrollments enrollment
       ON enrollment.enrollment_id = workload.enrollment_id
     LEFT JOIN score ON score.workload_id = workload.workload_id
     WHERE enrollment.student_term_id = ?
       ${completedOnly ? "AND workload.status = 'completed'" : ""}
     ORDER BY workload.deadline_date ASC, workload.deadline_time ASC`,
    [termId],
  );
  return rows;
};

const gpaForGrade = (grade: string | null) =>
  grade === null ? null : (GRADE_TO_GPA[grade] ?? null);

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
  }>,
) => {
  let totalCredits = 0;
  let weightedGpa = 0;
  let weightedPercent = 0;
  let totalActualScore = 0;
  let totalMaximumScore = 0;
  for (const subject of subjects) {
    const credits = Number.isFinite(subject.credits) ? Math.max(subject.credits, 0) : 0;
    const actualScore = Number.isFinite(subject.actualScore)
      ? Math.max(subject.actualScore, 0)
      : 0;
    const maximumScore = Number.isFinite(subject.maximumScore)
      ? Math.max(subject.maximumScore, 0)
      : 0;
    const percent = Math.min(actualScore, 100);
    const grade =
      PERCENT_TO_GRADE.find((range) => percent >= range.min) ??
      PERCENT_TO_GRADE[PERCENT_TO_GRADE.length - 1];
    totalCredits += credits;
    weightedGpa += grade.gpa * credits;
    weightedPercent += percent * credits;
    totalActualScore += actualScore;
    totalMaximumScore += maximumScore;
  }
  const gpa = totalCredits > 0 ? weightedGpa / totalCredits : 0;
  return {
    gpa,
    grade: gradeFromGpaBand(gpa),
    percent: totalCredits > 0 ? weightedPercent / totalCredits : 0,
    totalCredits,
    totalActualScore,
    totalMaximumScore,
  };
};

const subjectResponse = (subjects: SubjectGoalRow[], workloads: WorkloadRow[]) =>
  subjects.map((subject) => ({
    schedule_time_id: subject.schedule_time_id,
    subject_id: subject.subject_id,
    subject_name: subject.subject_name,
    credits: Number(subject.credits),
    teacher_name: subject.teacher_name,
    target_score: gpaForGrade(subject.target_grade_code),
    target_grade: subject.target_grade_code,
    workloads: workloads
      .filter((workload) => workload.schedule_time_id === subject.schedule_time_id)
      .map((workload) => ({
        ...workload,
        actual_score:
          workload.actual_score === null ? null : Number(workload.actual_score),
        max_score: workload.max_score === null ? null : Number(workload.max_score),
      })),
  }));

export const getAllScheduleTime = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const term = await getCurrentTerm(userId);
    if (!term) return res.status(404).json({ message: "No current term found" });
    const subjects = await loadSubjects(term.term_id);
    return res.json({
      message: "Current-term class schedule retrieved successfully",
      current_term: term,
      schedule_type_id: 1,
      total: subjects.length,
      data: subjectResponse(subjects, []),
    });
  } catch (error) {
    console.error("getAllScheduleTime error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const saveGrade = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const enrollmentId = Number(req.params.id);
    const grade = String(req.body.grade ?? "").toUpperCase();
    if (!Number.isInteger(enrollmentId) || GRADE_TO_GPA[grade] === undefined) {
      return res.status(400).json({ message: "A valid class and grade are required" });
    }
    const term = await getCurrentTerm(userId);
    if (!term) return res.status(404).json({ message: "No current term found" });
    const [rows] = await db.query<SubjectGoalRow[]>(
      `${subjectSelect.replace("ORDER BY subject.subject_name ASC, enrollment.enrollment_id ASC", "")}
       HAVING enrollment.enrollment_id = ?`,
      [term.term_id, enrollmentId],
    );
    if (!rows[0]) return res.status(404).json({ message: "Current-term class was not found" });
    if (rows[0].target_grade_code !== null) {
      return res.status(409).json({ message: "Grade goal has already been finalized" });
    }
    await db.query(
      `UPDATE enrollments SET target_grade_code = ?
       WHERE enrollment_id = ? AND student_term_id = ? AND target_grade_code IS NULL`,
      [grade, enrollmentId, term.term_id],
    );
    return res.json({
      message: "Grade goal saved successfully",
      schedule_time_id: enrollmentId,
      grade,
      target_score: GRADE_TO_GPA[grade],
    });
  } catch (error) {
    console.error("saveGrade error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const saveGradeGoals = async (req: Request, res: Response) => {
  const userId = authenticatedUserId(req, res);
  if (userId === null) return;
  if (!Array.isArray(req.body?.goals) || req.body.goals.length === 0) {
    return res.status(400).json({ message: "goals must be a non-empty array" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const term = await getCurrentTerm(userId, connection, true);
    if (!term) {
      await connection.rollback();
      return res.status(404).json({ message: "No current term found" });
    }
    const subjects = await loadSubjects(term.term_id, connection);
    if (subjects.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "No classes found in the current term" });
    }
    const goals = req.body.goals.map((value: unknown) => {
      const goal = value as { schedule_time_id?: unknown; grade?: unknown };
      const grade = String(goal.grade ?? "").toUpperCase();
      return {
        schedule_time_id: Number(goal.schedule_time_id),
        grade,
        gpa: GRADE_TO_GPA[grade],
      };
    });
    const ids = new Set(goals.map((goal: { schedule_time_id: number }) => goal.schedule_time_id));
    const validIds = new Set(subjects.map((subject) => subject.schedule_time_id));
    if (
      goals.length !== subjects.length ||
      ids.size !== subjects.length ||
      goals.some(
        (goal: { schedule_time_id: number; gpa?: number }) =>
          !validIds.has(goal.schedule_time_id) || goal.gpa === undefined,
      )
    ) {
      await connection.rollback();
      return res.status(400).json({
        message: "Choose one valid grade for every current-term class",
      });
    }
    for (const subject of subjects) {
      const selected = goals.find(
        (goal: { schedule_time_id: number }) =>
          goal.schedule_time_id === subject.schedule_time_id,
      );
      if (subject.target_grade_code && subject.target_grade_code !== selected.grade) {
        await connection.rollback();
        return res.status(409).json({
          message: `The goal for ${subject.subject_name} has already been finalized`,
        });
      }
      if (!subject.target_grade_code) {
        await connection.query(
          `UPDATE enrollments SET target_grade_code = ?
           WHERE enrollment_id = ? AND student_term_id = ?`,
          [selected.grade, subject.schedule_time_id, term.term_id],
        );
      }
    }
    const totalCredits = subjects.reduce((sum, subject) => sum + Number(subject.credits), 0);
    const weighted = subjects.reduce((sum, subject) => {
      const selected = goals.find(
        (goal: { schedule_time_id: number }) => goal.schedule_time_id === subject.schedule_time_id,
      );
      return sum + selected.gpa * Number(subject.credits);
    }, 0);
    await connection.commit();
    return res.status(201).json({
      message: "Grade goals finalized successfully",
      current_term: term,
      goals_locked: true,
      target_gpa: totalCredits ? Number((weighted / totalCredits).toFixed(2)) : 0,
      data: goals.map((goal: { schedule_time_id: number; grade: string; gpa: number }) => ({
        schedule_time_id: goal.schedule_time_id,
        grade: goal.grade,
        target_score: goal.gpa,
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

export const getSubjectGoals = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const term = await getCurrentTerm(userId);
    if (!term) return res.status(404).json({ message: "No current term found" });
    const [subjects, workloads] = await Promise.all([
      loadSubjects(term.term_id),
      loadWorkloads(term.term_id),
    ]);
    const data = subjectResponse(subjects, workloads);
    const savedCount = subjects.filter((subject) => subject.target_grade_code !== null).length;
    return res.json({
      message: "Current-term subject goals retrieved successfully",
      current_term: term,
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

export const getOverallGradeGoal = async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const term = await getCurrentTerm(userId);
    if (!term) return res.status(404).json({ message: "No current term found" });
    const subjects = await loadSubjects(term.term_id);
    const [scoreRows] = await db.query<SubjectScoreSummaryRow[]>(
      `SELECT enrollment.enrollment_id AS schedule_time_id,
              subject.credits,
              COALESCE(SUM(score.actual_score), 0) AS total_actual,
              COALESCE(SUM(score.max_score), 0) AS total_max
       FROM enrollments enrollment
       INNER JOIN course_sections section ON section.section_id = enrollment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       LEFT JOIN workloads workload ON workload.enrollment_id = enrollment.enrollment_id
       LEFT JOIN score ON score.workload_id = workload.workload_id
       WHERE enrollment.student_term_id = ?
         AND enrollment.status IN ('enrolled', 'completed')
       GROUP BY enrollment.enrollment_id, subject.credits`,
      [term.term_id],
    );
    const actual = calculateWeightedGradeSummary(
      scoreRows.map((row) => ({
        credits: Number(row.credits) || 0,
        actualScore: Number(row.total_actual) || 0,
        maximumScore: Number(row.total_max) || 0,
      })),
    );
    const targetCredits = subjects.reduce((sum, subject) => {
      return subject.target_grade_code ? sum + Number(subject.credits) : sum;
    }, 0);
    const targetPoints = subjects.reduce((sum, subject) => {
      const gpa = gpaForGrade(subject.target_grade_code);
      return gpa === null ? sum : sum + gpa * Number(subject.credits);
    }, 0);
    return res.json({
      message: "Current-term overall grade goal retrieved successfully",
      current_term: term,
      overall_target_gpa: targetCredits
        ? Number((targetPoints / targetCredits).toFixed(2))
        : 0,
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
  req: Request,
  res: Response,
) => {
  try {
    const userId = authenticatedUserId(req, res);
    if (userId === null) return;
    const term = await getCurrentTerm(userId);
    if (!term) return res.status(404).json({ message: "No current term found" });
    const [subjects, workloads] = await Promise.all([
      loadSubjects(term.term_id),
      loadWorkloads(term.term_id, true),
    ]);
    return res.json({
      message: "Completed current-term workloads retrieved successfully",
      current_term: term,
      total: subjects.length,
      data: subjectResponse(subjects, workloads).map((subject) => ({
        ...subject,
        completed_workloads: subject.workloads,
      })),
    });
  } catch (error) {
    console.error("getSubjectGoalsWithCompleted error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
