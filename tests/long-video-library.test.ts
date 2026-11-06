import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { mergeVideoManifests, videoArchiveSlugs, videoDate, videoDelivery, videoVersions, type LibraryVideo } from "../src/lib/video/long-video-library.ts";

function fixture(slug: string, updated = "2026-11-05T03:00:00Z"): LibraryVideo {
  return { slug, title: slug, subtitle: "", series_badge: "Orange Brick", status: "pending_review", pipeline_stage_index: 8, pipeline_stage_label: "Pronto", source_mode: "custom_script", source_post_slugs: [], visual_style: "documentario", voice_id: "auto", duration_seconds: 300, duration_formatted: "05:00", monetization_midroll_eligible: false, resolution: "1920x1080", fps: 30, chapters: [], qa_checks: [], shorts_suggestions: [], updated_at: updated, created_at: updated, thumbnails: [{ id: "thumb_1", url: "/thumb.jpg", label: "Opção 1", angle: "Tema", headline: "Título", subline: "Contexto" }], youtube: { title: slug, description: "Descrição", tags: [], pinned_comment: "" } };
}

test("a biblioteca preserva a versão mais recente entre disco, execução e Storage", () => {
  const latest = { ...fixture("video"), status: "scheduled" as const };
  const stale = fixture("video", "2026-11-04T03:00:00Z");
  assert.equal(mergeVideoManifests({ video: latest }, { video: stale }).video.status, "scheduled");
  assert.equal(mergeVideoManifests({ video: stale }, { video: latest }).video.status, "scheduled");
});

test("reedições arquivam os originais e suas versões oficiais, mantendo as prévias acessíveis", () => {
  const videos = [fixture("video"), fixture("video-oficial"), { ...fixture("video-reeditado"), replaces_slug: "video" }, { ...fixture("teste-preview"), is_preview: true }, fixture("outra-pauta")];
  assert.deepEqual([...videoArchiveSlugs(videos)].sort(), ["teste-preview", "video", "video-oficial"]);
  assert.equal(videoDelivery({ ...fixture("video"), status: "scheduled" }), "planned");
  assert.equal(videoDelivery({ ...fixture("video"), youtube: { ...fixture("video").youtube, video_id: "abc12345678", scheduled_at: "2026-11-06T15:00:00Z", upload_status: "scheduled" } }), "scheduled");
  assert.equal(videoDelivery({ ...fixture("video"), youtube: { ...fixture("video").youtube, video_id: "abc12345678", scheduled_at: "2026-11-06T15:00:00Z" } }), "uploaded");
  assert.match(videoDate("2026-11-06T15:00:00Z"), /06\/11.*12:00/);
});

