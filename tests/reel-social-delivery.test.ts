import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Row = Record<string, unknown>;
type Result = { data: Row | Row[] | null; error: { code: string } | null };
type Claim = { postId: string; platform: string; updatedAt: string };
type DeliveryModule = {
  beginSocialDelivery: (postId: string, platform: string, options?: { automatic?: boolean; repost?: boolean }) => Promise<Claim | null>;
  finishSocialDelivery: (claim: Claim, status: string, externalId?: string | null) => Promise<void>;
};
const postId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";

function database() {
  const tables: Record<string, Row[]> = {
    reel_jobs: [{ id: jobId, post_id: postId, status: "ready", storage_path: "video.mp4", expected_updated_at: "2026-10-20T12:00:00Z" }],
    reel_social_publications: [],
    reel_youtube_publications: [],
    reel_social_automation: [{ id: true, activated_at: "2026-10-19T12:00:00Z" }],
    posts: [{ id: postId, slug: "example", title: "Example", summary: "Example", category: "industry", is_published: true, published_at: "2026-10-20T12:00:00Z", updated_at: "2026-10-20T12:00:00Z" }],
  };
  const db = {
    auth: { getUser: async () => ({ data: { user: {} }, error: null }) },
    storage: { from: () => ({
      createSignedUrl: async () => ({ data: { signedUrl: "https://media.example/video.mp4" }, error: null }),
      createSignedUrls: async (paths: string[]) => ({ data: paths.map(path => ({ path, signedUrl: `https://media.example/${path}` })), error: null }),
    }) },
    rpc: async (name: string) => {
      assert.equal(name, "list_reel_jobs");
      return { data: structuredClone(tables.reel_jobs), error: null };
    },
    from(table: string) {
      let operation = "select";
      let payload: Row = {};
      let single = false;
      let returning = false;
      const filters: Array<(row: Row) => boolean> = [];
      const query = {
        select() { if (operation !== "select") returning = true; return query; },
        insert(value: Row) { operation = "insert"; payload = value; return query; },
        update(value: Row) { operation = "update"; payload = value; return query; },
        eq(key: string, value: unknown) { filters.push(row => row[key] === value); return query; },
        lt(key: string, value: string) { filters.push(row => String(row[key]) < value); return query; },
        gte() { return query; },
        in(key: string, values: unknown[]) { filters.push(row => values.includes(row[key])); return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle() { single = true; return query; },
        single() { single = true; return query; },
        then(resolve: (value: Result) => unknown, reject?: (error: unknown) => unknown) {
          const run = async (): Promise<Result> => {
            const rows = tables[table] || (tables[table] = []);
            let selected = rows.filter(row => filters.every(filter => filter(row)));
            if (operation === "insert") {
              const duplicate = rows.some(row => row.post_id === payload.post_id && (table === "reel_social_publications" ? row.platform === payload.platform : row.channel_id === payload.channel_id));
              if (duplicate) return { data: null, error: { code: "23505" } };
              const row = { id: `record-${rows.length}`, ...payload };
              rows.push(row);
              selected = [row];
            } else if (operation === "update") {
              selected.forEach(row => Object.assign(row, payload));
            }
            return { data: operation !== "select" && !returning ? null : structuredClone(single ? selected[0] || null : selected), error: null };
          };
          return run().then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { db, tables };
}

function loadModule(file: string, mocks: Record<string, unknown>, fetcher?: typeof fetch, env: Record<string, string> = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } };
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
      return mocks[name];
    },
    fetch: fetcher || (() => { throw new Error("Unexpected network request"); }),
    process: { env }, Buffer, URL, Request, Response, Uint8Array, AbortSignal,
    setTimeout: (fn: () => void) => { fn(); return 0; },
  });
  return exports;
}

function setup() {
  const state = database();
  const remote = { getReelAdmin: () => state.db, REEL_BUCKET: "reels" };
  const delivery = loadModule("src/lib/video/reel-social-delivery.ts", { "./reel-remote": remote }) as DeliveryModule;
  const mocks = {
    "@/lib/auth": { isVerifiedAdminSession: () => true },
    "@/lib/video/reel-remote": remote,
    "@/lib/site-url": { getSiteUrl: () => "https://site.example" },
    "@/lib/server/cron-auth": { isAuthorizedCronRequest: (request: Request) => request.headers.get("authorization") === "Bearer cron" },
    "@/lib/video/reel-social-delivery": delivery,
  };
  return { ...state, delivery, mocks };
}

