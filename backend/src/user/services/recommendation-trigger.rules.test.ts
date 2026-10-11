import assert from "node:assert/strict";
import test from "node:test";
import db from "../../config/db";
import { generateWeekendRecommendations } from "./recommendation.engine";
import {
  currentBangkokWeek,
  regularRecommendationPaused,
  shouldRecommendForWorkload,
} from "./recommendation-trigger.rules";

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

test("Sunday planning does not preempt the next week's two-week exam round", () => {
  assert.equal(regularRecommendationPaused({
    midterm_start_date: "2026-10-26",
    midterm_end_date: "2026-11-01",
    final_start_date: "2026-12-14",
    final_end_date: "2026-12-20",
  }, sundayEvening, "2026-10-12"), true);
  assert.equal(regularRecommendationPaused({
    midterm_start_date: "2026-12-01",
    midterm_end_date: "2026-12-07",
    final_start_date: "2027-01-25",
    final_end_date: "2027-01-31",
  }, sundayEvening, "2026-10-12"), false);
});

test("Sunday scheduler skips a student whose next week is an exam-preparation round", async (t) => {
  t.mock.method(db, "query", async () => [[{
    user_id: 1,
    midterm_start_date: "2026-10-26",
    midterm_end_date: "2026-11-01",
    final_start_date: "2026-12-14",
    final_end_date: "2026-12-20",
  }]]);
  const results = await generateWeekendRecommendations(sundayEvening);
  assert.deepEqual(results, []);
});
