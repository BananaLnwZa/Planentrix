import assert from "node:assert/strict";
import test from "node:test";
import { selectBalancedExamQuestions } from "../../services/exam-selection";

const exactQuestions = [
  { question_id: 1, question_score: 5 },
  { question_id: 2, question_score: 5 },
  { question_id: 3, question_score: 5 },
  { question_id: 4, question_score: 10 },
  { question_id: 5, question_score: 10 },
  { question_id: 6, question_score: 10 },
  { question_id: 7, question_score: 18.33 },
  { question_id: 8, question_score: 18.33 },
  { question_id: 9, question_score: 18.34 },
];

test("selects a balanced exam worth exactly 100 points", () => {
  const result = selectBalancedExamQuestions(exactQuestions, 9, "attempt-a");
  assert.ok(result);
  assert.equal(result.questions.length, 9);
  assert.equal(result.totalScore, 100);
  assert.deepEqual(result.distribution, { easy: 3, medium: 3, hard: 3 });
  assert.equal(
    result.questions.reduce(
      (total, question) => total + Number(question.question_score),
      0,
    ).toFixed(2),
    "100.00",
  );
});

test("replays the same selection order with the same seed", () => {
  const first = selectBalancedExamQuestions(exactQuestions, 9, "repeatable");
  const second = selectBalancedExamQuestions(exactQuestions, 9, "repeatable");
  assert.ok(first);
  assert.ok(second);
  assert.deepEqual(
    first.questions.map((question) => question.question_id),
    second.questions.map((question) => question.question_id),
  );
});

test("keeps the same near-equal difficulty counts for every seed", () => {
  const questions = [
    { question_id: 1, question_score: 5 },
    { question_id: 2, question_score: 10 },
    { question_id: 3, question_score: 20 },
    { question_id: 4, question_score: 30 },
    { question_id: 5, question_score: 40 },
    { question_id: 6, question_score: 50 },
    { question_id: 7, question_score: 55 },
  ];
  const first = selectBalancedExamQuestions(questions, 4, "student-a");
  const second = selectBalancedExamQuestions(questions, 4, "student-b");
  assert.ok(first);
  assert.ok(second);
  assert.deepEqual(first.distribution, { easy: 2, medium: 1, hard: 1 });
  assert.deepEqual(second.distribution, first.distribution);
  assert.equal(
    second.questions.reduce(
      (total, question) => total + Number(question.question_score),
      0,
    ),
    100,
  );
});

test("rejects a bank that cannot produce an exact 100 point exam", () => {
  const result = selectBalancedExamQuestions(
    [
      { question_id: 1, question_score: 10 },
      { question_id: 2, question_score: 20 },
      { question_id: 3, question_score: 30 },
    ],
    3,
    "impossible",
  );
  assert.equal(result, null);
});
