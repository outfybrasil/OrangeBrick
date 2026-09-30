import assert from "node:assert/strict";
import test from "node:test";
import { boundedRequestTimeout } from "../src/lib/ai/request-budget.ts";

test("bounds provider timeouts by both the request cap and remaining deadline", () => {
  assert.equal(boundedRequestTimeout(10_000, 35_000, 1_000), 9_000);
  assert.equal(boundedRequestTimeout(100_000, 35_000, 1_000), 35_000);
  assert.equal(boundedRequestTimeout(1_000, 35_000, 1_000), 0);
});

test("fails closed for expired deadlines and invalid timeout budgets", () => {
  assert.equal(boundedRequestTimeout(999, 15_000, 1_000), 0);
  assert.equal(boundedRequestTimeout(Number.NaN, 15_000, 1_000), 0);
  assert.equal(boundedRequestTimeout(2_000, 0, 1_000), 0);
});
