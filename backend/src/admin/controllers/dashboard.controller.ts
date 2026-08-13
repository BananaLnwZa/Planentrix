import { Request, Response } from "express";
import type { RowDataPacket } from "mysql2";
import db from "../../config/db";

interface StudyTimeSummaryRow extends RowDataPacket {
  active_users: number | string;
  average_weekly_hours: number | string | null;
  total_term_hours: number | string;
  average_review_weekly_hours: number | string | null;
  total_review_term_hours: number | string;
}

interface StudyTimeTrendRow extends RowDataPacket {
  week_start: string;
  user_count: number | string;
  total_hours: number | string;
  average_hours: number | string;
  total_review_hours: number | string;
  average_review_hours: number | string;
}

interface ConstraintModeRow extends RowDataPacket {
  popular_value: number | string;
  secondary_value?: string;
  selected_count: number | string;
  response_count: number | string;
}

interface ExamPartPerformanceRow extends RowDataPacket {
  exam_part_id: number;
  exam_repository_id: number;
  exam_name: string;
  part_order: number;
  exam_part_name: string;
  average_percentage: number | string;
  attempt_count: number | string;
  user_count: number | string;
}

interface UserYearDistributionRow extends RowDataPacket {
  academic_year: number | string | null;
  user_count: number | string;
}

interface WorkloadStatusRow extends RowDataPacket {
  completed_count: number | string;
  pending_count: number | string;
  overdue_count: number | string;
  total_count: number | string;
}

interface ExamScoreSummaryRow extends RowDataPacket {
  exam_repository_id: number;
  subject_id: string;
  exam_name: string;
  average_percentage: number | string;
  highest_percentage: number | string;
  lowest_percentage: number | string;
  user_count: number | string;
}

interface ReviewMethodRow extends RowDataPacket {
  study_type_id: number;
  study_type_name: string;
  total_minutes: number | string;
  session_count: number | string;
  user_count: number | string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username?: string;
    role?: string;
  };
}

const isAdmin = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing admin ID" });
    return false;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return false;
  }

  return true;
};

