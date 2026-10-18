import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import db from "../../config/db";
import type {} from "../../middlewares/verifyToken";
import { getTermWorkflow } from "../controllers/terms.controller";
import { addDays, bangkokDateTimeParts, mondayOfWeek } from "./recommendation.rules";

const currentMonday = mondayOfWeek(bangkokDateTimeParts(new Date()).date);

for (const phase of ["midterm_2w", "midterm_1w", "final_2w", "final_1w"] as const) {
  for (const pending of [true, false]) {
    test(`${phase} reports assessment pending ${pending}`, async (t) => {
      const isMidterm = phase.startsWith("midterm");
      const weeksUntilExam = phase.endsWith("2w") ? 2 : 1;
      const examStart = addDays(currentMonday, weeksUntilExam * 7);
      const term = {
        term_id: 7,
        midterm_start_date: isMidterm ? examStart : addDays(currentMonday, -35),
        midterm_end_date: isMidterm ? addDays(examStart, 4) : addDays(currentMonday, -31),
        final_start_date: isMidterm ? addDays(currentMonday, 70) : examStart,
        final_end_date: isMidterm ? addDays(currentMonday, 74) : addDays(examStart, 4),
      };
      t.mock.method(db, "query", async (sql: string) => {
        if (sql.includes("qb.question_bank_id AS exam_repository_id")) {
          return [pending ? [{
            exam_repository_id: 1,
            schedule_time_id: 2,
            subject_id: "SUB101",
            subject_name: "Subject",
            exam_name: "Part 1",
            exam_period: isMidterm ? "midterm" : "final",
            workflow_phase: phase,
          }] : []];
        }
        if (sql.includes("AS available_banks")) {
          return [[{ available_banks: 1, completed_banks: 0, has_recommendation: 0 }]];
        }
        if (sql.includes("midterm_followup_notified_at IS NULL")) {
          return [[{ pending: 0 }]];
        }
        return [[term]];
      });

      let body: { data?: { phase: string; assessment_pending: boolean } } = {};
      const request = { user: { id: 4, role: "user" } } as unknown as Request;
      const response = {
        status() { return this; },
        json(value: typeof body) { body = value; return this; },
      } as unknown as Response;

      await getTermWorkflow(request, response);

      assert.equal(body.data?.phase, phase);
      assert.equal(body.data?.assessment_pending, pending);
    });
  }
}
