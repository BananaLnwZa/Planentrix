import { Request, Response } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import db from "../../config/db";

const CLASS_SCHEDULE_TYPE_ID = 1;
const HARD_LIMIT_SECONDS = 4 * 60 * 60;
const STALE_AFTER_MINUTES = 15;

type SessionStatus =
  | "running"
  | "paused"
  | "completed"
  | "interrupted"
  | "cancelled";

type RecoveryAction =
  | "continue"
  | "finish_last_seen"
  | "finish_now"
  | "save_interrupted"
  | "cancel";

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    role?: string;
  };
};

interface CurrentTermRow extends RowDataPacket {
  term_id: number;
  term: number;
  semester: string;
  academic_year: number;
  created_at: Date;
}

interface StudySessionRow extends RowDataPacket {
  study_time_id: number;
  schedule_time_id: number;
  study_type_id: number;
  study_type_name: string;
  subject_id: string;
  subject_name: string;
  start_time: Date;
  end_time: Date | null;
  time_spent: string | null;
  session_status: SessionStatus;
  running_since: Date | null;
  accumulated_seconds: number;
  last_seen_at: Date | null;
  version: number;
  updated_at: Date;
  elapsed_seconds: number;
  is_stale: number;
  server_time: Date;
}

interface WeeklyStudyRow extends RowDataPacket {
  week_number: number;
  total_minutes: string;
}

interface HistoryRow extends RowDataPacket {
  month_key: string;
  subject_id: string;
  subject_name: string;
  study_type_name: string;
  total_minutes: string;
  session_count: number;
}

const SESSION_SELECT = `
  SELECT
    study.study_time_id,
    study.schedule_time_id,
    study.study_type_id,
    types.study_type_name,
    subjects.subject_id,
    subjects.subject_name,
    study.start_time,
    study.end_time,
    study.time_spent,
    study.session_status,
    study.running_since,
    study.accumulated_seconds,
    study.last_seen_at,
    study.version,
    study.updated_at,
    LEAST(
      ${HARD_LIMIT_SECONDS},
      study.accumulated_seconds +
      CASE
        WHEN study.session_status = 'running' AND study.running_since IS NOT NULL
          THEN GREATEST(0, TIMESTAMPDIFF(SECOND, study.running_since, NOW()))
        ELSE 0
      END
    ) AS elapsed_seconds,
    CASE
      WHEN study.session_status = 'running'
        AND (
          study.last_seen_at IS NULL
          OR study.last_seen_at < DATE_SUB(NOW(), INTERVAL ${STALE_AFTER_MINUTES} MINUTE)
        )
      THEN 1
      ELSE 0
    END AS is_stale,
    NOW() AS server_time
  FROM study_time study
  INNER JOIN study_types types
    ON types.study_type_id = study.study_type_id
  INNER JOIN schedule_time schedule
    ON schedule.schedule_time_id = study.schedule_time_id
  INNER JOIN subjects
    ON subjects.subject_id = schedule.subject_id
  INNER JOIN terms
    ON terms.term_id = schedule.term_id`;

const getAuthenticatedUserId = (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  if (!authUser?.id) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Unauthorized: Missing user ID",
    });
    return null;
  }
  if (authUser.role && authUser.role !== "user") {
    res.status(403).json({
      code: "FORBIDDEN",
      message: "Forbidden: user role required",
    });
    return null;
  }
  return authUser.id;
};

