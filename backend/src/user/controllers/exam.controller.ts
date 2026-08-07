import { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

const CLASS_SCHEDULE_TYPE_ID = 1;

type UserRequest = Request & {
  user?: { id?: number | string; role?: string };
};

interface AccessibleExamRow extends RowDataPacket {
  exam_repository_id: number;
  schedule_time_id: number;
  subject_id: string;
  subject_name: string;
  exam_name: string;
  total_score: number | string;
  total_question: number;
  time_limit: number;
}

interface ExamPartRow extends RowDataPacket {
  exam_part_id: number;
  part_order: number;
  exam_part_name: string;
}

interface ExamQuestionRow extends RowDataPacket {
  question_id: number;
  exam_part_id: number;
  question_order: number;
  question_text: string;
  question_score: number | string;
}

interface ExamChoiceRow extends RowDataPacket {
  choice_id: number;
  question_id: number;
  choice_order: number;
  choice_text: string;
  is_correct: 0 | 1;
}

interface TopicInsightRow extends RowDataPacket {
  exam_score_history_id: number;
  schedule_time_id: number;
  exam_repository_id: number;
  exam_part_id: number;
  exam_part_name: string;
  subject_id: string;
  subject_name: string;
  exam_name: string;
  actual_score: number | string;
  max_score: number | string;
  percentage: number | string;
  study_type_id: number | null;
  study_type_name: string | null;
  exam_date: Date | string;
}

interface CheckpointInsightRow extends RowDataPacket {
  schedule_time_id: number;
  exam_repository_id: number;
  exam_name: string;
  subject_id: string;
  subject_name: string;
  next_checkpoint_at: Date | string;
  interval_weeks: number;
  weak_topic_count: number;
  review_minutes_delta: number;
}

interface StudyTypeRow extends RowDataPacket {
  study_type_id: number;
  study_type_name: string;
}

const findStudyTypeForPercentage = (
  studyTypes: StudyTypeRow[],
  percentage: number,
) => {
  if (percentage >= 80) return undefined;
  const preferredName =
    percentage < 50 ? "practice" : percentage < 65 ? "review" : "reading";
  return studyTypes.find(
    (type) => type.study_type_name.toLowerCase() === preferredName,
  );
};

const getUser = (req: Request) => (req as UserRequest).user;

const getAccessibleExam = async (
  userId: number | string,
  examRepositoryId: number,
): Promise<AccessibleExamRow | undefined> => {
  const [rows] = await db.query<AccessibleExamRow[]>(
    `SELECT
       er.exam_repository_id,
       MIN(st.schedule_time_id) AS schedule_time_id,
       er.subject_id,
       s.subject_name,
       er.exam_name,
       CAST(er.total_score AS DOUBLE) AS total_score,
       er.total_question,
       er.time_limit
     FROM exam_repository er
     INNER JOIN subjects s ON s.subject_id = er.subject_id
     INNER JOIN schedule_time st ON st.subject_id = er.subject_id
     INNER JOIN terms t ON t.term_id = st.term_id
     WHERE er.exam_repository_id = ? AND st.user_id = ?
       AND t.term_status = 1 AND st.schedule_type_id = ?
     GROUP BY er.exam_repository_id, er.subject_id, s.subject_name,
       er.exam_name, er.total_score, er.total_question, er.time_limit
     LIMIT 1`,
    [examRepositoryId, userId, CLASS_SCHEDULE_TYPE_ID]
  );
  return rows[0];
};

// ==========================================================================
// 1. แสดงแบบทดสอบตามรายวิชาในเทอมปัจจุบันของผู้ใช้
// ==========================================================================
export const getExamsForCurrentTerm = async (req: Request, res: Response) => {
  try {
    const authUser = getUser(req);
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const [rows] = await db.query<AccessibleExamRow[]>(
      `SELECT
         er.exam_repository_id,
         MIN(st.schedule_time_id) AS schedule_time_id,
         er.subject_id,
         s.subject_name,
         er.exam_name,
         CAST(er.total_score AS DOUBLE) AS total_score,
         er.total_question,
         er.time_limit
       FROM exam_repository er
       JOIN subjects s ON er.subject_id = s.subject_id
       JOIN schedule_time st ON st.subject_id = er.subject_id
       JOIN terms t ON st.term_id = t.term_id
       WHERE st.user_id = ? AND t.term_status = 1
         AND st.schedule_type_id = ?
         AND NOT EXISTS (
           SELECT 1
           FROM exam_checkpoint ec
           INNER JOIN schedule_time checkpoint_st
             ON checkpoint_st.schedule_time_id = ec.schedule_time_id
           WHERE ec.user_id = st.user_id
             AND ec.exam_repository_id = er.exam_repository_id
             AND checkpoint_st.subject_id = er.subject_id
             AND ec.next_checkpoint_at > NOW()
         )
       GROUP BY er.exam_repository_id, er.subject_id, s.subject_name,
         er.exam_name, er.total_score, er.total_question, er.time_limit
       ORDER BY s.subject_name ASC, er.exam_name ASC`,
      [userId, CLASS_SCHEDULE_TYPE_ID]
    );

    res.json({
      message: "Exams retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getExamsForCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// 3. แสดงประวัติคะแนนสอบของผู้ใช้ (ทุกวิชา เรียงล่าสุดก่อน)
// ==========================================================================
export const getExamScoreHistory = async (req: Request, res: Response) => {
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
         esh.exam_score_history_id,
         esh.schedule_time_id,
         esh.exam_repository_id,
         er.exam_name,
         s.subject_id,
         s.subject_name,
         esh.actual_score,
         esh.exam_max_score,
         esh.exam_date
       FROM exam_score_history esh
       JOIN schedule_time st ON esh.schedule_time_id = st.schedule_time_id
       JOIN exam_repository er ON esh.exam_repository_id = er.exam_repository_id
       JOIN subjects s ON er.subject_id = s.subject_id
       WHERE st.user_id = ?
       ORDER BY esh.exam_date DESC`,
      [userId]
    );

    const [topicRows]: any = await db.query(
      `SELECT
         psh.exam_score_history_id,
         ep.exam_part_name AS topic_name,
         ROUND((psh.part_score / NULLIF(ep.part_score, 0)) * 100, 2) AS percentage
       FROM part_score_history psh
       INNER JOIN exam_score_history esh
         ON esh.exam_score_history_id = psh.exam_score_history_id
       INNER JOIN schedule_time st
         ON st.schedule_time_id = esh.schedule_time_id
       INNER JOIN exam_part ep ON ep.exam_part_id = psh.exam_part_id
       WHERE st.user_id = ?
         AND ep.part_score > 0
         AND (psh.part_score / ep.part_score) * 100 < 80
       ORDER BY psh.exam_score_history_id DESC, percentage ASC`,
      [userId]
    );
    const weakTopicsByHistory = new Map<number, Array<{
      topic_name: string;
      percentage: number;
    }>>();
    for (const topic of topicRows) {
      const historyId = Number(topic.exam_score_history_id);
      const topics = weakTopicsByHistory.get(historyId) ?? [];
      topics.push({
        topic_name: topic.topic_name,
        percentage: Number(topic.percentage),
      });
      weakTopicsByHistory.set(historyId, topics);
    }

    res.json({
      message: "Exam score history retrieved successfully",
      user_id: userId,
      total: rows.length,
      data: rows.map((row: any) => ({
        ...row,
        weak_topics:
          weakTopicsByHistory.get(Number(row.exam_score_history_id)) ?? [],
      })),
    });
  } catch (err) {
    console.error("getExamScoreHistory error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// แสดงรายละเอียดข้อสอบโดยไม่ส่งเฉลยไปยังผู้ใช้
// ==========================================================================
export const getExamDetail = async (req: Request, res: Response) => {
  try {
    const authUser = getUser(req);
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }

    const examRepositoryId = Number(req.params.exam_repository_id);
    if (!Number.isInteger(examRepositoryId) || examRepositoryId <= 0) {
      return res.status(400).json({ message: "A valid exam_repository_id is required" });
    }

    const exam = await getAccessibleExam(authUser.id, examRepositoryId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found for the current term" });
    }

    const [parts] = await db.query<ExamPartRow[]>(
      `SELECT exam_part_id, part_order, exam_part_name
       FROM exam_part
       WHERE exam_repository_id = ?
       ORDER BY part_order, exam_part_id`,
      [examRepositoryId]
    );
    const [questions] = await db.query<ExamQuestionRow[]>(
      `SELECT q.question_id, q.exam_part_id, q.question_order, q.question_text,
         CAST(q.question_score AS DOUBLE) AS question_score
       FROM question q
       INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
       WHERE ep.exam_repository_id = ?
       ORDER BY ep.part_order, q.question_order, q.question_id`,
      [examRepositoryId]
    );
    const [choices] = await db.query<ExamChoiceRow[]>(
      `SELECT c.choice_id, c.question_id, c.choice_order, c.choice_text,
         c.is_correct
       FROM choice c
       INNER JOIN question q ON q.question_id = c.question_id
       INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
       WHERE ep.exam_repository_id = ?
       ORDER BY ep.part_order, q.question_order, c.choice_order, c.choice_id`,
      [examRepositoryId]
    );
    if (questions.length === 0) {
      return res.status(409).json({ message: "This exam does not have any questions" });
    }
    const invalidQuestion = questions.find(
      (question) =>
        choices.filter(
          (choice) =>
            choice.question_id === question.question_id && choice.is_correct === 1,
        ).length !== 1,
    );
    if (invalidQuestion) {
      return res.status(409).json({
        message: "Every question must have exactly one correct choice",
      });
    }

    return res.json({
      message: "Exam detail retrieved successfully",
      data: {
        ...exam,
        total_score: Number(exam.total_score),
        parts: parts.map((part) => ({
          exam_part_id: part.exam_part_id,
          part_order: part.part_order,
          exam_part_name: part.exam_part_name,
          questions: questions
            .filter((question) => question.exam_part_id === part.exam_part_id)
            .map((question) => ({
              question_id: question.question_id,
              question_order: question.question_order,
              question_text: question.question_text,
              question_score: Number(question.question_score),
              choices: choices
                .filter((choice) => choice.question_id === question.question_id)
                .map((choice) => ({
                  choice_id: choice.choice_id,
                  choice_order: choice.choice_order,
                  choice_text: choice.choice_text,
                })),
            })),
        })),
      },
    });
  } catch (err) {
    console.error("getExamDetail error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// ตรวจคำตอบ บันทึกคะแนน และไม่เชื่อคะแนนที่คำนวณจาก client
// ==========================================================================
export const submitExam = async (req: Request, res: Response) => {
  try {
    const authUser = getUser(req);
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }

    const examRepositoryId = Number(req.params.exam_repository_id);
    const rawAnswers = req.body.answers;
    if (
      !Number.isInteger(examRepositoryId) ||
      examRepositoryId <= 0 ||
      !Array.isArray(rawAnswers)
    ) {
      return res.status(400).json({
        message: "A valid exam_repository_id and answers array are required",
      });
    }

    const exam = await getAccessibleExam(authUser.id, examRepositoryId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found for the current term" });
    }

    const answers = new Map<number, number>();
    for (const rawAnswer of rawAnswers) {
      const questionId = Number(rawAnswer?.question_id);
      const choiceId = Number(rawAnswer?.choice_id);
      if (
        !Number.isInteger(questionId) ||
        questionId <= 0 ||
        !Number.isInteger(choiceId) ||
        choiceId <= 0
      ) {
        return res.status(400).json({ message: "Every answer must contain valid IDs" });
      }
      answers.set(questionId, choiceId);
    }

    const [questions] = await db.query<ExamQuestionRow[]>(
      `SELECT q.question_id, q.exam_part_id, q.question_order, q.question_text,
         CAST(q.question_score AS DOUBLE) AS question_score
       FROM question q
       INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
       WHERE ep.exam_repository_id = ?`,
      [examRepositoryId]
    );
    const [parts] = await db.query<ExamPartRow[]>(
      `SELECT exam_part_id, part_order, exam_part_name
       FROM exam_part
       WHERE exam_repository_id = ?`,
      [examRepositoryId]
    );
    const [choices] = await db.query<ExamChoiceRow[]>(
      `SELECT c.choice_id, c.question_id, c.choice_order, c.choice_text,
         c.is_correct
       FROM choice c
       INNER JOIN question q ON q.question_id = c.question_id
       INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
       WHERE ep.exam_repository_id = ?`,
      [examRepositoryId]
    );
    const [studyTypes] = await db.query<StudyTypeRow[]>(
      `SELECT study_type_id, study_type_name
       FROM study_types
       ORDER BY study_type_id`
    );

    if (questions.length === 0) {
      return res.status(409).json({ message: "This exam does not have any questions" });
    }
    const invalidQuestion = questions.find(
      (question) =>
        choices.filter(
          (choice) =>
            choice.question_id === question.question_id && choice.is_correct === 1,
        ).length !== 1,
    );
    if (invalidQuestion) {
      return res.status(409).json({
        message: "Every question must have exactly one correct choice",
      });
    }

    const topicScores = new Map<number, { actual: number; maximum: number }>();
    for (const part of parts) {
      topicScores.set(part.exam_part_id, { actual: 0, maximum: 0 });
    }
    for (const question of questions) {
      const topic = topicScores.get(question.exam_part_id);
      if (topic) topic.maximum += Number(question.question_score) || 0;
    }

    let actualScore = 0;
    let correctAnswers = 0;
    for (const [questionId, choiceId] of answers) {
      const question = questions.find((item) => item.question_id === questionId);
      const choice = choices.find(
        (item) => item.choice_id === choiceId && item.question_id === questionId
      );
      if (!question || !choice) {
        return res.status(400).json({ message: "An answer does not belong to this exam" });
      }
      if (choice.is_correct === 1) {
        const questionScore = Number(question.question_score) || 0;
        actualScore += questionScore;
        const topic = topicScores.get(question.exam_part_id);
        if (topic) topic.actual += questionScore;
        correctAnswers += 1;
      }
    }

    const maximumScore = questions.reduce(
      (sum, question) => sum + (Number(question.question_score) || 0),
      0
    );
    const normalizedScore = Number(actualScore.toFixed(2));
    const normalizedMaximum = Number(maximumScore.toFixed(2));
    const topicResults = parts
      .map((part) => {
        const scores = topicScores.get(part.exam_part_id) ?? {
          actual: 0,
          maximum: 0,
        };
        return {
          examPartId: part.exam_part_id,
          actual: Number(scores.actual.toFixed(2)),
          maximum: Number(scores.maximum.toFixed(2)),
          percentage:
            scores.maximum <= 0
              ? 0
              : Number(((scores.actual / scores.maximum) * 100).toFixed(2)),
        };
      })
      .filter((topic) => topic.maximum > 0)
      .map((topic) => ({
        ...topic,
        studyTypeId:
          findStudyTypeForPercentage(studyTypes, topic.percentage)?.study_type_id ??
          null,
      }));
    const weakTopicCount = topicResults.filter(
      (topic) => topic.percentage < 80
    ).length;
    const veryWeakTopicCount = topicResults.filter(
      (topic) => topic.percentage < 50
    ).length;
    const overallPercent =
      normalizedMaximum <= 0 ? 0 : (normalizedScore / normalizedMaximum) * 100;
    const intervalWeeks =
      veryWeakTopicCount > 0 || weakTopicCount >= 3
        ? 1
        : weakTopicCount > 0
          ? 2
          : overallPercent < 80
            ? 3
            : 4;
    const reviewMinutesDelta =
      weakTopicCount >= 3
        ? 30
        : weakTopicCount > 0
          ? 20
          : overallPercent >= 80
            ? -10
            : 0;
    const nextCheckpointAt = new Date(
      Date.now() + intervalWeeks * 7 * 24 * 60 * 60 * 1000
    );

    const connection = await db.getConnection();
    let historyId = 0;
    try {
      await connection.beginTransaction();
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO exam_score_history
           (schedule_time_id, exam_repository_id, actual_score, exam_max_score, exam_date)
         VALUES (?, ?, ?, ?, NOW())`,
        [
          exam.schedule_time_id,
          examRepositoryId,
          normalizedScore,
          normalizedMaximum,
        ]
      );
      historyId = result.insertId;

      for (const topic of topicResults) {
        await connection.query(
          `INSERT INTO part_score_history
             (exam_score_history_id, exam_part_id, part_score, study_type_id)
           VALUES (?, ?, ?, ?)`,
          [
            historyId,
            topic.examPartId,
            topic.actual,
            topic.studyTypeId,
          ]
        );
      }

      await connection.query(
        `INSERT INTO exam_checkpoint
           (user_id, schedule_time_id, exam_repository_id, next_checkpoint_at,
            interval_weeks, weak_topic_count, review_minutes_delta)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           next_checkpoint_at = VALUES(next_checkpoint_at),
           interval_weeks = VALUES(interval_weeks),
           weak_topic_count = VALUES(weak_topic_count),
           review_minutes_delta = VALUES(review_minutes_delta)`,
        [
          authUser.id,
          exam.schedule_time_id,
          examRepositoryId,
          nextCheckpointAt,
          intervalWeeks,
          weakTopicCount,
          reviewMinutesDelta,
        ]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.status(201).json({
      message: "Exam submitted successfully",
      exam_score_history_id: historyId,
      actual_score: normalizedScore,
      exam_max_score: normalizedMaximum,
      correct_answers: correctAnswers,
      total_questions: questions.length,
      next_checkpoint_at: nextCheckpointAt,
      checkpoint_interval_weeks: intervalWeeks,
      weak_topic_count: weakTopicCount,
      review_minutes_delta: reviewMinutesDelta,
    });
  } catch (err) {
    console.error("submitExam error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==========================================================================
// สรุปหัวข้ออ่อน คำแนะนำ และรอบ Checkpoint ถัดไป
// ==========================================================================
export const getExamInsights = async (req: Request, res: Response) => {
  try {
    const authUser = getUser(req);
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }

    const [topicRows] = await db.query<TopicInsightRow[]>(
      `SELECT
         psh.exam_score_history_id,
         esh.schedule_time_id,
         esh.exam_repository_id,
         psh.exam_part_id,
         ep.exam_part_name,
         s.subject_id,
         s.subject_name,
         er.exam_name,
         psh.part_score AS actual_score,
         ep.part_score AS max_score,
         ROUND((psh.part_score / NULLIF(ep.part_score, 0)) * 100, 2) AS percentage,
         psh.study_type_id,
         study_types.study_type_name,
         esh.exam_date
       FROM part_score_history psh
       INNER JOIN exam_score_history esh
         ON esh.exam_score_history_id = psh.exam_score_history_id
       INNER JOIN exam_part ep ON ep.exam_part_id = psh.exam_part_id
       LEFT JOIN study_types ON study_types.study_type_id = psh.study_type_id
       INNER JOIN exam_repository er
         ON er.exam_repository_id = esh.exam_repository_id
       INNER JOIN schedule_time st
         ON st.schedule_time_id = esh.schedule_time_id
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       INNER JOIN terms t ON t.term_id = st.term_id
       WHERE st.user_id = ? AND st.schedule_type_id = ? AND t.term_status = 1
       ORDER BY esh.exam_date DESC, percentage ASC`,
      [authUser.id, CLASS_SCHEDULE_TYPE_ID]
    );
    const [checkpointRows] = await db.query<CheckpointInsightRow[]>(
      `SELECT
         ec.schedule_time_id,
         ec.exam_repository_id,
         er.exam_name,
         s.subject_id,
         s.subject_name,
         ec.next_checkpoint_at,
         ec.interval_weeks,
         ec.weak_topic_count,
         ec.review_minutes_delta
       FROM exam_checkpoint ec
       INNER JOIN schedule_time st
         ON st.schedule_time_id = ec.schedule_time_id
       INNER JOIN subjects s ON s.subject_id = st.subject_id
       INNER JOIN exam_repository er
         ON er.exam_repository_id = ec.exam_repository_id
       INNER JOIN terms t ON t.term_id = st.term_id
       WHERE ec.user_id = ? AND st.schedule_type_id = ? AND t.term_status = 1
       ORDER BY ec.next_checkpoint_at ASC`,
      [authUser.id, CLASS_SCHEDULE_TYPE_ID]
    );
    const latestTopics = new Map<string, TopicInsightRow>();
    for (const row of topicRows) {
      const key = `${row.schedule_time_id}:${row.exam_repository_id}:${row.exam_part_id}`;
      if (!latestTopics.has(key)) latestTopics.set(key, row);
    }
    const weakTopics = [...latestTopics.values()]
      .filter((row) => Number(row.percentage) < 80)
      .sort((left, right) => Number(left.percentage) - Number(right.percentage))
      .map((row) => {
        const percentage = Number(row.percentage) || 0;
        return {
          schedule_time_id: row.schedule_time_id,
          exam_repository_id: row.exam_repository_id,
          exam_part_id: row.exam_part_id,
          topic_name: row.exam_part_name,
          subject_id: row.subject_id,
          subject_name: row.subject_name,
          exam_name: row.exam_name,
          actual_score: Number(row.actual_score),
          max_score: Number(row.max_score),
          percentage,
          study_type_id: Number(row.study_type_id ?? 0),
          study_type_name: row.study_type_name ?? "",
        };
      });

    return res.json({
      message: "Exam insights retrieved successfully",
      weak_topics: weakTopics,
      next_checkpoints: checkpointRows.map((row) => ({
        ...row,
        interval_weeks: Number(row.interval_weeks),
        weak_topic_count: Number(row.weak_topic_count),
        review_minutes_delta: Number(row.review_minutes_delta),
        review_schedule_type_id: 2,
      })),
    });
  } catch (err) {
    console.error("getExamInsights error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
