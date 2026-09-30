import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedCronRequest, MIN_CRON_SECRET_LENGTH } from "../src/lib/server/cron-auth.ts";

function cronRequest(authorization?: string) {
  return new Request("https://orange-brick.example/api/cron", {
    headers: authorization ? { authorization } : undefined,
  });
}

test("authorizes only the exact bearer value for a sufficiently long cron secret", () => {
  const secret = "s".repeat(MIN_CRON_SECRET_LENGTH);
  assert.equal(isAuthorizedCronRequest(cronRequest(`Bearer ${secret}`), secret), true);
  assert.equal(isAuthorizedCronRequest(cronRequest(`Bearer ${secret}x`), secret), false);
  assert.equal(isAuthorizedCronRequest(cronRequest(secret), secret), false);
});

test("rejects absent and short cron secrets", () => {
  assert.equal(isAuthorizedCronRequest(cronRequest(), undefined), false);
  assert.equal(isAuthorizedCronRequest(cronRequest("Bearer short"), "short"), false);
});
