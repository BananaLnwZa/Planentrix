import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import db from "../../config/db";
import { saveExamAnswer, startExam, submitExpiredExamAttempts } from "../controllers/exam.controller";

const question = {
  attempt_question_id: 10,
  source_question_id: 20,
  source_bank_id: 1,
  display_order: 1,
  question_text_snapshot: "Question",
  question_score_snapshot: 100,
  image_path_snapshot: null,
  selected_choice_order: null,
  choices_snapshot: [{ choice_id: 30, choice_order: 1, choice_text: "Answer", is_correct: true }],
};

test("untimed attempts resume and save answers without the removed database column", async (t) => {
  const queries: string[] = [];
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql: string) => {
      queries.push(sql);
      assert.doesNotMatch(sql, /\b(?:qb|bank)\.time_limit_minutes/);
      if (sql.includes("AS exam_repository_id")) {
        return [[{ exam_repository_id: 1, schedule_time_id: 2, exam_period: "midterm", time_limit: null }]];
      }
      if (sql.includes("AS elapsed_seconds")) {
        return [[{
          exam_attempt_id: 3, enrollment_id: 2, started_at: "2020-01-01",
          elapsed_seconds: 86400 * 365, status: "in_progress", time_limit_minutes: null,
        }]];
      }
      if (sql.includes("FROM exam_attempt_questions")) return [[question]];
      return [[]];
    },
  };
  t.mock.method(db, "getConnection", async () => connection);
  const request = {
    user: { id: 4, role: "user" },
    params: { exam_repository_id: "1", attempt_id: "3" },
    body: { question_id: 20, choice_id: 30 },
  } as unknown as Request;
  let status = 200;
  type ResponseBody = {
    message?: string;
    data?: { resumed: boolean; remaining_seconds: number | null; exam: { time_limit: number | null } };
  };
  let body: ResponseBody = {};
  const response = {
    status(code: number) { status = code; return this; },
    json(value: ResponseBody) { body = value; return this; },
  } as unknown as Response;

  await startExam(request, response);
  assert.equal(status, 200);
  assert.equal(body.data?.resumed, true);
  assert.equal(body.data?.remaining_seconds, null);
  assert.equal(body.data?.exam.time_limit, null);

  await saveExamAnswer(request, response);
  assert.equal(status, 200);
  assert.equal(body.message, "Answer saved");
  assert.ok(queries.some((sql) => sql.includes("SET selected_choice_order = ?")));
  assert.ok(queries.every((sql) => !sql.includes("UPDATE exam_attempts")));
});

test("disabled expiry job does not query or submit any attempts", async (t) => {
  const query = t.mock.method(db, "query", async () => {
    throw new Error("Disabled expiry job must not query the database");
  });
  assert.equal(await submitExpiredExamAttempts(), 0);
  assert.equal(query.mock.callCount(), 0);
});
