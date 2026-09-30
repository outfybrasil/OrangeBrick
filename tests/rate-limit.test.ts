import assert from "node:assert/strict";
import test from "node:test";
import { getRateLimitIdentity, getRateLimitWindowStart } from "../src/lib/server/rate-limit.ts";

test("hashes the Vercel client IP header instead of a forwarded client value", () => {
  const first = new Request("https://orange-brick.example/api", { headers: { "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.2" } });
  const second = new Request("https://orange-brick.example/api", { headers: { "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.3" } });
  const third = new Request("https://orange-brick.example/api", { headers: { "x-real-ip": "203.0.113.10" } });
  const identity = getRateLimitIdentity(first, "secret");
  assert.equal(identity, getRateLimitIdentity(second, "secret"));
  assert.notEqual(identity, getRateLimitIdentity(third, "secret"));
  assert.equal(identity?.includes("203.0.113.9"), false);
});

test("uses a local identity only outside production and rejects malformed client addresses", () => {
  assert.equal(getRateLimitIdentity(new Request("https://orange-brick.example/api"), "secret", false), null);
  assert.equal(getRateLimitIdentity(new Request("https://orange-brick.example/api", { headers: { "x-real-ip": "not-an-ip" } }), "secret", false), null);
  assert.ok(getRateLimitIdentity(new Request("https://orange-brick.example/api"), "secret", true));
});

test("floors rate-limit windows without changing their configured interval", () => {
  const date = new Date("2026-09-24T12:34:56.789Z");
  assert.equal(getRateLimitWindowStart(date).toISOString(), "2026-09-24T12:34:00.000Z");
  assert.equal(getRateLimitWindowStart(date, 60 * 60 * 1000).toISOString(), "2026-09-24T12:00:00.000Z");
});