test("a API protege gravações, conflitos, publicações existentes e falhas de persistência", async () => {
  let current = fixture("video"); let allowed = true; let failUpload = false; let writes = 0;
  const code = ts.transpileModule(readFileSync(new URL("../src/app/api/admin/long-videos/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports: { PATCH?: (request: Request) => Promise<Response>; GET?: (request: Request) => Promise<Response> } = {};
  vm.runInNewContext(code, {
    exports, Request, Response, Buffer, Date, Map, Set, crypto,
    process: { cwd: () => "/fixture", env: { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon", SUPABASE_SECRET_KEY: "service" } },
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      if (name === "node:fs") return { existsSync: () => false };
      if (name === "node:path") return { join: (...parts: string[]) => parts.join("/") };
      if (name.includes("long-video-library")) return { mergeVideoManifests };
      if (name.includes("reel-service")) return { getLongVideoManifest: () => ({ video: current }), saveLongVideoManifest: (items: Record<string, LibraryVideo>) => { current = items.video; writes++; } };
      if (name.includes("/auth")) return { isVerifiedAdminSession: () => allowed };
      if (name === "@supabase/supabase-js") return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: {} } }) }, storage: { from: () => ({ download: async () => ({ data: null, error: { message: "Object not found" } }), createSignedUrls: async () => ({ data: [] }), upload: async () => ({ error: failUpload ? { message: "Unavailable" } : null }) }) } }) };
      throw new Error(name);
    },
  });
  const request = (body: Record<string, unknown>, token = true) => new Request("https://fixture.test/api/admin/long-videos", { method: "PATCH", headers: { ...(token ? { authorization: "Bearer fixture" } : {}), "content-type": "application/json" }, body: JSON.stringify({ slug: "video", updated_at: current.updated_at, ...body }) });
  assert.equal((await exports.PATCH!(request({ action: "review", notes: "Ajustar" }, false))).status, 403);
  allowed = false;
  assert.equal((await exports.PATCH!(request({ action: "review", notes: "Ajustar" }))).status, 403);
  allowed = true;
  const edit = { action: "metadata", title: "Novo título", description: "Texto", tags: ["GTA VI"], selected_thumbnail_id: "thumb_1" };
  assert.equal((await exports.PATCH!(request({ ...edit, updated_at: "2020-01-01" }))).status, 409);
  assert.equal((await exports.PATCH!(request({ ...edit, title: "x".repeat(101) }))).status, 400);
  assert.equal((await exports.PATCH!(request({ ...edit, selected_thumbnail_id: "missing" }))).status, 400);
  failUpload = true;
  assert.equal((await exports.PATCH!(request(edit))).status, 503);
  assert.equal(writes, 0);
  failUpload = false;
  assert.equal((await exports.PATCH!(request(edit))).status, 200);
  assert.equal(current.youtube.title, "Novo título");
  assert.equal(current.review_history?.at(-1)?.kind, "metadata");
  current.youtube.video_id = "abc12345678";
  current.status = "scheduled";
  assert.equal((await exports.PATCH!(request(edit))).status, 409);
  assert.equal((await exports.PATCH!(request({ action: "review", notes: "Ouvir novamente", decision: "rejected" }))).status, 409);
  assert.equal((await exports.PATCH!(request({ action: "review", notes: "Ouvir novamente" }))).status, 200);
  assert.equal(current.status, "scheduled");
  assert.equal(current.review_history?.at(-1)?.kind, "notes");
  const listing = await exports.GET!(new Request("https://fixture.test/api/admin/long-videos", { headers: { authorization: "Bearer fixture" } }));
  assert.equal(listing.status, 200);
  assert.deepEqual((await listing.json()).videos[0].available_variants, []);
});

test("histórico liga original e reedição sem transferir aprovação", () => {
  const original = fixture("video", "2026-11-04T03:00:00Z");
  const revised = { ...fixture("video-reeditado"), replaces_slug: "video", approved_at: "2026-11-05T04:00:00Z", status: "approved" as const };
  const unrelated = fixture("outro-video");
  assert.deepEqual(videoVersions(revised, [unrelated, revised, original]).map(video => video.slug), ["video", "video-reeditado"]);
  assert.equal(original.approved_at, undefined);
  assert.equal(revised.approved_at, "2026-11-05T04:00:00Z");
});

test("sincronização envia o arquivo antes do registro e preserva outras produções remotas", async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { syncLongVideos } = await import("../scripts/sync-long-videos.mjs");
  const root = await mkdtemp(path.join(tmpdir(), "long-library-sync-"));
  const writes: string[] = [];
  let remote = { previous: fixture("previous") } as Record<string, LibraryVideo>;
  const storage = {
    download: async (key: string) => ({ data: { text: async () => JSON.stringify(key.endsWith("deleted-slugs.mp4") ? [] : remote) }, error: null }),
    list: async () => ({ data: [], error: null }),
    upload: async (key: string, bytes: Buffer) => { writes.push(key); if (key.endsWith("manifest-state.mp4")) remote = JSON.parse(bytes.toString()); return { error: null }; },
  };
  try {
    await mkdir(path.join(root, "public/long-videos/video"), { recursive: true });
    const item = { ...fixture("video"), video_url: "/long-videos/video/video.mp4", approved_at: "2026-11-05T04:00:00Z", status: "approved" as const };
    await writeFile(path.join(root, "public/long-videos/manifest.json"), JSON.stringify({ video: item }));
    await writeFile(path.join(root, "public/long-videos/video/video.mp4"), Buffer.from("fixture"));
    await syncLongVideos(["video"], { root, client: { storage: { from: () => storage } } });
    assert.deepEqual(writes, ["long-videos/video/video.mp4", "long-videos/manifest-state.mp4"]);
    assert.equal(remote.video.status, "approved");
    assert.equal(remote.previous.slug, "previous");
    assert.equal(JSON.parse(await readFile(path.join(root, "public/long-videos/video/youtube-metadata.json"), "utf8")).approved_at, item.approved_at);
  } finally { await rm(root, { recursive: true, force: true }); }
});
