import test from "node:test";
import assert from "node:assert/strict";
import {
  durationMinutes,
  examProximityMinutes,
  resolveTargetWeek,
  scoreGapMinutes,
  targetScoreFromGpa,
  weakTopicMinutes,
  workloadUrgency,
} from "./recommendation.rules";
import { buildSchedulePlan, validateNoOverlaps } from "./recommendation.scheduler";
import type {
  ClassBlockRow,
  ConstraintRow,
  RecommendationItemDraft,
} from "./recommendation.types";

test("maps GPA goals to minimum scores", () => {
  assert.equal(targetScoreFromGpa(4), 80);
  assert.equal(targetScoreFromGpa(3.5), 75);
  assert.equal(targetScoreFromGpa(2), 60);
  assert.equal(targetScoreFromGpa(1), 50);
  assert.equal(targetScoreFromGpa(null), null);
});

test("calculates score-gap and weak-topic rule minutes", () => {
  assert.equal(scoreGapMinutes(4), 0);
  assert.equal(scoreGapMinutes(5), 30);
  assert.equal(scoreGapMinutes(10), 60);
  assert.equal(scoreGapMinutes(20), 90);
  assert.equal(weakTopicMinutes(7), 180);
});

test("calculates exam proximity from the target week", () => {
  assert.equal(
    examProximityMinutes("2026-08-24", "2026-08-30", [
      { start: "2026-08-31", end: "2026-09-04" },
    ]),
    90
  );
  assert.equal(
    examProximityMinutes("2026-08-24", "2026-08-30", [
      { start: "2026-09-04", end: "2026-09-06" },
    ]),
    60
  );
});

test("uses the agreed homework deadline increments", () => {
  assert.deepEqual(workloadUrgency("2026-08-24", "2026-08-31"), {
    minutes: 30,
    priority: 4,
    urgency: "within_3_7_days",
  });
  assert.deepEqual(workloadUrgency("2026-08-24", "2026-08-26"), {
    minutes: 60,
    priority: 2,
    urgency: "within_2_days",
  });
});

test("Sunday 18:00 Bangkok generates the following week", () => {
  const result = resolveTargetWeek(
    "manual",
    new Date("2026-08-23T11:00:00.000Z")
  );
  assert.deepEqual(result, {
    weekStart: "2026-08-24",
    weekEnd: "2026-08-30",
  });
});

const makeReviewItem = (targetMinutes: number): RecommendationItemDraft => ({
  key: "CS101:2",
  subjectId: "CS101",
  subjectName: "Computer Science",
  scheduleTypeId: 2,
  currentMinutes: 0,
  baseMinutes: targetMinutes,
  scoreGapMinutes: 0,
  weakTopicMinutes: 0,
  examProximityMinutes: 0,
  quizFloorMinutes: 0,
  workloadMinutes: 0,
  deadlineMinutes: 0,
  rawTargetMinutes: targetMinutes,
  maxTargetMinutes: 300,
  targetMinutes,
  allocatedMinutes: 0,
  unallocatedMinutes: 0,
  differenceMinutes: 0,
  capApplied: false,
  capacityLimited: false,
  primaryAction: "keep",
  reasons: [],
  workloadDemands: [],
  placementDeadline: null,
  placementPriority: 9,
});

test("scheduler respects class conflicts and produces non-overlapping blocks", () => {
  const item = makeReviewItem(60);
  const result = buildSchedulePlan({
    items: [item],
    baseBlocks: [],
    classBlocks: [
      { schedule_day: 1, start_time: "09:00:00", end_time: "10:00:00" },
    ] as unknown as ClassBlockRow[],
    busyBlocks: [],
    constraint: {
      constraint_id: 1,
      day_off: null,
      continuous_working_duration: 120,
      break_minutes: 30,
      start_time: "08:00:00",
      end_time: "12:00:00",
    } as unknown as ConstraintRow,
    weekStart: "2026-08-24",
    weekEnd: "2026-08-30",
    userId: 1,
    termId: 1,
    now: new Date("2026-08-23T00:00:00.000Z"),
    previousAcceptedRecommendationId: null,
  });
  assert.equal(result.items[0].allocatedMinutes, 60);
  assert.equal(validateNoOverlaps(result.blocks), true);
  assert.equal(
    result.blocks.some(
      (block) =>
        block.scheduledDate === "2026-08-24" &&
        block.startTime < "10:00:00" &&
        block.endTime > "09:00:00"
    ),
    false
  );
});

test("scheduler keeps equal-priority 30-minute units together by subject", () => {
  const first = makeReviewItem(60);
  const second = {
    ...makeReviewItem(60),
    key: "CS102:2",
    subjectId: "CS102",
    subjectName: "Data Structures",
  };
  const result = buildSchedulePlan({
    items: [first, second],
    baseBlocks: [],
    classBlocks: [],
    busyBlocks: [],
    constraint: {
      constraint_id: 1,
      day_off: null,
      continuous_working_duration: 120,
      break_minutes: 30,
      start_time: "08:00:00",
      end_time: "12:00:00",
    } as unknown as ConstraintRow,
    weekStart: "2026-08-24",
    weekEnd: "2026-08-30",
    userId: 1,
    termId: 1,
    now: new Date("2026-08-23T00:00:00.000Z"),
    previousAcceptedRecommendationId: null,
  });

  assert.equal(result.blocks.length, 2);
  assert.deepEqual(
    result.blocks.map((block) => [
      block.subjectId,
      durationMinutes(block.startTime, block.endTime),
    ]),
    [
      ["CS101", 60],
      ["CS102", 60],
    ],
  );
  assert.equal(validateNoOverlaps(result.blocks), true);
});

test("scheduler reports unallocated time when capacity is insufficient", () => {
  const item = makeReviewItem(600);
  const result = buildSchedulePlan({
    items: [item],
    baseBlocks: [],
    classBlocks: [],
    busyBlocks: [],
    constraint: {
      constraint_id: 1,
      day_off: 2,
      continuous_working_duration: 60,
      break_minutes: 30,
      start_time: "08:00:00",
      end_time: "09:00:00",
    } as unknown as ConstraintRow,
    weekStart: "2026-08-24",
    weekEnd: "2026-08-30",
    userId: 1,
    termId: 1,
    now: new Date("2026-08-23T00:00:00.000Z"),
    previousAcceptedRecommendationId: null,
  });
  assert.equal(result.items[0].allocatedMinutes, 360);
  assert.equal(result.items[0].unallocatedMinutes, 240);
  assert.equal(result.items[0].capacityLimited, true);
});
