import assert from "node:assert/strict";
import test from "node:test";
import db from "../../config/db";
import { generateWeekendRecommendations } from "./recommendation.engine";
import {
  currentBangkokWeek,
  regularRecommendationPaused,
  shouldRecommendForWorkload,
} from "./recommendation-trigger.rules";
import { getExamWorkflowPhase } from "./term-workflow";

const sundayEvening = new Date("2026-10-11T18:30:00+07:00");

test("urgent workload changes target the current Bangkok week, even after Sunday 18:00", () => {
  assert.deepEqual(currentBangkokWeek(sundayEvening), {
    weekStart: "2026-10-05",
    weekEnd: "2026-10-11",
  });
  assert.equal(shouldRecommendForWorkload("created", "2026-10-11", undefined, sundayEvening), true);
  assert.equal(shouldRecommendForWorkload("created", "2026-10-12", undefined, sundayEvening), false);
});

test("editing a workload recommends only when its due date changes into this week", () => {
  assert.equal(shouldRecommendForWorkload("updated", "2026-10-10", "2026-10-10", sundayEvening), false);
  assert.equal(shouldRecommendForWorkload("updated", "2026-10-10", "2026-10-15", sundayEvening), true);
  assert.equal(shouldRecommendForWorkload("updated", "2026-10-15", "2026-10-10", sundayEvening), false);
});

test("regular recommendations continue throughout the three-week notice", () => {
  assert.equal(regularRecommendationPaused({
    midterm_start_date: "2026-10-26",
    midterm_end_date: "2026-11-01",
    final_start_date: "2026-12-14",
    final_end_date: "2026-12-20",
  }, sundayEvening), false);
  assert.equal(regularRecommendationPaused({
    midterm_start_date: "2026-12-01",
    midterm_end_date: "2026-12-07",
    final_start_date: "2027-01-25",
    final_end_date: "2027-01-31",
  }, sundayEvening), false);
});

test("final three-week window keeps checkpoint and regular recommendations available", () => {
  const now = new Date("2026-10-18T18:30:00+07:00");
  const term = {
    midterm_start_date: "2026-09-07",
    midterm_end_date: "2026-09-11",
    final_start_date: "2026-11-02",
    final_end_date: "2026-11-06",
  };
  assert.equal(getExamWorkflowPhase(term, "final", now), "final_3w");
  assert.equal(regularRecommendationPaused(term, now), false);
});

test("normal weekly recommendations resume after midterm week", () => {
  const now = new Date("2026-10-18T18:30:00+07:00");
  const term = {
    midterm_start_date: "2026-10-05",
    midterm_end_date: "2026-10-09",
    final_start_date: "2026-12-07",
    final_end_date: "2026-12-11",
  };
  assert.equal(getExamWorkflowPhase(term, "midterm", now), "midterm_post");
  assert.equal(regularRecommendationPaused(term, now), false);
});

test("regular recommendations pause only from the two-week assessment round", () => {
  assert.equal(regularRecommendationPaused({
    midterm_start_date: "2026-10-26",
    midterm_end_date: "2026-11-01",
    final_start_date: "2026-12-14",
    final_end_date: "2026-12-20",
  }, new Date("2026-10-18T18:30:00+07:00")), true);
});

test("Sunday scheduler skips a student already in the two-week exam round", async (t) => {
  t.mock.method(db, "query", async () => [[{
    user_id: 1,
    midterm_start_date: "2026-10-26",
    midterm_end_date: "2026-11-01",
    final_start_date: "2026-12-14",
    final_end_date: "2026-12-20",
  }]]);
  const results = await generateWeekendRecommendations(new Date("2026-10-18T18:30:00+07:00"));
  assert.deepEqual(results, []);
});

test("Sunday scheduler plans the next week while today is still in the three-week notice", async (t) => {
  t.mock.method(db, "query", async (sql: string) => {
    if (sql.includes("SELECT wr.recommendation_id")) return [[]];
    return [[{
      user_id: 1,
      midterm_start_date: "2026-10-26",
      midterm_end_date: "2026-11-01",
      final_start_date: "2026-12-14",
      final_end_date: "2026-12-20",
    }]];
  });
  const generated: { userId: number; targetWeekStart?: string }[] = [];
  const results = await generateWeekendRecommendations(sundayEvening, async (input) => {
    generated.push({ userId: input.userId, targetWeekStart: input.targetWeekStart });
    return { recommendation: null, warning: null };
  });
  assert.deepEqual(generated, [{ userId: 1, targetWeekStart: "2026-10-12" }]);
  assert.equal(results.length, 1);
});
