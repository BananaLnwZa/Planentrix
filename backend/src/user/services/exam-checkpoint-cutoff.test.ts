import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import db from "../../config/db";
import { submitExam } from "../controllers/exam.controller";

for (const period of ["midterm", "final"] as const) {
  for (const daysUntilExamWeek of [22, 21, 15]) {
    test(`${period}: checkpoint submitted ${daysUntilExamWeek} days before exam week`, async (t) => {
      let completed = false;
      let inserted = false;
      let scored = false;
      let committed = false;
      let checkedRecommendationBatch = false;
      const connection = {
        beginTransaction: async () => {},
        commit: async () => { committed = true; },
        rollback: async () => {},
        release: () => {},
        query: async (sql: string, params: unknown[] = []): Promise<[unknown]> => {
          if (sql.includes("FROM exam_attempts attempt")) {
            if (!sql.includes("FOR UPDATE")) return [[]];
            return [[{
              exam_attempt_id: 51, enrollment_id: 14, source_checkpoint_id: 9,
              status: "in_progress", elapsed_seconds: 60, time_limit_minutes: null,
              exam_period: period, workflow_phase: "checkpoint", bank_name: "Part 1",
            }]];
          }
          if (sql.includes("FROM exam_attempt_questions")) return [[{
            attempt_question_id: 1, source_bank_id: 3, question_score_snapshot: 100,
            selected_choice_order: 2,
            choices_snapshot: [
              { choice_id: 1, choice_order: 1, choice_text: "Correct", is_correct: true },
              { choice_id: 2, choice_order: 2, choice_text: "Incorrect", is_correct: false },
            ],
          }]];
          if (sql.includes("SELECT bank_name")) return [[{ bank_name: "Part 1" }]];
          if (sql.includes("INSERT INTO exam_attempt_bank_results")) scored = true;
          if (sql.includes("UPDATE exam_checkpoints")) {
            assert.match(sql, /status = 'completed'/);
            assert.deepEqual(params, [9]);
            completed = true;
          }
          if (sql.includes("END AS allowed")) {
            assert.deepEqual(params, [period, 14]);
            // Both periods use the same inclusive 3-week stop boundary,
            // anchored to Monday rather than an individual exam date.
            const cutoffs = [...sql.matchAll(/INTERVAL (\d+) DAY\)/g)].map(match => Number(match[1]));
            assert.deepEqual(cutoffs, [21, 21]);
            assert.match(sql, /WEEKDAY\(academic_term\.midterm_start_date\)/);
            assert.match(sql, /WEEKDAY\(academic_term\.final_start_date\)/);
            return [[{ allowed: daysUntilExamWeek > cutoffs[period === "midterm" ? 0 : 1] ? 1 : 0 }]];
          }
          if (sql.includes("INSERT INTO exam_checkpoints")) inserted = true;
          if (sql.includes("SELECT cs.subject_id")) return [[{ subject_id: "TEST101", exam_period: period }]];
          return [[]];
        },
      };
      t.mock.method(db, "getConnection", async () => connection);
      t.mock.method(db, "query", async () => {
        checkedRecommendationBatch = true;
        // Another subject is still outstanding: retain normal batch waiting.
        return [[{ workflow_phase: "checkpoint" }]];
      });
      let status = 200;
      let body: Record<string, unknown> = {};
      const response = {
        status(code: number) { status = code; return this; },
        json(value: Record<string, unknown>) { body = value; return this; },
      } as unknown as Response;
      await submitExam({
        user: { id: 1, role: "user" },
        params: { exam_repository_id: "3" }, body: { exam_attempt_id: 51 },
      } as unknown as Request, response);
      assert.equal(status, 200);
      assert.equal(body.actual_score, 0);
      assert.equal(body.weak_topic_count, 1);
      assert(completed && scored && committed && checkedRecommendationBatch);
      assert.equal(inserted, daysUntilExamWeek > 21);
      assert.equal(body.checkpoint_interval_weeks, inserted ? 1 : 0);
      assert.equal(body.next_checkpoint_at === null, !inserted);
    });
  }
}