const toNumber = (value: number | string | null): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getStudyTimeOverview = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!isAdmin(req, res)) return;

    const [summaryRows] = await db.query<StudyTimeSummaryRow[]>(
      `WITH ranked_terms AS (
         SELECT
           term_id,
           user_id,
           created_at,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY term_id DESC
           ) AS term_rank
         FROM terms
         WHERE term_status = 1
           AND user_id IS NOT NULL
       ),
       current_terms AS (
         SELECT term_id, user_id, created_at
         FROM ranked_terms
         WHERE term_rank = 1
       ),
       user_study AS (
         SELECT
           current_terms.user_id,
           GREATEST(
             1,
             FLOOR(DATEDIFF(CURDATE(), DATE(current_terms.created_at)) / 7) + 1
           ) AS elapsed_weeks,
           COALESCE(SUM(study.time_spent), 0) AS total_minutes,
           COALESCE(
             SUM(
               CASE
                 WHEN study_types.study_type_name = 'review'
                 THEN study.time_spent
                 ELSE 0
               END
             ),
             0
           ) AS review_minutes
         FROM current_terms
         LEFT JOIN schedule_time schedule
           ON schedule.term_id = current_terms.term_id
          AND schedule.user_id = current_terms.user_id
          AND schedule.schedule_type_id = 1
         LEFT JOIN study_time study
           ON study.schedule_time_id = schedule.schedule_time_id
          AND study.session_status = 'completed'
          AND study.time_spent IS NOT NULL
          AND study.start_time >= current_terms.created_at
         LEFT JOIN study_types
           ON study_types.study_type_id = study.study_type_id
         GROUP BY
           current_terms.term_id,
           current_terms.user_id,
           current_terms.created_at
       )
       SELECT
         COUNT(*) AS active_users,
         COALESCE(AVG(total_minutes / elapsed_weeks) / 60, 0) AS average_weekly_hours,
         COALESCE(SUM(total_minutes) / 60, 0) AS total_term_hours,
         COALESCE(AVG(review_minutes / elapsed_weeks) / 60, 0) AS average_review_weekly_hours,
         COALESCE(SUM(review_minutes) / 60, 0) AS total_review_term_hours
       FROM user_study`,
    );

    const [trendRows] = await db.query<StudyTimeTrendRow[]>(
      `WITH RECURSIVE week_series AS (
         SELECT
           6 AS week_offset,
           DATE_SUB(
             DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY),
             INTERVAL 7 WEEK
           ) AS week_start
         UNION ALL
         SELECT
           week_offset - 1,
           DATE_ADD(week_start, INTERVAL 1 WEEK)
         FROM week_series
         WHERE week_offset > 0
       ),
       ranked_terms AS (
         SELECT
           term_id,
           user_id,
           created_at,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY term_id DESC
           ) AS term_rank
         FROM terms
         WHERE term_status = 1
           AND user_id IS NOT NULL
       ),
       current_terms AS (
         SELECT term_id, user_id, created_at
         FROM ranked_terms
         WHERE term_rank = 1
       ),
       eligible_users AS (
         SELECT
           weeks.week_start,
           current_terms.term_id,
           current_terms.user_id
         FROM week_series weeks
         INNER JOIN current_terms
           ON current_terms.created_at < DATE_ADD(weeks.week_start, INTERVAL 1 WEEK)
       )
       SELECT
         DATE_FORMAT(weeks.week_start, '%Y-%m-%d') AS week_start,
         COUNT(DISTINCT eligible.user_id) AS user_count,
         COALESCE(SUM(study.time_spent), 0) / 60 AS total_hours,
         COALESCE(
           SUM(study.time_spent) / NULLIF(COUNT(DISTINCT eligible.user_id), 0) / 60,
           0
         ) AS average_hours,
         COALESCE(
           SUM(
             CASE
               WHEN study_types.study_type_name = 'review'
               THEN study.time_spent
               ELSE 0
             END
           ) / 60,
           0
         ) AS total_review_hours,
         COALESCE(
           SUM(
             CASE
               WHEN study_types.study_type_name = 'review'
               THEN study.time_spent
               ELSE 0
             END
           ) / NULLIF(COUNT(DISTINCT eligible.user_id), 0) / 60,
           0
         ) AS average_review_hours
       FROM week_series weeks
       LEFT JOIN eligible_users eligible
         ON eligible.week_start = weeks.week_start
       LEFT JOIN schedule_time schedule
         ON schedule.term_id = eligible.term_id
        AND schedule.user_id = eligible.user_id
        AND schedule.schedule_type_id = 1
       LEFT JOIN study_time study
         ON study.schedule_time_id = schedule.schedule_time_id
        AND study.session_status = 'completed'
        AND study.time_spent IS NOT NULL
        AND study.start_time >= weeks.week_start
        AND study.start_time < DATE_ADD(weeks.week_start, INTERVAL 1 WEEK)
       LEFT JOIN study_types
         ON study_types.study_type_id = study.study_type_id
       GROUP BY weeks.week_start
       ORDER BY weeks.week_start`,
    );

    const trend = trendRows.map((row) => ({
      week_start: row.week_start,
      user_count: Math.trunc(toNumber(row.user_count)),
      total_hours: Number(toNumber(row.total_hours).toFixed(2)),
      average_hours: Number(toNumber(row.average_hours).toFixed(2)),
      total_review_hours: Number(toNumber(row.total_review_hours).toFixed(2)),
      average_review_hours: Number(toNumber(row.average_review_hours).toFixed(2)),
    }));
    const latestAverage = trend.at(-1)?.average_hours ?? 0;
    const previousAverage = trend.at(-2)?.average_hours ?? 0;
    const comparisonPercent =
      previousAverage > 0
        ? Number((((latestAverage - previousAverage) / previousAverage) * 100).toFixed(1))
        : null;
    const latestReviewAverage = trend.at(-1)?.average_review_hours ?? 0;
    const previousReviewAverage = trend.at(-2)?.average_review_hours ?? 0;
    const reviewComparisonPercent =
      previousReviewAverage > 0
        ? Number(
            (
              ((latestReviewAverage - previousReviewAverage) /
                previousReviewAverage) *
              100
            ).toFixed(1),
          )
        : null;
    const summary = summaryRows[0];

    return res.json({
      message: "Admin study-time overview retrieved successfully",
      summary: {
        active_users: Math.trunc(toNumber(summary?.active_users ?? 0)),
        average_weekly_hours: Number(
          toNumber(summary?.average_weekly_hours ?? 0).toFixed(2),
        ),
        total_term_hours: Number(
          toNumber(summary?.total_term_hours ?? 0).toFixed(2),
        ),
        comparison_percent: comparisonPercent,
        average_review_weekly_hours: Number(
          toNumber(summary?.average_review_weekly_hours ?? 0).toFixed(2),
        ),
        total_review_term_hours: Number(
          toNumber(summary?.total_review_term_hours ?? 0).toFixed(2),
        ),
        review_comparison_percent: reviewComparisonPercent,
      },
      trend,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getStudyTimeOverview error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getPopularConstraints = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!isAdmin(req, res)) return;

    const [dayOffResult, durationResult, breakResult, timeRangeResult, busyDayResult] =
      await Promise.all([
        db.query<ConstraintModeRow[]>(
          `SELECT
             day_off AS popular_value,
             COUNT(*) AS selected_count,
             (SELECT COUNT(*) FROM \`constraint\` WHERE day_off BETWEEN 1 AND 7) AS response_count
           FROM \`constraint\`
           WHERE day_off BETWEEN 1 AND 7
           GROUP BY day_off
           ORDER BY selected_count DESC, day_off ASC
           LIMIT 1`,
        ),
        db.query<ConstraintModeRow[]>(
          `SELECT
             continuous_working_duration AS popular_value,
             COUNT(*) AS selected_count,
             (
               SELECT COUNT(*)
               FROM \`constraint\`
               WHERE continuous_working_duration > 0
             ) AS response_count
           FROM \`constraint\`
           WHERE continuous_working_duration > 0
           GROUP BY continuous_working_duration
           ORDER BY selected_count DESC, continuous_working_duration ASC
           LIMIT 1`,
        ),
        db.query<ConstraintModeRow[]>(
          `SELECT
             \`break\` AS popular_value,
             COUNT(*) AS selected_count,
             (SELECT COUNT(*) FROM \`constraint\` WHERE \`break\` > 0) AS response_count
           FROM \`constraint\`
           WHERE \`break\` > 0
           GROUP BY \`break\`
           ORDER BY selected_count DESC, \`break\` ASC
           LIMIT 1`,
        ),
        db.query<ConstraintModeRow[]>(
          `SELECT
             TIME_FORMAT(start_time, '%H:%i') AS popular_value,
             TIME_FORMAT(end_time, '%H:%i') AS secondary_value,
             COUNT(*) AS selected_count,
             (
               SELECT COUNT(*)
               FROM \`constraint\`
               WHERE start_time IS NOT NULL
                 AND end_time IS NOT NULL
                 AND start_time < end_time
             ) AS response_count
           FROM \`constraint\`
           WHERE start_time IS NOT NULL
             AND end_time IS NOT NULL
             AND start_time < end_time
           GROUP BY start_time, end_time
           ORDER BY selected_count DESC, start_time ASC, end_time ASC
           LIMIT 1`,
        ),
        db.query<ConstraintModeRow[]>(
          `SELECT
             recurring_busy_day AS popular_value,
             COUNT(DISTINCT constraint_id) AS selected_count,
             (
               SELECT COUNT(DISTINCT constraint_id)
               FROM recurring_busy
               WHERE recurring_busy_day BETWEEN 1 AND 7
             ) AS response_count
           FROM recurring_busy
           WHERE recurring_busy_day BETWEEN 1 AND 7
           GROUP BY recurring_busy_day
           ORDER BY selected_count DESC, recurring_busy_day ASC
           LIMIT 1`,
        ),
      ]);

    const createItem = (
      key: string,
      rows: ConstraintModeRow[],
      includeSecondaryValue = false,
    ) => {
      const row = rows[0];
      if (!row) {
        return {
          key,
          value: null,
          secondary_value: null,
          selected_count: 0,
          response_count: 0,
          percent: 0,
        };
      }

      const selectedCount = Math.trunc(toNumber(row.selected_count));
      const responseCount = Math.trunc(toNumber(row.response_count));

      return {
        key,
        value: row.popular_value,
        secondary_value: includeSecondaryValue
          ? (row.secondary_value ?? null)
          : null,
        selected_count: selectedCount,
        response_count: responseCount,
        percent:
          responseCount > 0
            ? Number(((selectedCount / responseCount) * 100).toFixed(1))
            : 0,
      };
    };

    return res.json({
      message: "Popular constraints retrieved successfully",
      items: [
        createItem("day_off", dayOffResult[0]),
        createItem("continuous_working_duration", durationResult[0]),
        createItem("break_duration", breakResult[0]),
        createItem("preferred_time_range", timeRangeResult[0], true),
        createItem("recurring_busy_day", busyDayResult[0]),
      ],
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getPopularConstraints error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getExamPartRankings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!isAdmin(req, res)) return;

    const [rows] = await db.query<ExamPartPerformanceRow[]>(
      `WITH ranked_attempts AS (
         SELECT
           history.exam_score_history_id,
           history.exam_repository_id,
           schedule.user_id,
           ROW_NUMBER() OVER (
             PARTITION BY schedule.user_id, history.exam_repository_id
             ORDER BY
               history.exam_date DESC,
               history.exam_score_history_id DESC
           ) AS attempt_rank
         FROM exam_score_history history
         INNER JOIN schedule_time schedule
           ON schedule.schedule_time_id = history.schedule_time_id
       )
       SELECT
         parts.exam_part_id,
         repository.exam_repository_id,
         repository.exam_name,
         parts.part_order,
         parts.exam_part_name,
         ROUND(
           AVG(
             LEAST(
               100,
               GREATEST(0, (scores.part_score / parts.part_score) * 100)
             )
           ),
           2
         ) AS average_percentage,
         COUNT(*) AS attempt_count,
         COUNT(DISTINCT attempts.user_id) AS user_count
       FROM ranked_attempts attempts
       INNER JOIN part_score_history scores
         ON scores.exam_score_history_id = attempts.exam_score_history_id
       INNER JOIN exam_part parts
         ON parts.exam_part_id = scores.exam_part_id
       INNER JOIN exam_repository repository
         ON repository.exam_repository_id = parts.exam_repository_id
       WHERE attempts.attempt_rank = 1
         AND parts.part_score > 0
       GROUP BY
         parts.exam_part_id,
         repository.exam_repository_id,
         repository.exam_name,
         parts.part_order,
         parts.exam_part_name`,
    );

    const items = rows.map((row) => ({
      exam_part_id: Number(row.exam_part_id),
      exam_repository_id: Number(row.exam_repository_id),
      exam_name: row.exam_name,
      part_order: Number(row.part_order),
      exam_part_name: row.exam_part_name,
      average_percentage: Number(toNumber(row.average_percentage).toFixed(2)),
      attempt_count: Math.trunc(toNumber(row.attempt_count)),
      user_count: Math.trunc(toNumber(row.user_count)),
    }));
    const rankTieBreaker = (
      first: (typeof items)[number],
      second: (typeof items)[number],
    ) =>
      second.user_count - first.user_count ||
      second.attempt_count - first.attempt_count ||
      first.exam_repository_id - second.exam_repository_id ||
      first.part_order - second.part_order;

    const best = [...items]
      .sort(
        (first, second) =>
          second.average_percentage - first.average_percentage ||
          rankTieBreaker(first, second),
      )
      .slice(0, 5);
    const weakest = [...items]
      .sort(
        (first, second) =>
          first.average_percentage - second.average_percentage ||
          rankTieBreaker(first, second),
      )
      .slice(0, 5);

    return res.json({
      message: "Exam part rankings retrieved successfully",
      best,
      weakest,
      total_ranked_parts: items.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getExamPartRankings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserYearDistribution = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!isAdmin(req, res)) return;

    const [rows] = await db.query<UserYearDistributionRow[]>(
      `WITH ranked_current_terms AS (
         SELECT
           user_id,
           academic_year,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY term_id DESC
           ) AS term_rank
         FROM terms
         WHERE term_status = 1
           AND user_id IS NOT NULL
       )
       SELECT
         CASE
           WHEN current_term.academic_year BETWEEN 1 AND 4
           THEN current_term.academic_year
           ELSE NULL
         END AS academic_year,
         COUNT(*) AS user_count
       FROM user accounts
       LEFT JOIN ranked_current_terms current_term
         ON current_term.user_id = accounts.user_id
        AND current_term.term_rank = 1
       GROUP BY academic_year
       ORDER BY academic_year`,
    );

    const counts = new Map<number | null, number>();
    for (const row of rows) {
      const academicYear =
        row.academic_year === null ? null : Number(row.academic_year);
      counts.set(academicYear, Math.trunc(toNumber(row.user_count)));
    }

    const totalUsers = Array.from(counts.values()).reduce(
      (total, count) => total + count,
      0,
    );
    const createItem = (academicYear: number | null) => {
      const userCount = counts.get(academicYear) ?? 0;
      return {
        academic_year: academicYear,
        user_count: userCount,
        percent:
          totalUsers > 0
            ? Number(((userCount / totalUsers) * 100).toFixed(1))
            : 0,
      };
    };
    const distribution = [1, 2, 3, 4].map(createItem);
    if ((counts.get(null) ?? 0) > 0) distribution.push(createItem(null));

    return res.json({
      message: "User year distribution retrieved successfully",
      total_users: totalUsers,
      distribution,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getUserYearDistribution error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getWorkloadCompletion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!isAdmin(req, res)) return;

    const [rows] = await db.query<WorkloadStatusRow[]>(
      `WITH ranked_current_terms AS (
         SELECT
           term_id,
           user_id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY term_id DESC
           ) AS term_rank
         FROM terms
         WHERE term_status = 1
           AND user_id IS NOT NULL
       )
       SELECT
         COALESCE(SUM(CASE WHEN workload.workload_status = 1 THEN 1 ELSE 0 END), 0)
           AS completed_count,
         COALESCE(SUM(CASE WHEN workload.workload_status = 0 THEN 1 ELSE 0 END), 0)
           AS pending_count,
         COALESCE(
           SUM(
             CASE
               WHEN workload.workload_status = 0
                AND TIMESTAMP(workload.deadline_date, workload.deadline_time) < NOW()
               THEN 1 ELSE 0
             END
           ),
           0
         ) AS overdue_count,
         COUNT(workload.workload_id) AS total_count
       FROM ranked_current_terms current_term
       INNER JOIN schedule_time schedule
         ON schedule.term_id = current_term.term_id
        AND schedule.user_id = current_term.user_id
       INNER JOIN workloads workload
         ON workload.schedule_time_id = schedule.schedule_time_id
       WHERE current_term.term_rank = 1`,
    );

    const row = rows[0];
    const completedCount = Math.trunc(toNumber(row?.completed_count ?? 0));
    const pendingCount = Math.trunc(toNumber(row?.pending_count ?? 0));
    const overdueCount = Math.trunc(toNumber(row?.overdue_count ?? 0));
    const totalCount = Math.trunc(toNumber(row?.total_count ?? 0));
    const toPercent = (count: number) =>
      totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0;

    return res.json({
      message: "Workload completion retrieved successfully",
      total_count: totalCount,
      completed_count: completedCount,
      pending_count: pendingCount,
      overdue_count: overdueCount,
      completed_percent: toPercent(completedCount),
      pending_percent: toPercent(pendingCount),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getWorkloadCompletion error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getExamScoreSummaries = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!isAdmin(req, res)) return;

    const [rows] = await db.query<ExamScoreSummaryRow[]>(
      `WITH ranked_current_terms AS (
         SELECT
           term_id,
           user_id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY term_id DESC
           ) AS term_rank
         FROM terms
         WHERE term_status = 1
           AND user_id IS NOT NULL
       ),
       ranked_attempts AS (
         SELECT
           history.exam_score_history_id,
           history.exam_repository_id,
           schedule.user_id,
           history.actual_score,
           history.exam_max_score,
           ROW_NUMBER() OVER (
             PARTITION BY schedule.user_id, history.exam_repository_id
             ORDER BY
               history.exam_date DESC,
               history.exam_score_history_id DESC
           ) AS attempt_rank
         FROM ranked_current_terms current_term
         INNER JOIN schedule_time schedule
           ON schedule.term_id = current_term.term_id
          AND schedule.user_id = current_term.user_id
         INNER JOIN exam_score_history history
           ON history.schedule_time_id = schedule.schedule_time_id
         WHERE current_term.term_rank = 1
           AND history.exam_max_score > 0
       )
       SELECT
         repository.exam_repository_id,
         repository.subject_id,
         repository.exam_name,
         ROUND(
           AVG(
             LEAST(
               100,
               GREATEST(0, (attempts.actual_score / attempts.exam_max_score) * 100)
             )
           ),
           2
         ) AS average_percentage,
         ROUND(
           MAX(
             LEAST(
               100,
               GREATEST(0, (attempts.actual_score / attempts.exam_max_score) * 100)
             )
           ),
           2
         ) AS highest_percentage,
         ROUND(
           MIN(
             LEAST(
               100,
               GREATEST(0, (attempts.actual_score / attempts.exam_max_score) * 100)
             )
           ),
           2
         ) AS lowest_percentage,
         COUNT(DISTINCT attempts.user_id) AS user_count
       FROM ranked_attempts attempts
       INNER JOIN exam_repository repository
         ON repository.exam_repository_id = attempts.exam_repository_id
       WHERE attempts.attempt_rank = 1
       GROUP BY
         repository.exam_repository_id,
         repository.subject_id,
         repository.exam_name
       ORDER BY user_count DESC, repository.exam_repository_id ASC`,
    );

    return res.json({
      message: "Exam score summaries retrieved successfully",
      scores: rows.map((row) => ({
        exam_repository_id: Number(row.exam_repository_id),
        subject_id: row.subject_id,
        exam_name: row.exam_name,
        average_percentage: Number(toNumber(row.average_percentage).toFixed(2)),
        highest_percentage: Number(toNumber(row.highest_percentage).toFixed(2)),
        lowest_percentage: Number(toNumber(row.lowest_percentage).toFixed(2)),
        user_count: Math.trunc(toNumber(row.user_count)),
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getExamScoreSummaries error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getReviewMethods = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!isAdmin(req, res)) return;

    const [rows] = await db.query<ReviewMethodRow[]>(
      `WITH ranked_current_terms AS (
         SELECT
           term_id,
           user_id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY term_id DESC
           ) AS term_rank
         FROM terms
         WHERE term_status = 1
           AND user_id IS NOT NULL
       ),
       current_sessions AS (
         SELECT
           study.study_time_id,
           study.study_type_id,
           study.time_spent,
           schedule.user_id
         FROM ranked_current_terms current_term
         INNER JOIN schedule_time schedule
           ON schedule.term_id = current_term.term_id
          AND schedule.user_id = current_term.user_id
          AND schedule.schedule_type_id = 1
         INNER JOIN study_time study
           ON study.schedule_time_id = schedule.schedule_time_id
          AND study.session_status = 'completed'
          AND study.time_spent IS NOT NULL
         WHERE current_term.term_rank = 1
       )
       SELECT
         types.study_type_id,
         types.study_type_name,
         COALESCE(SUM(sessions.time_spent), 0) AS total_minutes,
         COUNT(sessions.study_time_id) AS session_count,
         COUNT(DISTINCT sessions.user_id) AS user_count
       FROM study_types types
       LEFT JOIN current_sessions sessions
         ON sessions.study_type_id = types.study_type_id
       GROUP BY types.study_type_id, types.study_type_name
       ORDER BY total_minutes DESC, types.study_type_id ASC`,
    );

    const totalMinutes = rows.reduce(
      (total, row) => total + toNumber(row.total_minutes),
      0,
    );

    return res.json({
      message: "Review methods retrieved successfully",
      total_minutes: Number(totalMinutes.toFixed(2)),
      methods: rows.map((row) => {
        const methodMinutes = toNumber(row.total_minutes);
        return {
          study_type_id: Number(row.study_type_id),
          study_type_name: row.study_type_name,
          total_minutes: Number(methodMinutes.toFixed(2)),
          session_count: Math.trunc(toNumber(row.session_count)),
          user_count: Math.trunc(toNumber(row.user_count)),
          percent:
            totalMinutes > 0
              ? Number(((methodMinutes / totalMinutes) * 100).toFixed(1))
              : 0,
        };
      }),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getReviewMethods error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