function request(platform: string, automatic = false) {
  return new Request(`https://site.example/api/admin/reels/${platform}`, {
    method: "POST",
    headers: { authorization: automatic ? "Bearer cron" : "Bearer admin", "content-type": "application/json" },
    body: JSON.stringify({ postId, reelJobId: jobId, videoUrl: "https://media.example/video.mp4", caption: "Example #games", title: "Example", description: "Example #games", channelId: "channel", visibility: "public", confirmed: true, autoPublic: automatic }),
  });
}

test("simultaneous manual and automatic claims allow one Instagram send", async () => {
  const { delivery, tables } = setup();
  const claims = await Promise.all(Array.from({ length: 20 }, (_, i) => delivery.beginSocialDelivery(postId, "instagram", { automatic: i % 2 === 0 })));
  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal(tables.reel_social_publications.length, 1);
});

test("failed retry is reserved once and unknown outcomes block retries", async () => {
  const { delivery, tables } = setup();
  const first = await delivery.beginSocialDelivery(postId, "instagram");
  await delivery.finishSocialDelivery(first!, "failed");
  const retries = await Promise.all([delivery.beginSocialDelivery(postId, "instagram"), delivery.beginSocialDelivery(postId, "instagram")]);
  const winner = retries.find(Boolean)!;
  assert.equal(retries.filter(Boolean).length, 1);
  await delivery.finishSocialDelivery(winner, "unknown");
  assert.equal(await delivery.beginSocialDelivery(postId, "instagram", { repost: true }), null);
  assert.equal(tables.reel_social_publications[0].status, "unknown");
});

test("published status survives duplicate requests and repost needs explicit intent", async () => {
  const { delivery, tables } = setup();
  const claim = await delivery.beginSocialDelivery(postId, "instagram");
  await delivery.finishSocialDelivery(claim!, "published", "media-1");
  assert.equal(await delivery.beginSocialDelivery(postId, "instagram"), null);
  assert.equal(tables.reel_social_publications[0].external_id, "media-1");
  const claims = await Promise.all([delivery.beginSocialDelivery(postId, "instagram", { repost: true }), delivery.beginSocialDelivery(postId, "instagram", { repost: true })]);
  assert.equal(claims.filter(Boolean).length, 1);
});

test("finishing one platform cannot change another platform or an old reservation", async () => {
  const { delivery, tables } = setup();
  const instagram = await delivery.beginSocialDelivery(postId, "instagram");
  await delivery.beginSocialDelivery(postId, "youtube");
  await delivery.finishSocialDelivery(instagram!, "published", "ig-1");
  assert.equal(tables.reel_social_publications.find(row => row.platform === "youtube")?.status, "processing");
  await assert.rejects(delivery.finishSocialDelivery(instagram!, "failed"), /resultado/);
  assert.equal(tables.reel_social_publications.find(row => row.platform === "instagram")?.status, "published");
});