const getCurrentTerm = async (
  userId: number,
  connection: PoolConnection | typeof db = db,
  lock = false
) => {
  const [rows] = await connection.query<CurrentTermRow[]>(
    `SELECT term_id, term, semester, academic_year, created_at
     FROM terms
     WHERE user_id = ? AND term_status = 1
     ORDER BY term_id DESC
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [userId]
  );
  return rows[0] ?? null;
};

const parsePositiveInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toNumber = (value: string | number | null | undefined) =>
  Number(value ?? 0);

const formatLocalDate = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const serializeSession = (row: StudySessionRow) => ({
  study_time_id: Number(row.study_time_id),
  schedule_time_id: Number(row.schedule_time_id),
  study_type_id: Number(row.study_type_id),
  study_type_name: row.study_type_name,
  subject_id: row.subject_id,
  subject_name: row.subject_name,
  start_time: row.start_time,
  end_time: row.end_time,
  time_spent: row.time_spent === null ? null : Number(row.time_spent),
  session_status: row.session_status,
  running_since: row.running_since,
  accumulated_seconds: Number(row.accumulated_seconds),
  last_seen_at: row.last_seen_at,
  version: Number(row.version),
  updated_at: row.updated_at,
  elapsed_seconds: Math.min(
    HARD_LIMIT_SECONDS,
    Number(row.elapsed_seconds ?? row.accumulated_seconds)
  ),
  is_stale: Boolean(row.is_stale),
  server_time: row.server_time,
  hard_limit_seconds: HARD_LIMIT_SECONDS,
});

const getOwnedSession = async (
  connection: PoolConnection,
  studyTimeId: number,
  userId: number,
  lock = false
) => {
  const [rows] = await connection.query<StudySessionRow[]>(
    `${SESSION_SELECT}
     WHERE study.study_time_id = ?
       AND schedule.user_id = ?
       AND terms.term_status = 1
       AND schedule.schedule_type_id = ?
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [studyTimeId, userId, CLASS_SCHEDULE_TYPE_ID]
  );
  return rows[0] ?? null;
};

