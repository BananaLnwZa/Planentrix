import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import db from "../../config/db";
import {
  getExamsForCurrentTerm,
  hasOutstandingAssessments,
  recommendationAfterAssessmentBatch,
} from "../controllers/exam.controller";

test("available exams switch from midterm to final only after midterm week", async (t) => {
  let sql = "";
  t.mock.method(db, "query", async (statement: string) => {
    sql = statement;
    return [[]];
  });
  let status = 200;
  const response = {
    status(code: number) { status = code; return this; },
    json() { return this; },
  } as unknown as Response;
  await getExamsForCurrentTerm(
    { user: { id: 1, role: "user" } } as unknown as Request,
    response,
  );

  assert.equal(status, 200);
  assert.match(sql, /qb\.exam_period = 'midterm' AND CURDATE\(\) < academic_term\.midterm_start_date/);
  assert.match(sql, /qb\.exam_period = 'final'/);
  assert.match(sql, /CURDATE\(\) > academic_term\.midterm_end_date/);
  assert.match(sql, /CURDATE\(\) < academic_term\.final_start_date/);
});

test("published parts for one subject and period appear as one exam set", async (t) => {
  t.mock.method(db, "query", async () => [[
    {
      exam_repository_id: 4, schedule_time_id: 9, subject_id: "EN101",
      subject_name: "English", exam_name: "Greetings", exam_period: "midterm",
      workflow_phase: "checkpoint", due_checkpoint_id: null,
    },
    {
      exam_repository_id: 7, schedule_time_id: 9, subject_id: "EN101",
      subject_name: "English", exam_name: "Presentation", exam_period: "midterm",
      workflow_phase: "checkpoint", due_checkpoint_id: null,
    },
  ]]);
  let body: { total?: number; data?: Array<Record<string, unknown>> } = {};
  const response = {
    json(value: typeof body) { body = value; return this; },
  } as unknown as Response;
  await getExamsForCurrentTerm(
    { user: { id: 1, role: "user" } } as unknown as Request,
    response,
  );

  assert.equal(body.total, 1);
  assert.equal(body.data?.[0].exam_name, "ชุดทดสอบกลางภาควิชา English");
  assert.deepEqual(body.data?.[0].part_names, ["Greetings", "Presentation"]);
  assert.deepEqual(body.data?.[0].part_ids, [4, 7]);
});

test("assessment batch waits for every available exam in the same phase", async (t) => {
  t.mock.method(db, "query", async (sql: string) => {
    assert.match(sql, /NOT EXISTS \(/);
    return [[{ workflow_phase: "checkpoint" }]];
  });

  assert.equal(await hasOutstandingAssessments(1, "checkpoint"), true);
  assert.equal(await hasOutstandingAssessments(1, "final_2w"), false);
});

test("one assessment recommendation follows the last exam, not the first", async (t) => {
  let remaining = [{ workflow_phase: "final_2w" }];
  t.mock.method(db, "query", async () => [remaining]);
  let generated = 0;
  const generate = async () => {
    generated += 1;
    return { recommendation: null, warning: null };
  };

  await recommendationAfterAssessmentBatch(1, "final_2w", 10, generate);
  assert.equal(generated, 0);

  remaining = [];
  await recommendationAfterAssessmentBatch(1, "final_2w", 11, generate);
  assert.equal(generated, 1);

  await recommendationAfterAssessmentBatch(1, "final_1w", 12, generate);
  assert.equal(generated, 1);
});