test("Instagram handler publishes once under concurrent manual and automatic requests and never calls YouTube", async () => {
  const { mocks, tables } = setup();
  const calls: string[] = [];
  const handler = loadModule("src/app/api/admin/reels/instagram/route.ts", mocks, async input => {
    const url = String(input);
    calls.push(url);
    assert.equal(new URL(url).hostname, "graph.facebook.com");
    return Response.json(url.includes("media_publish") ? { id: "instagram-media" } : url.includes("status_code") ? { status_code: "FINISHED" } : { id: "container" });
  }, { INSTAGRAM_ACCESS_TOKEN: "token", INSTAGRAM_ACCOUNT_ID: "account" }).POST as (request: Request) => Promise<Response>;
  const responses = await Promise.all([handler(request("instagram")), handler(request("instagram", true))]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(calls.filter(url => url.includes("media_publish")).length, 1);
  assert.equal(tables.reel_social_publications[0].status, "published");
  assert.equal(tables.reel_youtube_publications.length, 0);
});

test("uncertain Instagram publish response blocks a duplicate upload", async () => {
  const { mocks, tables } = setup();
  let publishes = 0;
  const handler = loadModule("src/app/api/admin/reels/instagram/route.ts", mocks, async input => {
    const url = String(input);
    if (url.includes("media_publish")) { publishes++; throw new Error("Connection lost after publish"); }
    return Response.json(url.includes("status_code") ? { status_code: "FINISHED" } : { id: "container" });
  }, { INSTAGRAM_ACCESS_TOKEN: "token", INSTAGRAM_ACCOUNT_ID: "account" }).POST as (request: Request) => Promise<Response>;
  assert.equal((await handler(request("instagram"))).status, 500);
  assert.equal((await handler(request("instagram"))).status, 409);
  assert.equal(publishes, 1);
  assert.equal(tables.reel_social_publications[0].status, "unknown");
});

test("Instagram through Composio publishes once and confirms the target account", async () => {
  const { mocks } = setup();
  const endpoints: string[] = [];
  const handler = loadModule("src/app/api/admin/reels/instagram/route.ts", mocks, async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    endpoints.push(body.endpoint);
    const url = new URL(body.endpoint);
    assert.equal(url.hostname, "graph.instagram.com");
    const data = url.pathname === "/me" ? { id: "ig-account" }
      : url.pathname.endsWith("media_publish") ? { id: "ig-media" }
        : url.searchParams.has("fields") ? { status_code: "FINISHED" } : { id: "ig-container" };
    return Response.json({ data });
  }, { COMPOSIO_API_KEY: "key", COMPOSIO_INSTAGRAM_ACCOUNT: "connection" }).POST as (request: Request) => Promise<Response>;
  const responses = await Promise.all([handler(request("instagram")), handler(request("instagram", true))]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(endpoints.filter(url => url.includes("media_publish")).length, 1);
  assert.ok(endpoints.includes("https://graph.instagram.com/v21.0/ig-account/media"));
});

test("TikTok sends only to inbox as a draft and blocks duplicate uploads", async () => {
  const { mocks, tables } = setup();
  const calls: string[] = [];
  const handler = loadModule("src/app/api/admin/reels/tiktok/route.ts", mocks, async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("media.example")) return new Response(new Uint8Array([1, 2, 3]));
    if (url.includes("inbox/video/init")) {
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.post_info, undefined);
      return Response.json({ data: { publish_id: "v_inbox_file~draft", upload_url: "https://upload.example/video" } });
    }
    assert.equal(url, "https://upload.example/video");
    assert.equal(init?.method, "PUT");
    return new Response(null, { status: 201 });
  }, { TIKTOK_ACCESS_TOKEN: "token" }).POST as (request: Request) => Promise<Response>;
  const response = await handler(request("tiktok", true));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).isDirect, false);
  assert.equal((await handler(request("tiktok"))).status, 409);
  assert.equal(calls.filter(url => url.includes("inbox/video/init")).length, 1);
  assert.equal(tables.reel_social_publications[0].status, "submitted");
});

