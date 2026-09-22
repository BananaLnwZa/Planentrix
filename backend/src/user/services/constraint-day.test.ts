import assert from "node:assert/strict";
import test from "node:test";
import {
  constraintDayToDatabase,
  constraintDayToNumber,
} from "./constraint-day";

test("maps API day numbers to database enum values", () => {
  assert.equal(constraintDayToDatabase(1), "monday");
  assert.equal(constraintDayToDatabase(7), "sunday");
  assert.equal(constraintDayToDatabase(0), null);
  assert.equal(constraintDayToDatabase(null), null);
});

test("maps database enum values back to API day numbers", () => {
  assert.equal(constraintDayToNumber("monday"), 1);
  assert.equal(constraintDayToNumber("SUNDAY"), 7);
  assert.equal(constraintDayToNumber(null), null);
});

test("rejects invalid API day numbers", () => {
  assert.throws(() => constraintDayToDatabase(8));
  assert.throws(() => constraintDayToDatabase(1.5));
});