const getLatestOpenSession = async (
  connection: PoolConnection,
  userId: number,
  lock = false
) => {
  const [rows] = await connection.query<StudySessionRow[]>(
    `${SESSION_SELECT}
     WHERE schedule.user_id = ?
       AND terms.term_status = 1
       AND schedule.schedule_type_id = ?
       AND (
         study.session_status IN ('running', 'paused')
         OR (
           study.session_status = 'interrupted'
           AND study.time_spent IS NULL
         )
       )
     ORDER BY study.study_time_id DESC
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [userId, CLASS_SCHEDULE_TYPE_ID]
  );
  return rows[0] ?? null;
};

const interruptExpiredSessions = async (
  connection: PoolConnection,
  userId: number,
  termId: number
) => {
  const [expiredRows] = await connection.query<RowDataPacket[]>(
    `SELECT study.study_time_id
     FROM study_time study
     INNER JOIN schedule_time schedule
       ON schedule.schedule_time_id = study.schedule_time_id
     WHERE schedule.user_id = ?
       AND schedule.term_id = ?
       AND schedule.schedule_type_id = ?
       AND study.session_status = 'running'
       AND study.running_since IS NOT NULL
       AND study.accumulated_seconds +
         GREATEST(0, TIMESTAMPDIFF(SECOND, study.running_since, NOW())) >= ?
     FOR UPDATE`,
    [userId, termId, CLASS_SCHEDULE_TYPE_ID, HARD_LIMIT_SECONDS]
  );

  if (expiredRows.length === 0) return [];

  const ids = expiredRows.map((row) => Number(row.study_time_id));
  const placeholders = ids.map(() => "?").join(", ");
  await connection.query(
    `UPDATE study_time
     SET
       end_time = TIMESTAMPADD(
         SECOND,
         GREATEST(0, ? - accumulated_seconds),
         running_since
       ),
       accumulated_seconds = ?,
       time_spent = NULL,
       session_status = 'interrupted',
       running_since = NULL,
       last_seen_at = NOW(),
       version = version + 1
     WHERE study_time_id IN (${placeholders})`,
    [HARD_LIMIT_SECONDS, HARD_LIMIT_SECONDS, ...ids]
  );

  return ids;
};

const sendVersionConflict = (res: Response, session: StudySessionRow) =>
  res.status(409).json({
    code: "SESSION_VERSION_CONFLICT",
    message: "Study session was updated from another device",
    data: serializeSession(session),
  });

const sendInvalidState = (
  res: Response,
  session: StudySessionRow,
  expectedStatus: string
) =>
  res.status(409).json({
    code: "INVALID_SESSION_STATE",
    message: `Study session must be ${expectedStatus}`,
    data: serializeSession(session),
  });

const refreshSession = async (
  connection: PoolConnection,
  studyTimeId: number,
  userId: number
) => {
  const session = await getOwnedSession(connection, studyTimeId, userId);
  if (!session) throw new Error("Updated study session could not be reloaded");
  return session;
};

export const getTimerSetup = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const currentTerm = await getCurrentTerm(userId);
    if (!currentTerm) {
      return res.status(404).json({
        code: "NO_CURRENT_TERM",
        message: "No current term found",
      });
    }

    const [subjects] = await db.query<RowDataPacket[]>(
      `SELECT
         MIN(st.schedule_time_id) AS schedule_time_id,
         s.subject_id,
         s.subject_name,
         s.teacher_name
       FROM schedule_time st
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       WHERE st.user_id = ?
         AND st.term_id = ?
         AND st.schedule_type_id = ?
       GROUP BY s.subject_id, s.subject_name, s.teacher_name
       ORDER BY s.subject_name, s.subject_id`,
      [userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );

    const [studyTypes] = await db.query<RowDataPacket[]>(
      `SELECT study_type_id, study_type_name
       FROM study_types
       ORDER BY study_type_id`
    );

    return res.json({
      message: "Timer setup retrieved successfully",
      current_term: currentTerm,
      subjects,
      study_types: studyTypes,
      timer_policy: {
        hard_limit_seconds: HARD_LIMIT_SECONDS,
        stale_after_seconds: STALE_AFTER_MINUTES * 60,
      },
    });
  } catch (error) {
    console.error("getTimerSetup error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  }
};

export const getActiveStudySession = async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const currentTerm = await getCurrentTerm(userId, connection, true);
    if (!currentTerm) {
      await connection.rollback();
      return res.status(404).json({
        code: "NO_CURRENT_TERM",
        message: "No current term found",
      });
    }

    await interruptExpiredSessions(connection, userId, currentTerm.term_id);
    const session = await getLatestOpenSession(connection, userId, true);
    await connection.commit();

    const data = session ? serializeSession(session) : null;
    return res.json({
      message: session
        ? "Open study session retrieved successfully"
        : "No open study session",
      data,
      requires_recovery: Boolean(
        session &&
          (session.session_status === "interrupted" || session.is_stale)
      ),
    });
  } catch (error) {
    await connection.rollback();
    console.error("getActiveStudySession error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};

export const startStudySession = async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const scheduleTimeId = parsePositiveInteger(req.body.schedule_time_id);
  const studyTypeId = parsePositiveInteger(req.body.study_type_id);
  if (!scheduleTimeId || !studyTypeId) {
    return res.status(400).json({
      code: "INVALID_TIMER_SELECTION",
      message: "schedule_time_id and study_type_id must be positive integers",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const currentTerm = await getCurrentTerm(userId, connection, true);
    if (!currentTerm) {
      await connection.rollback();
      return res.status(404).json({
        code: "NO_CURRENT_TERM",
        message: "No current term found",
      });
    }

    await interruptExpiredSessions(connection, userId, currentTerm.term_id);
    const openSession = await getLatestOpenSession(connection, userId, true);
    if (openSession) {
      await connection.rollback();
      return res.status(409).json({
        code: "OPEN_SESSION_EXISTS",
        message: "An open study session already exists",
        data: serializeSession(openSession),
      });
    }

    const [scheduleRows] = await connection.query<RowDataPacket[]>(
      `SELECT schedule_time_id
       FROM schedule_time
       WHERE schedule_time_id = ?
         AND user_id = ?
         AND term_id = ?
         AND schedule_type_id = ?
       LIMIT 1`,
      [scheduleTimeId, userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );
    if (scheduleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        code: "SUBJECT_NOT_FOUND",
        message: "Class subject for the current term was not found",
      });
    }

    const [typeRows] = await connection.query<RowDataPacket[]>(
      `SELECT study_type_id FROM study_types WHERE study_type_id = ? LIMIT 1`,
      [studyTypeId]
    );
    if (typeRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        code: "STUDY_TYPE_NOT_FOUND",
        message: "Study type was not found",
      });
    }

    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO study_time (
         study_type_id,
         schedule_time_id,
         start_time,
         end_time,
         time_spent,
         session_status,
         running_since,
         accumulated_seconds,
         last_seen_at,
         version
       ) VALUES (?, ?, NOW(), NULL, NULL, 'running', NOW(), 0, NOW(), 1)`,
      [studyTypeId, scheduleTimeId]
    );

    const createdSession = await refreshSession(
      connection,
      result.insertId,
      userId
    );
    await connection.commit();
    return res.status(201).json({
      message: "Study session started successfully",
      data: serializeSession(createdSession),
    });
  } catch (error) {
    await connection.rollback();
    console.error("startStudySession error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};

export const pauseStudySession = async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const studyTimeId = parsePositiveInteger(req.params.study_time_id);
  const version = parsePositiveInteger(req.body.version);
  if (!studyTimeId || !version) {
    return res.status(400).json({
      code: "INVALID_SESSION_REQUEST",
      message: "A valid study_time_id and version are required",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const session = await getOwnedSession(connection, studyTimeId, userId, true);
    if (!session) {
      await connection.rollback();
      return res.status(404).json({
        code: "SESSION_NOT_FOUND",
        message: "Study session for the current term was not found",
      });
    }
    if (session.session_status === "paused") {
      await connection.commit();
      return res.json({
        message: "Study session is already paused",
        data: serializeSession(session),
      });
    }
    if (session.session_status !== "running") {
      await connection.rollback();
      return sendInvalidState(res, session, "running");
    }
    if (session.version !== version) {
      await connection.rollback();
      return sendVersionConflict(res, session);
    }

    const elapsedSeconds = Number(session.elapsed_seconds);
    if (elapsedSeconds >= HARD_LIMIT_SECONDS) {
      await connection.query(
        `UPDATE study_time
         SET end_time = COALESCE(
               TIMESTAMPADD(
                 SECOND,
                 GREATEST(0, ? - accumulated_seconds),
                 running_since
               ),
               NOW()
             ),
             accumulated_seconds = ?, time_spent = NULL,
             session_status = 'interrupted', running_since = NULL,
             last_seen_at = NOW(), version = version + 1
         WHERE study_time_id = ?`,
        [HARD_LIMIT_SECONDS, HARD_LIMIT_SECONDS, studyTimeId]
      );
      const interrupted = await refreshSession(connection, studyTimeId, userId);
      await connection.commit();
      return res.status(409).json({
        code: "SESSION_HARD_LIMIT_REACHED",
        message: "Study session reached the four-hour limit",
        data: serializeSession(interrupted),
      });
    }

    await connection.query(
      `UPDATE study_time
       SET accumulated_seconds = ?, session_status = 'paused',
           running_since = NULL, last_seen_at = NOW(), version = version + 1
       WHERE study_time_id = ? AND version = ?`,
      [elapsedSeconds, studyTimeId, version]
    );
    const pausedSession = await refreshSession(connection, studyTimeId, userId);
    await connection.commit();
    return res.json({
      message: "Study session paused successfully",
      data: serializeSession(pausedSession),
    });
  } catch (error) {
    await connection.rollback();
    console.error("pauseStudySession error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};

export const resumeStudySession = async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const studyTimeId = parsePositiveInteger(req.params.study_time_id);
  const version = parsePositiveInteger(req.body.version);
  if (!studyTimeId || !version) {
    return res.status(400).json({
      code: "INVALID_SESSION_REQUEST",
      message: "A valid study_time_id and version are required",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const session = await getOwnedSession(connection, studyTimeId, userId, true);
    if (!session) {
      await connection.rollback();
      return res.status(404).json({
        code: "SESSION_NOT_FOUND",
        message: "Study session for the current term was not found",
      });
    }
    if (session.session_status === "running") {
      await connection.commit();
      return res.json({
        message: "Study session is already running",
        data: serializeSession(session),
      });
    }
    if (session.session_status !== "paused") {
      await connection.rollback();
      return sendInvalidState(res, session, "paused");
    }
    if (session.version !== version) {
      await connection.rollback();
      return sendVersionConflict(res, session);
    }
    if (session.accumulated_seconds >= HARD_LIMIT_SECONDS) {
      await connection.rollback();
      return res.status(409).json({
        code: "SESSION_HARD_LIMIT_REACHED",
        message: "Study session reached the four-hour limit",
        data: serializeSession(session),
      });
    }

    await connection.query(
      `UPDATE study_time
       SET session_status = 'running', running_since = NOW(),
           last_seen_at = NOW(), version = version + 1
       WHERE study_time_id = ? AND version = ?`,
      [studyTimeId, version]
    );
    const resumedSession = await refreshSession(connection, studyTimeId, userId);
    await connection.commit();
    return res.json({
      message: "Study session resumed successfully",
      data: serializeSession(resumedSession),
    });
  } catch (error) {
    await connection.rollback();
    console.error("resumeStudySession error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};

export const heartbeatStudySession = async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const studyTimeId = parsePositiveInteger(req.params.study_time_id);
  const version = parsePositiveInteger(req.body.version);
  if (!studyTimeId || !version) {
    return res.status(400).json({
      code: "INVALID_SESSION_REQUEST",
      message: "A valid study_time_id and version are required",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const session = await getOwnedSession(connection, studyTimeId, userId, true);
    if (!session) {
      await connection.rollback();
      return res.status(404).json({
        code: "SESSION_NOT_FOUND",
        message: "Study session for the current term was not found",
      });
    }
    if (!(["running", "paused"] as SessionStatus[]).includes(session.session_status)) {
      await connection.rollback();
      return sendInvalidState(res, session, "running or paused");
    }
    if (session.version !== version) {
      await connection.rollback();
      return sendVersionConflict(res, session);
    }
    if (Number(session.elapsed_seconds) >= HARD_LIMIT_SECONDS) {
      await connection.query(
        `UPDATE study_time
         SET end_time = COALESCE(
               TIMESTAMPADD(
                 SECOND,
                 GREATEST(0, ? - accumulated_seconds),
                 running_since
               ),
               NOW()
             ),
             accumulated_seconds = ?, time_spent = NULL,
             session_status = 'interrupted', running_since = NULL,
             last_seen_at = NOW(), version = version + 1
         WHERE study_time_id = ?`,
        [HARD_LIMIT_SECONDS, HARD_LIMIT_SECONDS, studyTimeId]
      );
      const interrupted = await refreshSession(connection, studyTimeId, userId);
      await connection.commit();
      return res.status(409).json({
        code: "SESSION_HARD_LIMIT_REACHED",
        message: "Study session reached the four-hour limit",
        data: serializeSession(interrupted),
      });
    }

    await connection.query(
      `UPDATE study_time SET last_seen_at = NOW() WHERE study_time_id = ?`,
      [studyTimeId]
    );
    const heartbeatSession = await refreshSession(
      connection,
      studyTimeId,
      userId
    );
    await connection.commit();
    return res.json({
      message: "Study session heartbeat recorded",
      data: serializeSession(heartbeatSession),
    });
  } catch (error) {
    await connection.rollback();
    console.error("heartbeatStudySession error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};

export const finishStudySession = async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const studyTimeId = parsePositiveInteger(req.params.study_time_id);
  const version = parsePositiveInteger(req.body.version);
  if (!studyTimeId || !version) {
    return res.status(400).json({
      code: "INVALID_SESSION_REQUEST",
      message: "A valid study_time_id and version are required",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const session = await getOwnedSession(connection, studyTimeId, userId, true);
    if (!session) {
      await connection.rollback();
      return res.status(404).json({
        code: "SESSION_NOT_FOUND",
        message: "Study session for the current term was not found",
      });
    }
    if (session.session_status === "completed") {
      await connection.commit();
      return res.json({
        message: "Study session is already completed",
        data: serializeSession(session),
      });
    }
    if (!(["running", "paused"] as SessionStatus[]).includes(session.session_status)) {
      await connection.rollback();
      return sendInvalidState(res, session, "running or paused");
    }
    if (session.version !== version) {
      await connection.rollback();
      return sendVersionConflict(res, session);
    }

    if (Number(session.elapsed_seconds) >= HARD_LIMIT_SECONDS) {
      await connection.query(
        `UPDATE study_time
         SET end_time = COALESCE(
               TIMESTAMPADD(
                 SECOND,
                 GREATEST(0, ? - accumulated_seconds),
                 running_since
               ),
               NOW()
             ),
             accumulated_seconds = ?, time_spent = NULL,
             session_status = 'interrupted', running_since = NULL,
             last_seen_at = NOW(), version = version + 1
         WHERE study_time_id = ? AND version = ?`,
        [HARD_LIMIT_SECONDS, HARD_LIMIT_SECONDS, studyTimeId, version]
      );
      const interruptedSession = await refreshSession(
        connection,
        studyTimeId,
        userId
      );
      await connection.commit();
      return res.status(409).json({
        code: "SESSION_HARD_LIMIT_REACHED",
        message: "Study session reached the four-hour limit",
        data: serializeSession(interruptedSession),
      });
    }

    const elapsedSeconds = Number(session.elapsed_seconds);
    const timeSpent = Number((elapsedSeconds / 60).toFixed(2));

    await connection.query(
      `UPDATE study_time
       SET accumulated_seconds = ?, end_time = NOW(), time_spent = ?,
           session_status = 'completed', running_since = NULL,
           last_seen_at = NOW(), version = version + 1
       WHERE study_time_id = ? AND version = ?`,
      [elapsedSeconds, timeSpent, studyTimeId, version]
    );
    const finishedSession = await refreshSession(connection, studyTimeId, userId);
    await connection.commit();

    return res.json({
      message: "Study session finished successfully",
      data: serializeSession(finishedSession),
    });
  } catch (error) {
    await connection.rollback();
    console.error("finishStudySession error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};

export const recoverStudySession = async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const studyTimeId = parsePositiveInteger(req.params.study_time_id);
  const version = parsePositiveInteger(req.body.version);
  const action = req.body.action as RecoveryAction;
  const allowedActions: RecoveryAction[] = [
    "continue",
    "finish_last_seen",
    "finish_now",
    "save_interrupted",
    "cancel",
  ];
  if (!studyTimeId || !version || !allowedActions.includes(action)) {
    return res.status(400).json({
      code: "INVALID_RECOVERY_REQUEST",
      message: "A valid study_time_id, version, and recovery action are required",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const session = await getOwnedSession(connection, studyTimeId, userId, true);
    if (!session) {
      await connection.rollback();
      return res.status(404).json({
        code: "SESSION_NOT_FOUND",
        message: "Study session for the current term was not found",
      });
    }
    if (session.version !== version) {
      await connection.rollback();
      return sendVersionConflict(res, session);
    }

    if (action === "save_interrupted") {
      if (session.session_status !== "interrupted") {
        await connection.rollback();
        return sendInvalidState(res, session, "interrupted");
      }
      const seconds = Math.min(
        HARD_LIMIT_SECONDS,
        Number(session.accumulated_seconds)
      );
      await connection.query(
        `UPDATE study_time
         SET end_time = COALESCE(end_time, last_seen_at, NOW()),
             time_spent = ?, session_status = 'completed',
             last_seen_at = NOW(), version = version + 1
         WHERE study_time_id = ? AND version = ?`,
        [Number((seconds / 60).toFixed(2)), studyTimeId, version]
      );
    } else if (action === "cancel") {
      if (!(["running", "paused", "interrupted"] as SessionStatus[]).includes(session.session_status)) {
        await connection.rollback();
        return sendInvalidState(res, session, "running, paused, or interrupted");
      }
      await connection.query(
        `UPDATE study_time
         SET end_time = COALESCE(end_time, NOW()), time_spent = NULL,
             session_status = 'cancelled', running_since = NULL,
             last_seen_at = NOW(), version = version + 1
         WHERE study_time_id = ? AND version = ?`,
        [studyTimeId, version]
      );
    } else {
      if (session.session_status !== "running") {
        await connection.rollback();
        return sendInvalidState(res, session, "running");
      }
      if (!session.is_stale) {
        await connection.rollback();
        return res.status(409).json({
          code: "SESSION_NOT_STALE",
          message: "Study session does not require recovery",
          data: serializeSession(session),
        });
      }

      if (action === "continue") {
        await connection.query(
          `UPDATE study_time
           SET last_seen_at = NOW(), version = version + 1
           WHERE study_time_id = ? AND version = ?`,
          [studyTimeId, version]
        );
      } else {
        let elapsedSeconds: number;
        let endTime: Date;
        if (action === "finish_last_seen") {
          const lastSeen = session.last_seen_at ?? session.start_time;
          const runningSince = session.running_since ?? session.start_time;
          const extraSeconds = Math.max(
            0,
            Math.floor((lastSeen.getTime() - runningSince.getTime()) / 1000)
          );
          elapsedSeconds = Math.min(
            HARD_LIMIT_SECONDS,
            session.accumulated_seconds + extraSeconds
          );
          endTime = lastSeen;
        } else {
          elapsedSeconds = Math.min(
            HARD_LIMIT_SECONDS,
            Number(session.elapsed_seconds)
          );
          endTime = new Date();
        }

        await connection.query(
          `UPDATE study_time
           SET accumulated_seconds = ?, end_time = ?, time_spent = ?,
               session_status = 'completed', running_since = NULL,
               last_seen_at = NOW(), version = version + 1
           WHERE study_time_id = ? AND version = ?`,
          [
            elapsedSeconds,
            endTime,
            Number((elapsedSeconds / 60).toFixed(2)),
            studyTimeId,
            version,
          ]
        );
      }
    }

    const recoveredSession = await refreshSession(connection, studyTimeId, userId);
    await connection.commit();
    return res.json({
      message: "Study session recovery completed successfully",
      data: serializeSession(recoveredSession),
    });
  } catch (error) {
    await connection.rollback();
    console.error("recoverStudySession error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};

export const getStudyDashboard = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const currentTerm = await getCurrentTerm(userId);
    if (!currentTerm) {
      return res.status(404).json({
        code: "NO_CURRENT_TERM",
        message: "No current term found",
      });
    }

    const [weeklyRows] = await db.query<WeeklyStudyRow[]>(
      `SELECT
         FLOOR(DATEDIFF(DATE(study.start_time), DATE(?)) / 7) + 1 AS week_number,
         COALESCE(SUM(study.time_spent), 0) AS total_minutes
       FROM study_time study
       INNER JOIN schedule_time schedule
         ON schedule.schedule_time_id = study.schedule_time_id
       WHERE schedule.user_id = ?
         AND schedule.term_id = ?
         AND schedule.schedule_type_id = ?
         AND study.session_status = 'completed'
         AND study.time_spent IS NOT NULL
         AND study.start_time >= ?
       GROUP BY week_number
       ORDER BY week_number`,
      [
        currentTerm.created_at,
        userId,
        currentTerm.term_id,
        CLASS_SCHEDULE_TYPE_ID,
        currentTerm.created_at,
      ]
    );

    const [historyRows] = await db.query<HistoryRow[]>(
      `SELECT
         DATE_FORMAT(study.start_time, '%Y-%m') AS month_key,
         subjects.subject_id,
         subjects.subject_name,
         types.study_type_name,
         COALESCE(SUM(study.time_spent), 0) AS total_minutes,
         COUNT(*) AS session_count
       FROM study_time study
       INNER JOIN study_types types
         ON types.study_type_id = study.study_type_id
       INNER JOIN schedule_time schedule
         ON schedule.schedule_time_id = study.schedule_time_id
       INNER JOIN subjects
         ON subjects.subject_id = schedule.subject_id
       WHERE schedule.user_id = ?
         AND schedule.term_id = ?
         AND schedule.schedule_type_id = ?
         AND study.session_status = 'completed'
         AND study.time_spent IS NOT NULL
       GROUP BY
         month_key,
         subjects.subject_id,
         subjects.subject_name,
         types.study_type_name
       ORDER BY month_key DESC, subjects.subject_name`,
      [userId, currentTerm.term_id, CLASS_SCHEDULE_TYPE_ID]
    );

    const termStart = new Date(currentTerm.created_at);
    const now = new Date();
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    const elapsedWeeks = Math.max(
      1,
      Math.floor((now.getTime() - termStart.getTime()) / millisecondsPerWeek) + 1
    );
    const elapsedMonths = Math.max(
      1,
      (now.getFullYear() - termStart.getFullYear()) * 12 +
        now.getMonth() -
        termStart.getMonth() +
        1
    );

    const weeklyTotals = new Map(
      weeklyRows.map((row) => [Number(row.week_number), toNumber(row.total_minutes)])
    );
    const weeks = Array.from({ length: elapsedWeeks }, (_, index) => {
      const weekNumber = index + 1;
      const weekStart = new Date(termStart);
      weekStart.setDate(termStart.getDate() + index * 7);
      return {
        week_number: weekNumber,
        week_start: formatLocalDate(weekStart),
        total_minutes: weeklyTotals.get(weekNumber) ?? 0,
      };
    });

    const totalMinutes = weeks.reduce(
      (sum, week) => sum + week.total_minutes,
      0
    );
    const currentWeek = weeks[weeks.length - 1];

    const monthMap = new Map<
      string,
      {
        month_key: string;
        total_minutes: number;
        session_count: number;
        subjects: Map<
          string,
          {
            subject_id: string;
            subject_name: string;
            total_minutes: number;
            session_count: number;
            methods: Record<string, number>;
          }
        >;
      }
    >();

    for (const row of historyRows) {
      const month = monthMap.get(row.month_key) ?? {
        month_key: row.month_key,
        total_minutes: 0,
        session_count: 0,
        subjects: new Map(),
      };
      const subject = month.subjects.get(row.subject_id) ?? {
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        total_minutes: 0,
        session_count: 0,
        methods: {},
      };
      const minutes = toNumber(row.total_minutes);
      const sessionCount = Number(row.session_count);
      subject.total_minutes += minutes;
      subject.session_count += sessionCount;
      subject.methods[row.study_type_name] = minutes;
      month.total_minutes += minutes;
      month.session_count += sessionCount;
      month.subjects.set(row.subject_id, subject);
      monthMap.set(row.month_key, month);
    }

    const history = Array.from(monthMap.values()).map((month) => ({
      month_key: month.month_key,
      total_minutes: Number(month.total_minutes.toFixed(2)),
      session_count: month.session_count,
      subjects: Array.from(month.subjects.values())
        .map((subject) => ({
          ...subject,
          total_minutes: Number(subject.total_minutes.toFixed(2)),
        }))
        .sort((a, b) => b.total_minutes - a.total_minutes),
    }));

    return res.json({
      message: "Study dashboard retrieved successfully",
      current_term: currentTerm,
      summary: {
        current_week_minutes: currentWeek?.total_minutes ?? 0,
        total_term_minutes: Number(totalMinutes.toFixed(2)),
        average_weekly_minutes: Number((totalMinutes / elapsedWeeks).toFixed(2)),
        average_monthly_minutes: Number((totalMinutes / elapsedMonths).toFixed(2)),
      },
      weeks,
      history,
    });
  } catch (error) {
    console.error("getStudyDashboard error:", error);
    return res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  }
};
