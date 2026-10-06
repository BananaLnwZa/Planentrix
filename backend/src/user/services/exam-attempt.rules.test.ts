import assert from "node:assert/strict";
import test from "node:test";
import {
  checkpointWeeksFor,
  parseSnapshotChoices,
  remainingSecondsFor,
  scoreSnapshotQuestions,
} from "./exam-attempt.rules";

const choices = [
  {
    choice_id: 10,
    choice_order: 1,
    choice_text: "ผิด",
    choice_image_path: null,
    is_correct: false,
  },
  {
    choice_id: 11,
    choice_order: 2,
    choice_text: "ถูก",
    choice_image_path: "answer.png",
    is_correct: true,
  },
];

test("parses choices from MySQL JSON strings", () => {
  assert.deepEqual(parseSnapshotChoices(JSON.stringify(choices)), choices);
});

test("scores answers from immutable snapshots", () => {
  const result = scoreSnapshotQuestions([
    {
      question_score_snapshot: "2.50",
      selected_choice_order: 2,
      choices_snapshot: choices,
    },
    {
      question_score_snapshot: 1,
      selected_choice_order: 1,
      choices_snapshot: choices,
    },
  ]);
  assert.equal(result.actualScore, 2.5);
  assert.equal(result.maximumScore, 3.5);
  assert.equal(result.correctAnswers, 1);
});

test("calculates server-authoritative remaining time", () => {
  assert.equal(remainingSecondsFor(10, 125), 475);
  assert.equal(remainingSecondsFor(1, 61), 0);
});

test("untimed exams never expire, even after a long pause", () => {
  assert.equal(remainingSecondsFor(null, 0), null);
  assert.equal(remainingSecondsFor(null, 86400 * 365), null);
});

test("uses one or two week checkpoint intervals for weak scores", () => {
  assert.equal(checkpointWeeksFor(39.99), 1);
  assert.equal(checkpointWeeksFor(40), 2);
});
