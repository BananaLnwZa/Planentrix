import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import db from "../../config/db";
import type {} from "../../middlewares/verifyToken";
import {
  deleteWorkload,
  finishWorkload,
  saveWorkloadScore,
} from "../controllers/workload.controller";

for (const [operation, handler] of [
  ["delete", deleteWorkload],
  ["finish", finishWorkload],
  ["save score", saveWorkloadScore],
] as const) {
  test(`${operation} does not immediately generate a recommendation`, async (t) => {
    const getConnection = t.mock.method(db, "getConnection", async () => {
      throw new Error("A recommendation should not be generated");
    });
    t.mock.method(db, "query", async (sql: string) => {
      if (sql.includes("AS locked")) return [[{ locked: 0 }]];
      if (sql.includes("AS deadline_date") && sql.includes("FROM workloads workload")) {
        return [[{
          workload_id: 10,
          enrollment_id: 20,
          status: operation === "save score" ? "completed" : "pending",
          deadline_date: "2026-10-11",
        }]];
      }
      if (sql.includes("AS total_max_score")) return [[{ total_max_score: 0 }]];
      return [[]];
    });
    const request = {
      user: { id: 1, role: "user" },
      params: { workload_id: "10" },
      body: { workload_id: 10, actual_score: 5, max_score: 10 },
    } as unknown as Request;
    let status = 200;
    let body: { schedule_recommendation?: unknown; recommendation_warning?: unknown } = {};
    const response = {
      status(code: number) { status = code; return this; },
      json(value: typeof body) { body = value; return this; },
    } as unknown as Response;

    await handler(request, response);

    assert.ok(status < 400);
    assert.equal(body.schedule_recommendation, null);
    assert.equal(body.recommendation_warning, null);
    assert.equal(getConnection.mock.callCount(), 0);
  });
}
