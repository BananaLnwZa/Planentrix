import assert from "node:assert/strict";
import test from "node:test";
import db from "../../config/db";
import {
  addPreviewBlock,
  RecommendationServiceError,
  updatePreviewBlock,
} from "./recommendation.engine";

const input = {
  subject_id: "BI101",
  schedule_type_code: "review",
  scheduled_date: "2026-10-15",
  start_time: "09:30",
  end_time: "10:30",
};

for (const conflictType of ["block", "class"] as const) {
  test(`rejects a preview edit overlapping another ${conflictType}`, async (t) => {
    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    let rolledBack = false;
    const connection = {
      beginTransaction: async () => {},
      commit: async () => { throw new Error("Conflicting edit must not commit"); },
      rollback: async () => { rolledBack = true; },
      release: () => {},
      query: async (sql: string, params?: unknown[]) => {
        queries.push({ sql, params });
        if (sql.includes("FROM weekly_recommendation wr")) {
          return [[{ term_id: 3, week_start: "2026-10-12", week_end: "2026-10-18", status: "pending" }]];
        }
        if (sql.includes("FROM schedule_types")) {
          return [[
            { schedule_type_id: 2, type_code: "review" },
            { schedule_type_id: 3, type_code: "homework" },
          ]];
        }
        if (sql.includes("SELECT e.enrollment_id FROM enrollments e")) {
          return [[{ enrollment_id: 8 }]];
        }
        if (sql.includes("SELECT weekly_block_id FROM weekly_schedule_block")) {
          return [conflictType === "block" ? [{ weekly_block_id: 9 }] : []];
        }
        if (sql.includes("SELECT cm.class_meeting_id FROM class_meetings")) {
          return [conflictType === "class" ? [{ class_meeting_id: 4 }] : []];
        }
        return [[]];
      },
    };
    t.mock.method(db, "getConnection", async () => connection);

    await assert.rejects(
      addPreviewBlock(4, 7, input),
      (error: unknown) => error instanceof RecommendationServiceError &&
        error.code === "BLOCK_TIME_OVERLAP"
    );
    assert.equal(rolledBack, true);
    assert.equal(queries.some(({ sql }) => sql.includes("INSERT INTO weekly_schedule_block")), false);
    if (conflictType === "class") {
      assert.ok(queries.some(({ sql, params }) =>
        sql.includes("COALESCE(o.override_day_of_week,cm.day_of_week)") &&
        params?.[1] === "thursday"));
    }
  });
}

test("updating a block excludes itself from overlap checks", async (t) => {
  let checkedExclusion: unknown;
  const connection = {
    beginTransaction: async () => {},
    commit: async () => { throw new Error("Conflicting edit must not commit"); },
    rollback: async () => {},
    release: () => {},
    query: async (sql: string, params?: unknown[]) => {
      if (sql.includes("FROM weekly_recommendation wr")) {
        return [[{ term_id: 3, week_start: "2026-10-12", week_end: "2026-10-18", status: "pending" }]];
      }
      if (sql.includes("SELECT weekly_block_id FROM weekly_schedule_block") &&
          sql.includes("weekly_block_id=?")) {
        return [[{ weekly_block_id: 5 }]];
      }
      if (sql.includes("SELECT weekly_block_id FROM weekly_schedule_block")) {
        checkedExclusion = params?.[2];
        return [[]];
      }
      if (sql.includes("SELECT cm.class_meeting_id FROM class_meetings")) {
        return [[{ class_meeting_id: 4 }]];
      }
      return [[]];
    },
  };
  t.mock.method(db, "getConnection", async () => connection);

  await assert.rejects(
    updatePreviewBlock(4, 7, 5, input),
    (error: unknown) => error instanceof RecommendationServiceError &&
      error.code === "BLOCK_TIME_OVERLAP"
  );
  assert.equal(checkedExclusion, 5);
});

test("accepted recommendation blocks cannot be edited", async (t) => {
  const queries: string[] = [];
  const connection = {
    beginTransaction: async () => {},
    commit: async () => { throw new Error("Accepted block edit must not commit"); },
    rollback: async () => {},
    release: () => {},
    query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes("FROM weekly_recommendation wr")) {
        return [[{ term_id: 3, week_start: "2026-10-12", week_end: "2026-10-18", status: "accepted" }]];
      }
      return [[]];
    },
  };
  t.mock.method(db, "getConnection", async () => connection);

  await assert.rejects(
    updatePreviewBlock(4, 7, 5, input),
    (error: unknown) => error instanceof RecommendationServiceError &&
      error.code === "RECOMMENDATION_NOT_EDITABLE"
  );
  assert.equal(queries.some((sql) => sql.includes("UPDATE weekly_schedule_block")), false);
});
