import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import db from "../../config/db";
import type {} from "../../middlewares/verifyToken";
import { getTermWorkflow } from "../controllers/terms.controller";

const dateOffset = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

for (const [available, completed, recommended, expected] of [
  [2, 2, 1, true],
  [2, 1, 1, false],
  [2, 2, 0, false],
  [0, 0, 1, false],
] as const) {
  test(`final target ready: ${available} banks, ${completed} completed, recommendation ${recommended}`, async (t) => {
    let targetQuery = "";
    t.mock.method(db, "query", async (sql: string) => {
      if (sql.includes("qb.question_bank_id AS exam_repository_id")) {
        return [[]];
      }
      if (sql.includes("AS available_banks")) {
        targetQuery = sql;
        return [[{
          available_banks: available,
          completed_banks: completed,
          has_recommendation: recommended,
        }]];
      }
      if (sql.includes("midterm_followup_notified_at IS NULL")) {
        return [[{ pending: 0 }]];
      }
      return [[{
        term_id: 7,
        midterm_start_date: dateOffset(-42),
        midterm_end_date: dateOffset(-35),
        final_start_date: dateOffset(10),
        final_end_date: dateOffset(16),
      }]];
    });
    let body: { data?: { final_target_ready: boolean; final_phase: string } } = {};
    const request = { user: { id: 4, role: "user" } } as unknown as Request;
    const response = {
      status() { return this; },
      json(value: typeof body) { body = value; return this; },
    } as unknown as Response;

    await getTermWorkflow(request, response);

    assert.equal(body.data?.final_phase, "final_2w");
    assert.equal(body.data?.final_target_ready, expected);
    assert.match(targetQuery, /attempt\.workflow_phase = 'final_2w'/);
    assert.match(targetQuery, /recommendation\.source_exam_attempt_id/);
    assert.match(targetQuery, /recommendation\.generated_at >=/);
    assert.match(targetQuery, /bank\.status = 'published'/);
  });
}
