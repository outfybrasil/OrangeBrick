import assert from "node:assert/strict";
import test from "node:test";
import { createPostStatsHandler, type PostStatsRow } from "../src/lib/server/post-stats-handler.ts";

const firstPostId = "00000000-0000-4000-8000-000000000001";
const secondPostId = "00000000-0000-4000-8000-000000000002";
const validDeviceId = "a".repeat(32);

function createHandler(options: {
  allowed?: boolean;
  rows?: PostStatsRow[];
  loadError?: Error;
} = {}) {
  const calls: { rateLimit: string[]; loaded: Array<{ postIds: string[]; deviceId: string | null }> } = {
    rateLimit: [],
    loaded: [],
  };
  const handle = createPostStatsHandler({
    async allowRequest(_request, action, limit, windowSeconds) {
      calls.rateLimit.push(`${action}:${limit}:${windowSeconds}`);
      return { allowed: options.allowed ?? true };
    },
    handleOptions(request) {
      return request.method === "OPTIONS" ? new Response("ok") : null;
    },
    isUuid(value): value is string {
      return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    },
    json(data, status = 200) {
      return Response.json(data, { status });
    },
    async loadStats(postIds, deviceId) {
      calls.loaded.push({ postIds, deviceId });
      if (options.loadError) throw options.loadError;
      return options.rows ?? [];
    },
  });
  return { handle, calls };
}

function request(body: string, method = "POST") {
  return new Request("https://orange-brick.example/functions/post-stats", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? body : undefined,
  });
}

test("rejects malformed JSON and invalid fields before loading statistics", async () => {
  const fixture = createHandler();
  const malformed = await fixture.handle(request("{"));
  const invalid = await fixture.handle(request(JSON.stringify({ post_ids: ["invalid"] })));
  const tooMany = await fixture.handle(request(JSON.stringify({ post_ids: Array(51).fill(firstPostId) })));
  const invalidDevice = await fixture.handle(request(JSON.stringify({ post_ids: [firstPostId], device_id: "not-a-device" })));

  assert.equal(malformed.status, 400);
  assert.equal(invalid.status, 400);
  assert.equal(tooMany.status, 400);
  assert.equal(invalidDevice.status, 400);
  assert.equal(fixture.calls.loaded.length, 0);
});

test("handles CORS preflight and rejects methods other than POST", async () => {
  const fixture = createHandler();
  const preflight = await fixture.handle(request("", "OPTIONS"));
  const get = await fixture.handle(request("", "GET"));

  assert.equal(preflight.status, 200);
  assert.equal(get.status, 405);
  assert.equal(fixture.calls.rateLimit.length, 0);
});

test("returns zero defaults for unpublished posts and maps aggregated rows safely", async () => {
  const fixture = createHandler({
    rows: [
      { post_id: firstPostId, hype: "502", flop: "501", salty: "501", views: "1501", comments: "1201", user_reaction: "hype" },
      { post_id: secondPostId, hype: 1, flop: 0, salty: 0, views: 1, comments: 0, user_reaction: "invalid" },
      { post_id: "00000000-0000-4000-8000-000000000003", hype: 9, flop: 9, salty: 9, views: 9, comments: 9, user_reaction: "hype" },
    ],
  });
  const response = await fixture.handle(request(JSON.stringify({ post_ids: [firstPostId, secondPostId], device_id: validDeviceId })));
  const result = await response.json();

  assert.deepEqual(result, {
    stats: {
      [firstPostId]: { reactions: { hype: 502, flop: 501, salty: 501 }, views: 1501, comments: 1201, userReaction: "hype" },
      [secondPostId]: { reactions: { hype: 1, flop: 0, salty: 0 }, views: 1, comments: 0, userReaction: null },
    },
  });
  assert.deepEqual(fixture.calls.loaded, [{ postIds: [firstPostId, secondPostId], deviceId: validDeviceId }]);
});

test("returns zero statistics when no published rows are available", async () => {
  const fixture = createHandler();
  const response = await fixture.handle(request(JSON.stringify({ post_ids: [firstPostId] })));

  assert.deepEqual(await response.json(), {
    stats: { [firstPostId]: { reactions: { hype: 0, flop: 0, salty: 0 }, views: 0, comments: 0, userReaction: null } },
  });
  assert.deepEqual(fixture.calls.loaded, [{ postIds: [firstPostId], deviceId: null }]);
});

test("stops before database access when rate limited and reports dependency failures", async () => {
  const limited = createHandler({ allowed: false });
  const limitedResponse = await limited.handle(request(JSON.stringify({ post_ids: [firstPostId] })));
  const failing = createHandler({ loadError: new Error("database unavailable") });
  const failingResponse = await failing.handle(request(JSON.stringify({ post_ids: [firstPostId] })));

  assert.equal(limitedResponse.status, 429);
  assert.equal(limited.calls.loaded.length, 0);
  assert.equal(failingResponse.status, 500);
  assert.deepEqual(await failingResponse.json(), { error: "Erro interno" });
});
