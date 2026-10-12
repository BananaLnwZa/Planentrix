import assert from "node:assert/strict";
import test from "node:test";
import db from "../../config/db";
import { getAcceptedWeeklySchedule } from "./recommendation.engine";

for (const currentWeekAccepted of [false, true]) {
  test(`weekly schedule ${currentWeekAccepted ? "uses this week's accepted plan" : "carries forward the last accepted plan"}`, async (t) => {
    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    const sourceWeek = currentWeekAccepted ? "2026-08-17" : "2026-08-10";
    const recommendationId = currentWeekAccepted ? 45 : 44;
    const connection = {
      release() {},
      query: async (sql: string, params?: unknown[]) => {
        queries.push({ sql, params });
        if (sql.includes("FROM student_terms st") && sql.includes("st.status='active'")) {
          return [[{ term_id: 6 }]];
        }
        if (sql.includes("FROM weekly_recommendation") && sql.includes("week_start_date=?")) {
          return [currentWeekAccepted ? [{ recommendation_id: 45 }] : []];
        }
        if (sql.includes("FROM weekly_recommendation") && sql.includes("week_start_date<?")) {
          return [[{ recommendation_id: 44, week_start: "2026-08-10" }]];
        }
        if (sql.includes("FROM class_meetings cm")) return [[]];
        if (sql.includes("FROM weekly_recommendation wr")) {
          assert.deepEqual(params, [recommendationId, 6]);
          return [[{
            recommendation_id: recommendationId,
            term_id: 6,
            status: "accepted",
            week_start: sourceWeek,
            week_end: currentWeekAccepted ? "2026-08-23" : "2026-08-16",
          }]];
        }
        if (sql.includes("FROM weekly_recommendation_item i")) return [[]];
        if (sql.includes("FROM weekly_schedule_block b")) return [[
          { weekly_block_id: 1, scheduled_date: currentWeekAccepted ? "2026-08-18" : "2026-08-11", source: "generated" },
          { weekly_block_id: 2, scheduled_date: currentWeekAccepted ? "2026-08-23" : "2026-08-16", source: "generated" },
        ]];
        throw new Error(`Unexpected query: ${sql}`);
      },
    };
    t.mock.method(db, "getConnection", async () => connection);

    const result = await getAcceptedWeeklySchedule(6, "2026-08-17");
    assert.equal(result.week_start, "2026-08-17");
    assert.equal(result.accepted_recommendation?.week_start, sourceWeek);
    assert.deepEqual(result.weekly_blocks.map((block) => block.scheduled_date), [
      "2026-08-18", "2026-08-23",
    ]);
    assert.deepEqual(result.weekly_blocks.map((block) => block.source), [
      currentWeekAccepted ? "generated" : "copied_previous",
      currentWeekAccepted ? "generated" : "copied_previous",
    ]);
    assert.equal(queries.some(({ sql }) => /\b(INSERT|UPDATE|DELETE)\b/i.test(sql)), false);
    assert.equal(queries.some(({ sql }) => sql.includes("week_start_date<?")), !currentWeekAccepted);
  });
}
