import assert from "node:assert/strict";
import test from "node:test";
import db from "../../config/db";
import { getRecommendationById } from "./recommendation.engine";

for (const phase of ["midterm_2w", "final_2w", "checkpoint", null]) {
  test(`recommendation exposes source exam phase ${phase} even when unchanged`, async (t) => {
    const connection = {
      release() {},
      query: async (sql: string, parameters: unknown[]) => {
        if (sql.includes("FROM weekly_recommendation wr")) {
          assert.match(sql, /source_attempt\.workflow_phase AS exam_workflow_phase/);
          assert.match(sql, /LEFT JOIN exam_attempts source_attempt ON source_attempt\.exam_attempt_id=wr\.source_exam_attempt_id/);
          assert.deepEqual(parameters, [44, 6]);
          return [[{ recommendation_id: 44, term_id: 6, status: 'pending', exam_workflow_phase: phase }]];
        }
        if (sql.includes("FROM weekly_recommendation_item i")) return [[{
          recommendation_item_id: 1, primary_action: 'keep', difference_minutes: 0,
          previous_adherence_rate: null, changes_json: '[]', reasons_json: '[]',
        }]];
        return [[]];
      },
    };
    t.mock.method(db, "getConnection", async () => connection);
    const recommendation = await getRecommendationById(6, 44);
    assert.equal(recommendation.exam_workflow_phase, phase);
    assert.equal(recommendation.items.length, 1);
    const item = recommendation.items[0] as Record<string, unknown>;
    assert.equal(item.primary_action, 'keep');
    assert.equal(item.difference_minutes, 0);
  });
}