test("YouTube handler uploads once under concurrent manual and automatic requests", async () => {
  const { mocks, tables } = setup();
  let uploads = 0;
  const handler = loadModule("src/app/api/admin/reels/youtube/route.ts", {
    ...mocks,
    "@/lib/video/reel-youtube": {
      getYouTubeConnection: async () => ({ channel: { id: "channel" }, session: "session" }),
      stageYouTubeVideo: async () => ({ name: "video.mp4" }),
      uploadYouTubeVideo: async () => { uploads++; return "youtube-video"; },
    },
  }).POST as (request: Request) => Promise<Response>;
  const responses = await Promise.all([handler(request("youtube")), handler(request("youtube", true))]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(uploads, 1);
  assert.equal(tables.reel_social_publications[0].platform, "youtube");
  assert.equal(tables.reel_social_publications[0].status, "published");
});

test("TikTok through Composio uses inbox even when direct publishing is authorized", async () => {
  const { mocks } = setup();
  const endpoints: string[] = [];
  const handler = loadModule("src/app/api/admin/reels/tiktok/route.ts", mocks, async (input, init) => {
    const url = String(input);
    if (url.includes("connected_accounts")) return Response.json({ items: [{ id: "connection", toolkit: { slug: "tiktok" }, status: "ACTIVE", scope: "video.upload,video.publish" }] });
    if (url.includes("media.example")) return new Response(new Uint8Array([1, 2, 3]));
    if (url.includes("execute/proxy")) {
      const body = JSON.parse(String(init?.body));
      endpoints.push(body.endpoint);
      assert.equal(body.body.post_info, undefined);
      return Response.json({ data: { data: { publish_id: "v_inbox_file~draft", upload_url: "https://upload.example/video" } } });
    }
    assert.equal(url, "https://upload.example/video");
    return new Response(null, { status: 201 });
  }, { COMPOSIO_API_KEY: "key", COMPOSIO_TIKTOK_ACCOUNT: "connection" }).POST as (request: Request) => Promise<Response>;
  assert.equal((await handler(request("tiktok", true))).status, 200);
  assert.deepEqual(endpoints, ["https://open.tiktokapis.com/v2/post/publish/inbox/video/init/"]);
});

test("opening or refreshing YouTube history never uploads a video", async () => {
  const { mocks } = setup();
  const handler = loadModule("src/app/api/admin/reels/youtube/route.ts", {
    ...mocks,
    "@/lib/video/reel-youtube": {
      getYouTubeConnection: async () => ({ channel: { id: "channel" } }),
      stageYouTubeVideo: () => { throw new Error("Unexpected staging"); },
      uploadYouTubeVideo: () => { throw new Error("Unexpected upload"); },
    },
  }).GET as (request: Request) => Promise<Response>;
  const response = await handler(new Request(`https://site.example/api/admin/reels/youtube?postId=${postId}`, { headers: { authorization: "Bearer admin" } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).publication, null);
});

test("automation stops at a concurrent reservation instead of advancing to Instagram", async () => {
  const { mocks } = setup();
  const calls: string[] = [];
  const handler = loadModule("src/app/api/cron/reel-social/route.ts", {
    ...mocks,
    "@/lib/video/reel-service": { generateSocialCopys: () => ({ youtube: { title: "Example", description: "Example" } }) },
    "@/lib/video/reel-youtube": { getYouTubeConnection: async () => ({ channel: { id: "channel" } }) },
  }, async input => {
    calls.push(String(input));
    return Response.json({ error: "Already sending" }, { status: 409 });
  }, { CRON_SECRET: "cron" }).GET as (request: Request) => Promise<Response>;
  const response = await handler(new Request(`https://site.example/api/cron/reel-social?postId=${postId}`, { headers: { authorization: "Bearer cron" } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).platform, "youtube");
  assert.deepEqual(calls, ["https://site.example/api/admin/reels/youtube"]);
});

test("automation waits while a manual Instagram send is in progress", async () => {
  const { mocks, delivery } = setup();
  await delivery.beginSocialDelivery(postId, "instagram");
  const handler = loadModule("src/app/api/cron/reel-social/route.ts", {
    ...mocks,
    "@/lib/video/reel-service": { generateSocialCopys: () => ({}) },
    "@/lib/video/reel-youtube": { getYouTubeConnection: async () => { throw new Error("YouTube must not be invoked"); } },
  }, undefined, { CRON_SECRET: "cron" }).GET as (request: Request) => Promise<Response>;
  const response = await handler(new Request(`https://site.example/api/cron/reel-social?postId=${postId}`, { headers: { authorization: "Bearer cron" } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.processed, false);
  assert.equal(body.platform, "instagram");
});

test("automation dispatches YouTube then Instagram then TikTok once each", async () => {
  const { mocks, delivery, tables } = setup();
  const calls: string[] = [];
  const handler = loadModule("src/app/api/cron/reel-social/route.ts", {
    ...mocks,
    "@/lib/video/reel-service": { generateSocialCopys: () => ({ youtube: { title: "Example", description: "Example" }, instagram: { caption: "Example #games" }, tiktok: { caption: "Example #games" } }) },
    "@/lib/video/reel-youtube": { getYouTubeConnection: async () => ({ channel: { id: "channel" } }) },
  }, async (input, init) => {
    const url = new URL(String(input));
    if (url.searchParams.get("action") === "status") return Response.json({ status: "SEND_TO_USER_INBOX" });
    const platform = url.pathname.split("/").at(-1)!;
    calls.push(platform);
    assert.equal(JSON.parse(String(init?.body)).autoPublic, true);
    const claim = await delivery.beginSocialDelivery(postId, platform, { automatic: true });
    assert.ok(claim);
    await delivery.finishSocialDelivery(claim, platform === "tiktok" ? "submitted" : "published", platform === "tiktok" ? "v_inbox_file~draft" : "published-id");
    return Response.json(platform === "youtube" ? { publication: { status: "uploaded", video_id: "published-id", visibility: "public" } } : platform === "instagram" ? { mediaId: "published-id" } : { publishId: "v_inbox_file~draft", isDirect: false });
  }, { CRON_SECRET: "cron" }).GET as (request: Request) => Promise<Response>;
  for (let i = 0; i < 4; i++) {
    const response = await handler(new Request(`https://site.example/api/cron/reel-social?postId=${postId}`, { headers: { authorization: "Bearer cron" } }));
    assert.equal(response.status, 200);
    if (i === 3) assert.equal((await response.json()).status, "draft");
  }
  assert.deepEqual(calls, ["youtube", "instagram", "tiktok"]);
  assert.equal(tables.reel_social_publications.length, 3);
});

test("Reels use shared storage by default locally and on Vercel", () => {
  for (const env of [{}, { VERCEL: "1" }, { VERCEL: "1", REELS_REMOTE: "false" }]) {
    const remote = loadModule("src/lib/video/reel-remote.ts", { "@supabase/supabase-js": {} }, undefined, env as Record<string, string>);
    assert.equal((remote.usesRemoteReels as () => boolean)(), true);
  }
  const remote = loadModule("src/lib/video/reel-remote.ts", { "@supabase/supabase-js": {} }, undefined, { REELS_REMOTE: "false" });
  assert.equal((remote.usesRemoteReels as () => boolean)(), false);
});

test("localhost and production list the same remote Reel without reading local video files", async () => {
  const { db, mocks } = setup();
  const items: unknown[] = [];
  const deployments: Array<Record<string, string>> = [{}, { VERCEL: "1" }];
  for (const deployment of deployments) {
    const env = { NEXT_PUBLIC_SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "key", ...deployment };
    const supabase = { createClient: () => db };
    const remote = loadModule("src/lib/video/reel-remote.ts", { "@supabase/supabase-js": supabase }, undefined, env);
    const route = loadModule("src/app/api/admin/reels/route.ts", {
      ...mocks,
      "@supabase/supabase-js": supabase,
      "@/lib/video/reel-remote": remote,
      "@/lib/video/reel-service": {
        getManifest: () => { throw new Error("Unexpected local manifest read"); },
        checkReelFile: () => { throw new Error("Unexpected local video read"); },
        generateSocialCopys: () => ({}),
      },
    }, undefined, env);
    const response = await (route.GET as (request: Request) => Promise<Response>)(new Request("https://site.example/api/admin/reels", { headers: { authorization: "Bearer admin" } }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.items[0].status, "ready");
    assert.equal(body.items[0].reel_job_id, jobId);
    assert.equal(body.items[0].video_url, "https://media.example/video.mp4");
    items.push(body.items);
  }
  assert.deepEqual(items[0], items[1]);
});

test("local generation reserves the shared job and dispatches the official GitHub worker once", async () => {
  const { db } = setup();
  let reservations = 0;
  let dispatches = 0;
  const shared = {
    ...db,
    rpc: async (name: string, args: Record<string, string>) => {
      assert.equal(name, "enqueue_reel");
      assert.equal(args.p_slug, "example");
      reservations++;
      return { data: [{ id: jobId, status: "queued" }], error: null };
    },
  };
  const remote = loadModule("src/lib/video/reel-remote.ts", { "@supabase/supabase-js": { createClient: () => shared } }, async (input, init) => {
    dispatches++;
    assert.equal(String(input), "https://api.github.com/repos/outfybrasil/OrangeBrick/actions/workflows/reel-generator.yml/dispatches");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { ref: "master" });
    return new Response(null, { status: 204 });
  }, { NEXT_PUBLIC_SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "key", REELS_GITHUB_TOKEN: "worker-token" });
  const result = await (remote.enqueueRemoteReel as (slug: string) => Promise<{ queued: boolean }>)("example");
  assert.equal(result.queued, true);
  assert.equal(reservations, 1);
  assert.equal(dispatches, 1);
});

test("missing local worker credentials stop before reserving or rendering another copy", async () => {
  const remote = loadModule("src/lib/video/reel-remote.ts", { "@supabase/supabase-js": {} });
  await assert.rejects((remote.enqueueRemoteReel as (slug: string) => Promise<unknown>)("example"), /REELS_GITHUB_TOKEN/);
});
