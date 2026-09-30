import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWeightedGradeSummary,
  gradeFromPublishedBoundaries,
  percentageFromScore,
  type PublishedGradeBoundary,
} from "./grade-calculation";

const customBoundaries: PublishedGradeBoundary[] = [
  { grade_code: "A", minimum_percentage: 85, display_order: 1 },
  { grade_code: "B+", minimum_percentage: 78, display_order: 2 },
  { grade_code: "B", minimum_percentage: 70, display_order: 3 },
  { grade_code: "C+", minimum_percentage: 65, display_order: 4 },
  { grade_code: "C", minimum_percentage: 60, display_order: 5 },
  { grade_code: "D+", minimum_percentage: 55, display_order: 6 },
  { grade_code: "D", minimum_percentage: 50, display_order: 7 },
  { grade_code: "F", minimum_percentage: 0, display_order: 8 },
];

test("calculates percentage from actual and maximum scores", () => {
  assert.equal(percentageFromScore(42, 50), 84);
  assert.equal(percentageFromScore(0, 0), null);
});

test("uses the instructor-published boundary instead of A equals 80", () => {
  assert.equal(
    gradeFromPublishedBoundaries(82, customBoundaries)?.grade_code,
    "B+",
  );
  assert.equal(
    gradeFromPublishedBoundaries(85, customBoundaries)?.grade_code,
    "A",
  );
});

test("excludes subjects without a published scheme from actual GPA", () => {
  const result = calculateWeightedGradeSummary([
    {
      credits: 3,
      actualScore: 82,
      maximumScore: 100,
      boundaries: customBoundaries,
    },
    {
      credits: 3,
      actualScore: 100,
      maximumScore: 100,
      boundaries: [],
    },
  ]);

  assert.equal(result.gpa, 3.5);
  assert.equal(result.grade, "B+");
  assert.equal(result.gradedSubjectCount, 1);
  assert.equal(result.pendingGradingSchemeCount, 1);
});
