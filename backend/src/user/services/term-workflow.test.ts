import test from "node:test";
import assert from "node:assert/strict";
import db from "../../config/db";
import { getExamWorkflowPhase, isWorkloadLockedForUser, voidPendingCheckpointsForExamFlow } from "./term-workflow";

const dates = {
  midterm_start_date: "2026-10-28",
  midterm_end_date: "2026-10-30",
  final_start_date: "2026-12-16",
  final_end_date: "2026-12-18",
};

test("splits midterm preparation into 3, 2, and 1 week phases", () => {
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-10-07T12:00:00")), "midterm_3w");
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-10-14T12:00:00")), "midterm_2w");
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-10-21T12:00:00")), "midterm_1w");
});

test("pauses test flow during exam week and marks post-exam", () => {
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-10-28T12:00:00")), "midterm_exam");
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-10-31T12:00:00")), "midterm_post");
});

test("returns normal checkpoint outside the three-week preparation window", () => {
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-09-23T12:00:00")), "checkpoint");
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-10-06T12:00:00")), "checkpoint");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-11-24T12:00:00")), "checkpoint");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-11-11T12:00:00")), "checkpoint");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-11-25T12:00:00")), "final_3w");
});

test("final exam week is separate from the post-final summary", () => {
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-12-17T12:00:00")), "final_exam");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-12-19T12:00:00")), "final_post");
});

test("pending checkpoints are cancelled when the dedicated exam flow starts", async (t) => {
  let query = "";
  let parameters: unknown[] = [];
  t.mock.method(db, "query", async (sql: string, values: unknown[]) => {
    query = sql;
    parameters = values;
    return [{}];
  });
  await voidPendingCheckpointsForExamFlow(42);
  assert.match(query, /SET checkpoint\.status = 'cancelled'/);
  assert.match(query, /INTERVAL 14 DAY/);
  assert.match(query, /checkpoint\.status = 'pending'/);
  assert.deepEqual(parameters, [42]);
});

test("workload writes remain locked throughout the final exam week", async (t) => {
  let query = "";
  t.mock.method(db, "query", async (sql: string) => {
    query = sql;
    return [[{ locked: 1 }]];
  });
  assert.equal(await isWorkloadLockedForUser(42), true);
  assert.match(query, /DATE\(UTC_TIMESTAMP\(\) \+ INTERVAL 7 HOUR\) >=/);
  assert.match(query, /DATE_SUB\(academic_term\.final_start_date, INTERVAL 7 DAY\)/);
  assert.doesNotMatch(query, /DATEDIFF\(academic_term\.final_start_date, CURDATE\(\)\) BETWEEN 0 AND 7/);
});
