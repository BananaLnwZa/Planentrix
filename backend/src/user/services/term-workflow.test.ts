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
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-11-01T12:00:00")), "midterm_exam");
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-11-02T12:00:00")), "midterm_post");
});

test("returns normal checkpoint outside the three-week preparation window", () => {
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-09-23T12:00:00")), "checkpoint");
  assert.equal(getExamWorkflowPhase(dates, "midterm", new Date("2026-10-04T12:00:00")), "checkpoint");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-11-22T12:00:00")), "checkpoint");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-11-11T12:00:00")), "checkpoint");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-11-25T12:00:00")), "final_3w");
});

test("final exam week is separate from the post-final summary", () => {
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-12-17T12:00:00")), "final_exam");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-12-20T12:00:00")), "final_exam");
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-12-21T12:00:00")), "final_post");
  assert.equal(getExamWorkflowPhase({
    ...dates,
    final_start_date: "2026-10-12",
    final_end_date: "2026-10-16",
  }, "final", new Date("2026-10-18T12:00:00")), "final_exam");
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
  assert.match(query, /source_attempt\.exam_attempt_id = checkpoint\.source_exam_attempt_id/);
  assert.match(query, /source_attempt\.status = 'submitted'/);
  assert.match(query, /source_attempt\.workflow_phase = 'checkpoint'/);
  assert.match(query, /DATE\(source_attempt\.submitted_at\) >= DATE_SUB/);
  assert.match(query, /DATE\(source_attempt\.submitted_at\) <= DATE\(UTC_TIMESTAMP\(\) \+ INTERVAL 7 HOUR\)/);
  assert.match(query, /INTERVAL 21 DAY/);
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
  assert.match(query, /WEEKDAY\(academic_term\.final_start_date\)/);
  assert.match(query, /INTERVAL 7 DAY/);
  assert.doesNotMatch(query, /DATEDIFF\(academic_term\.final_start_date, CURDATE\(\)\) BETWEEN 0 AND 7/);
});
