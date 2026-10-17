import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import db from "../../config/db";
import {
  getExamScoreHistory,
  saveExamAnswer,
  startExam,
  submitExam,
} from "../controllers/exam.controller";

test("one combined attempt appears once in score history with weak parts", async (t) => {
  t.mock.method(db, "query", async () => [[
    {
      exam_score_history_id: 51, exam_repository_id: 3,
      subject_id: "EN101", subject_name: "English", exam_period: "midterm",
      topic_name: "Greetings", actual_score: 80, exam_max_score: 100,
      exam_date: "2026-10-11 08:00:00", is_weak_topic: 1, percentage: 40,
    },
    {
      exam_score_history_id: 51, exam_repository_id: 8,
      subject_id: "EN101", subject_name: "English", exam_period: "midterm",
      topic_name: "Presentation", actual_score: 80, exam_max_score: 100,
      exam_date: "2026-10-11 08:00:00", is_weak_topic: 0, percentage: 90,
    },
  ]]);
  let body: { total?: number; data?: Array<Record<string, unknown>> } = {};
  const response = {
    json(value: typeof body) { body = value; return this; },
  } as unknown as Response;
  await getExamScoreHistory(
    { user: { id: 1, role: "user" }, query: {} } as unknown as Request,
    response,
  );

  assert.equal(body.total, 1);
  assert.equal(body.data?.[0].exam_name, "ชุดทดสอบกลางภาควิชา English");
  assert.deepEqual(body.data?.[0].weak_topics, [
    { topic_name: "Greetings", percentage: 40 },
  ]);
});

test("starting one subject exam snapshots questions from every published part", async (t) => {
  const insertedParts: number[] = [];
  const scoredParts: number[] = [];
  const snapshots: Array<Record<string, unknown>> = [];
  const banks = [
    { exam_repository_id: 3, exam_name: "Greetings" },
    { exam_repository_id: 8, exam_name: "Presentation" },
  ].map((bank) => ({
    ...bank,
    schedule_time_id: 14,
    subject_id: "EN101",
    subject_name: "English",
    exam_period: "midterm",
    workflow_phase: "midterm_1w",
    due_checkpoint_id: null,
    previous_result_count: 0,
    time_limit: null,
  }));
  const questions = Array.from({ length: 12 }, (_, index) => ({
    question_id: index + 1,
    question_bank_id: index < 6 ? 3 : 8,
    question_text: `Question ${index + 1}`,
    question_image_path: null,
    question_score: 10,
  }));
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql: string, params: unknown[] = []): Promise<[unknown]> => {
      if (sql.includes("AS exam_repository_id")) return [banks];
      if (sql.includes("FROM exam_attempts attempt")) {
        if (sql.includes("INNER JOIN enrollments enrollment") && sql.includes("FOR UPDATE")) {
          return [[{
            exam_attempt_id: 51, enrollment_id: 14, source_checkpoint_id: null,
            started_at: "2026-10-11 08:00:00", elapsed_seconds: 20,
            status: "in_progress", time_limit_minutes: null,
            exam_period: "midterm", workflow_phase: "midterm_1w",
            bank_name: "Greetings",
          }]];
        }
        return [[]];
      }
      if (sql.includes("FROM question\n")) return [questions];
      if (sql.includes("FROM choice\n")) {
        const ids = params[0] as number[];
        return [ids.flatMap((id) => [
          { choice_id: id * 10 + 1, question_id: id, choice_order: 1, choice_text: "Yes", is_correct: 1 },
          { choice_id: id * 10 + 2, question_id: id, choice_order: 2, choice_text: "No", is_correct: 0 },
        ])];
      }
      if (sql.includes("INSERT INTO exam_attempts")) return [{ insertId: 51 }];
      if (sql.includes("SELECT bank_name FROM question_banks")) {
        return [[{ bank_name: Number(params[0]) === 3 ? "Greetings" : "Presentation" }]];
      }
      if (sql.includes("INSERT INTO exam_attempt_bank_results")) {
        scoredParts.push(Number(params[1]));
        return [{}];
      }
      if (sql.includes("INSERT INTO exam_attempt_questions")) {
        insertedParts.push(Number(params[2]));
        snapshots.push({
          attempt_question_id: snapshots.length + 1,
          source_question_id: params[1],
          source_bank_id: params[2],
          display_order: params[3],
          question_text_snapshot: params[4],
          image_path_snapshot: params[5],
          question_score_snapshot: params[6],
          choices_snapshot: params[7],
          selected_choice_order: null,
        });
        return [{}];
      }
      if (sql.includes("FROM exam_attempt_questions") && sql.includes("ORDER BY display_order")) {
        return [snapshots];
      }
      if (sql.includes("FROM exam_attempt_questions") && sql.includes("LIMIT 1 FOR UPDATE")) {
        return [[snapshots.find((question) => Number(question.source_question_id) === Number(params[1]))]];
      }
      if (sql.includes("SELECT started_at FROM exam_attempts")) {
        return [[{ started_at: "2026-10-11 08:00:00" }]];
      }
      if (sql.includes("SELECT cs.subject_id, ea.exam_period")) {
        return [[{ subject_id: "EN101", exam_period: "midterm" }]];
      }
      return [[]];
    },
  };
  t.mock.method(db, "getConnection", async () => connection);
  let status = 200;
  let body: Record<string, unknown> = {};
  const response = {
    status(code: number) { status = code; return this; },
    json(value: Record<string, unknown>) { body = value; return this; },
  } as unknown as Response;
  await startExam(
    { user: { id: 1, role: "user" }, params: { exam_repository_id: "3" } } as unknown as Request,
    response,
  );

  assert.equal(status, 201);
  assert.deepEqual([...new Set(insertedParts)].sort(), [3, 8]);
  const exam = (body.data as { exam: { exam_name: string; parts: Array<{ exam_part_name: string; questions: Array<{ choices: Array<{ is_correct?: boolean }> }> }> } }).exam;
  assert.equal(exam.exam_name, "ชุดทดสอบกลางภาควิชา English");
  assert.deepEqual(exam.parts.map((part) => part.exam_part_name), ["Greetings", "Presentation"]);
  assert.ok(exam.parts.every((part) => part.questions.length > 0));
  assert.equal(exam.parts.reduce((total, part) => total + part.questions.length, 0), 10);
  assert.deepEqual(exam.parts[0].questions[0].choices.map((choice) => choice.is_correct), [undefined, undefined]);

  const otherPartQuestion = snapshots.find((question) => Number(question.source_bank_id) === 8)!;
  status = 200;
  await saveExamAnswer(
    {
      user: { id: 1, role: "user" },
      params: { exam_repository_id: "3", attempt_id: "51" },
      body: {
        question_id: otherPartQuestion.source_question_id,
        choice_id: Number(otherPartQuestion.source_question_id) * 10 + 1,
      },
    } as unknown as Request,
    response,
  );
  assert.equal(status, 200);
  assert.equal(body.message, "Answer saved");

  for (const snapshot of snapshots) snapshot.selected_choice_order = 1;
  status = 200;
  await submitExam(
    {
      user: { id: 1, role: "user" },
      params: { exam_repository_id: "3" },
      body: { exam_attempt_id: 51 },
    } as unknown as Request,
    response,
  );
  assert.equal(status, 200);
  assert.equal(body.actual_score, 100);
  assert.equal(body.exam_max_score, 100);
  assert.deepEqual(scoredParts.sort(), [3, 8]);
});
