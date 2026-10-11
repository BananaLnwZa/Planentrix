import test from "node:test";
import assert from "node:assert/strict";
import { getExamWorkflowPhase } from "./term-workflow";

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
  assert.equal(getExamWorkflowPhase(dates, "final", new Date("2026-11-24T12:00:00")), "checkpoint");
});
