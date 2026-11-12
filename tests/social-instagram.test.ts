import assert from "node:assert/strict";
import test from "node:test";
import { instagramGraph, publishInstagramImages } from "../src/lib/social/instagram-graph.ts";
import { claimInstagramPublication, latestInstagramPublication, saveInstagramPublication, summarizeInstagramPublications } from "../src/lib/social/instagram-history.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

function storageFixture() {
  const records = new Map<string, string>();
  const db = { storage: {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      list: async (prefix: string) => ({ data: [...records.keys()].filter(key => key.startsWith(prefix + "/")).map(key => ({ name: key.slice(prefix.length + 1) })).sort((a, b) => b.name.localeCompare(a.name)), error: null }),
      download: async (key: string) => ({ data: records.has(key) ? new Blob([records.get(key)!]) : null, error: records.has(key) ? null : { statusCode: 404 } }),
      upload: async (key: string, value: string, options: { upsert: boolean }) => {
        if (!options.upsert && records.has(key)) return { error: { statusCode: 409, message: "Already exists" } };
        records.set(key, value); return { error: null };
      },
    }),
  } } as unknown as SupabaseClient;
  return { db, records };
}

const account = { id: "123", username: "orangebrick" };

test("duas publicações simultâneas disputam a mesma reserva; apenas uma pode publicar", async () => {
  const { db, records } = storageFixture();
  const claims = await Promise.all([claimInstagramPublication(db, "post", "carousel", "batch-1", account), claimInstagramPublication(db, "post", "carousel", "batch-2", account)]);
  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal(records.size, 1);
  const claim = claims.find(Boolean)!;
  claim.status = "unknown";
  await saveInstagramPublication(db, "post", "carousel", claim);
  assert.equal(await claimInstagramPublication(db, "post", "carousel", "batch-3", account), null);
  claim.status = "published";
  await saveInstagramPublication(db, "post", "carousel", claim);
  assert.equal(await claimInstagramPublication(db, "post", "carousel", "batch-4", account), null);
  assert.equal((await latestInstagramPublication(db, "post", "carousel"))?.status, "published");
});

test("falha confirmada permite uma nova tentativa sem misturar imagem, carrossel ou Reels", async () => {
  const { db, records } = storageFixture();
  const first = (await claimInstagramPublication(db, "post", "single", "batch-1", account))!;
  first.status = "failed";
  await saveInstagramPublication(db, "post", "single", first);
  const retry = await claimInstagramPublication(db, "post", "single", "batch-2", account);
  assert.equal(retry?.attempt, 2);
  assert.ok(await claimInstagramPublication(db, "post", "carousel", "batch-3", account));
  assert.equal(records.size, 3);
  assert.ok([...records.keys()].every(key => key.startsWith("instagram/post/")));
});

test("carrossel cria filhos em ordem, aguarda processamento e publica o pai uma única vez", async () => {
  const calls: Array<{ endpoint: string; method?: string; body?: Record<string, string> }> = [];
  let nextId = 0;
  let reserved = "";
  const result = await publishInstagramImages({ account, caption: "Legenda revisada", images: [{ url: "https://storage.test/01.jpg", alt: "Primeira imagem" }, { url: "https://storage.test/02.jpg", alt: "Segunda imagem" }], call: async (endpoint, method, body) => {
    calls.push({ endpoint, method, body });
    if (endpoint.endsWith("/media")) return { id: String(++nextId) };
    if (endpoint.endsWith("/media_publish")) { assert.equal(reserved, "3"); return { id: "published-1" }; }
    return { status_code: "FINISHED" };
  }, beforePublish: async id => { reserved = id; }, pause: async () => {} });
  assert.equal(result.mediaId, "published-1");
  const create = calls.filter(call => call.endpoint.endsWith("/media"));
  assert.equal(create.length, 3);
  assert.equal(create[0].body?.is_carousel_item, "true");
  assert.equal(create[0].body?.alt_text, "Primeira imagem");
  assert.equal(create[2].body?.media_type, "CAROUSEL");
  assert.equal(create[2].body?.children, "1,2");
  assert.equal(create[2].body?.caption, "Legenda revisada");
  assert.equal(calls.filter(call => call.endpoint.endsWith("/media_publish")).length, 1);
});

test("imagem única recebe a legenda; limite e falha de processamento impedem publicação", async () => {
  const calls: string[] = [];
  let fields: Record<string, string> | undefined;
  await publishInstagramImages({ account, caption: "Legenda", images: [{ url: "https://storage.test/01.jpg", alt: "Imagem" }], beforePublish: async () => {}, call: async (endpoint, _method, body) => {
    calls.push(endpoint);
    if (endpoint.endsWith("/media")) { fields = body; return { id: "1" }; }
    if (endpoint.endsWith("/media_publish")) return { id: "publicado" };
    return { status_code: "FINISHED" };
  } });
  assert.equal(fields?.caption, "Legenda");
  assert.equal(fields?.is_carousel_item, undefined);
  assert.equal(calls.filter(path => path.endsWith("/media")).length, 1);
  let published = false;
  const options = { account, caption: "Legenda", images: [{ url: "https://storage.test/01.jpg", alt: "Imagem" }], beforePublish: async () => { published = true; }, call: async (endpoint: string) => endpoint.endsWith("/media") ? { id: "1" } : { status_code: "ERROR" }, pause: async () => {} };
  await assert.rejects(publishInstagramImages(options), /processar/);
  await assert.rejects(publishInstagramImages({ ...options, images: Array.from({ length: 11 }, () => options.images[0]) }), /10/);
  assert.equal(published, false);
});

test("credenciais diretas ficam no cabeçalho e a conexão Composio reutiliza a conta configurada", async () => {
  const names = ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_ACCOUNT_ID", "META_ACCESS_TOKEN", "META_INSTAGRAM_ACCOUNT_ID", "COMPOSIO_API_KEY", "COMPOSIO_INSTAGRAM_ACCOUNT", "COMPOSIO_USER_ID"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    process.env.INSTAGRAM_ACCESS_TOKEN = "fixture-secret"; process.env.INSTAGRAM_ACCOUNT_ID = "123";
    const direct = instagramGraph(async (url, init) => {
      assert.ok(!String(url).includes("fixture-secret"));
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fixture-secret");
      return Response.json({ id: "123", username: "orangebrick" });
    });
    assert.equal((await direct.account()).id, "123");
    process.env.INSTAGRAM_ACCESS_TOKEN = ""; process.env.META_ACCESS_TOKEN = "";
    process.env.COMPOSIO_API_KEY = "fixture-composio"; process.env.COMPOSIO_INSTAGRAM_ACCOUNT = "connected-fixture";
    const proxy = instagramGraph(async (url, init) => {
      assert.equal(String(url), "https://backend.composio.dev/api/v3.1/tools/execute/proxy");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.connected_account_id, "connected-fixture");
      assert.match(body.endpoint, /graph\.instagram\.com\/v21\.0\/me\?fields=id,username/);
      return Response.json({ data: { id: "123", username: "orangebrick" } });
    });
    assert.equal((await proxy.account()).username, "orangebrick");
  } finally { for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; } }
});

test("rota exige confirmação e conta revisada, publica uma vez e bloqueia resultado incerto", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const { applySocialDefaults, instagramPostCaption, socialDraftQualityIssues, validateSocialDraft, generateSocialDraft } = await import("../src/lib/social/post-plan.ts");
  const source = { id: "00000000-0000-4000-8000-000000000001", slug: "gta-vi", title: "Rockstar divulga imagens de GTA VI", summary: "Imagens oficiais mostram os personagens.", body: "[]", image_url: "https://official.test/cover.jpg", image_alt: "Jason e Lucia em imagem oficial de GTA VI.", updated_at: "2026-11-05T12:00:00Z", information_status: "confirmed" as const };
  const draft = generateSocialDraft(source, "carousel");
  draft.slides[0].caption = "Jason e Lucia. Crédito: Rockstar Games.";
  let admin = true;
  let configured = true;
  let calls = 0;
  let ambiguous = false;
  let storedDraft = draft;
  let storedRepublishOf: number | undefined;
  let current: import("../src/lib/types/database.ts").SocialInstagramPublication | null = null;
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "admin" } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: source, error: null }) }) }) }),
    storage: { from: () => ({
      download: async () => ({ data: new Blob([JSON.stringify({ draft: storedDraft, createdAt: new Date().toISOString(), republishOf: storedRepublishOf })]), error: null }),
      upload: async (_path: string, content: string) => { const value = JSON.parse(content); storedRepublishOf = value.republishOf; return { error: null }; },
      createSignedUrls: async (paths: string[]) => ({ data: paths.map((path: string) => ({ signedUrl: `https://storage.test/${path}` })), error: null }),
    }) },
  };
  const api: { GET?: (request: Request) => Promise<Response>; POST?: (request: Request) => Promise<Response> } = {};
  const code = ts.transpileModule(readFileSync(new URL("../src/app/api/admin/social-posts/instagram/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: api, process: { env: {} }, Request, Response, Buffer, Date, URL, AbortSignal, Uint8Array, Promise, Set, File,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (value: unknown, init: ResponseInit) => Response.json(value, init) } };
      if (name === "@supabase/supabase-js") return { createClient: () => db };
      if (name === "@/lib/auth") return { isVerifiedAdminSession: () => admin };
      if (name === "@/lib/site-url") return { getSiteUrl: () => "https://orangebrick.test" };
      if (name === "@/lib/social/post-plan") return { applySocialDefaults, instagramPostCaption, socialDraftQualityIssues, validateSocialDraft };
      if (name === "@/lib/social/post-context") return { enrichSocialPost: async (_db: unknown, post: unknown) => post };
      if (name === "@/lib/server/network") return { readResponseBuffer: async (response: Response) => Buffer.from(await response.arrayBuffer()) };
      if (name === "@/lib/social/instagram-history") return {
        socialDraftBucket: "drafts", socialMediaBucket: "media", ensureSocialBucket: async () => {}, latestInstagramPublication: async () => current,
        claimInstagramPublication: async (_db: unknown, _post: string, _format: string, _batch: string, _account: unknown, republishOf?: number) => {
          if (republishOf !== undefined ? current?.status !== "published" || current.attempt !== republishOf : current && current.status !== "failed") return null;
          current = { attempt: (current?.attempt || 0) + 1, batchId: "batch", status: "processing", phase: "creating", accountId: "123", username: "orangebrick", containerId: null, mediaId: null, permalink: null, error: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          return structuredClone(current);
        },
        saveInstagramPublication: async (_db: unknown, _post: string, _format: string, value: typeof current) => { current = structuredClone(value); },
      };
      if (name === "@/lib/social/instagram-graph") return {
        instagramConfigured: () => configured,
        instagramGraph: () => ({ account: async () => account, call: async () => ({ status_code: "PUBLISHED", permalink: "https://www.instagram.com/p/test/" }) }),
        publishInstagramImages: async (options: { beforePublish: (id: string) => Promise<void> }) => { await options.beforePublish("container-1"); calls++; if (ambiguous) throw new Error("timeout"); return { mediaId: "media-1", containerId: "container-1" }; },
      };
      if (name === "node:crypto") return { randomUUID: () => "00000000-0000-4000-8000-000000000002" };
      if (name === "sharp") return () => {};
      throw new Error(name);
    },
  });
  const url = `https://orangebrick.test/api/admin/social-posts/instagram?postId=${source.id}&format=carousel`;
  const request = (body: unknown) => new Request(url, { method: "POST", headers: { Authorization: "Bearer fixture" }, body: JSON.stringify(body) });
  assert.equal((await api.GET!(new Request(url))).status, 401);
  admin = false;
  assert.equal((await api.POST!(request({ action: "prepare", draft, confirmed: true }))).status, 403);
  admin = true;
  assert.equal((await api.POST!(request({ action: "prepare", draft, confirmed: false }))).status, 400);
  configured = false;
  assert.equal((await api.POST!(request({ action: "prepare", draft, confirmed: true }))).status, 400);
  configured = true;
  assert.equal((await api.POST!(request({ action: "prepare", draft, confirmed: true }))).status, 200);
  const tooMany = structuredClone(draft);
  for (let i = 0; i < 9; i++) tooMany.slides.splice(1, 0, { ...draft.slides[0], id: `text-${i}`, kind: "content", imageUrl: "", text: "Contexto da matéria." });
  assert.equal((await api.POST!(request({ action: "prepare", draft: tooMany, confirmed: true }))).status, 400);
  const final = { action: "publish", batchId: "00000000-0000-4000-8000-000000000002", accountId: "123", confirmed: true };
  assert.equal((await api.POST!(request({ ...final, accountId: "999" }))).status, 409);
  assert.equal(calls, 0);
  storedDraft = { ...draft, music: "Faixa sugerida" };
  assert.equal((await api.POST!(request(final))).status, 400);
  storedDraft = draft;
  ambiguous = true;
  assert.equal((await api.POST!(request(final))).status, 502);
  assert.equal((current as unknown as { status: string }).status, "unknown");
  assert.equal((await api.POST!(request(final))).status, 409);
  assert.equal(calls, 1);
  const checked = await api.POST!(request({ action: "check" }));
  assert.equal((await checked.json()).publication.status, "published");
  assert.equal((await api.POST!(request(final))).status, 409);
  current = null; ambiguous = false;
  assert.equal((await api.POST!(request(final))).status, 200);
  assert.equal((current as unknown as { status: string }).status, "published");
  assert.equal(calls, 2);
  assert.equal((await api.POST!(request({ action: "prepare", draft, confirmed: true }))).status, 409);
  assert.equal((await api.POST!(request({ action: "prepare", draft, confirmed: true, republishOf: 99 }))).status, 409);
  assert.equal((await api.POST!(request({ action: "prepare", draft, confirmed: true, republishOf: 1 }))).status, 200);
  assert.equal(storedRepublishOf, 1);
  assert.equal(calls, 2);
  assert.equal((await api.POST!(request(final))).status, 200);
  assert.equal(calls, 3);
  assert.equal((await api.POST!(request(final))).status, 409);
  assert.equal(calls, 3);
});

test("legenda publicada inclui link e créditos reais, sem instrução circular nem duplicação", async () => {
  const { generateSocialDraft, instagramPostCaption } = await import("../src/lib/social/post-plan.ts");
  const source = { id: "post", slug: "gta-vi", title: "Novas imagens de GTA VI", summary: "Jason e Lucia aparecem nas capturas oficiais.", body: "[]", image_url: "https://official.test/cover.jpg", image_alt: "Jason e Lucia em captura oficial de GTA VI.", updated_at: "now", information_status: "confirmed" as const };
  const draft = generateSocialDraft(source, "single");
  draft.slides[0].caption = "";
  assert.throws(() => instagramPostCaption(draft, "https://orangebrick.blog"), /crédito/);
  draft.slides[0].caption = "Jason e Lucia. Crédito: Rockstar Games.";
  const caption = instagramPostCaption(draft, "https://orangebrick.blog");
  assert.match(caption, /https:\/\/orangebrick.blog\/posts\/gta-vi/);
  assert.match(caption, /Imagens: Rockstar Games\./);
  assert.ok(!caption.includes("consulte as legendas dos slides"));
  draft.caption = caption;
  assert.equal(instagramPostCaption(draft, "https://orangebrick.blog"), caption);
});


test("selo usa publicação confirmada e distingue carrossel de imagem única", async () => {
  const { db } = storageFixture();
  const single = (await claimInstagramPublication(db, "post", "single", "batch", account))!;
  const carousel = (await claimInstagramPublication(db, "post", "carousel", "batch", account))!;
  assert.equal(summarizeInstagramPublications({}).status, "not_sent");
  single.status = "unknown";
  assert.equal(summarizeInstagramPublications({ single }).status, "unknown");
  carousel.status = "published";
  assert.deepEqual(summarizeInstagramPublications({ single, carousel }), { status: "published", publishedFormats: ["carousel"] });
  single.status = "published";
  assert.deepEqual(summarizeInstagramPublications({ single, carousel }).publishedFormats, ["single", "carousel"]);
});

test("lista de selos exige administrador e trata erro de histórico sem afirmar publicação", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const id = "00000000-0000-4000-8000-000000000001";
  let verified = false;
  let failed = false;
  const code = ts.transpileModule(readFileSync(new URL("../src/app/api/admin/social-posts/status/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const api: { GET?: (request: Request) => Promise<Response> } = {};
  vm.runInNewContext(code, { exports: api, process: { env: {} }, URL, Set, Promise,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (value: unknown, init: ResponseInit) => Response.json(value, init) } };
      if (name === "@/lib/auth") return { isVerifiedAdminSession: () => verified };
      if (name === "@supabase/supabase-js") return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: {} } }) }, from: () => ({ select: () => ({ in: async () => ({ data: [{ id }] }) }) }) }) };
      if (name === "@/lib/social/instagram-history") return { summarizeInstagramPublications, latestInstagramPublication: async () => { if (failed) throw new Error("offline"); return null; } };
      throw new Error(name);
    },
  });
  const url = `https://orangebrick.test/api/admin/social-posts/status?ids=${id}`;
  assert.equal((await api.GET!(new Request(url))).status, 401);
  const request = () => new Request(url, { headers: { Authorization: "Bearer fixture" } });
  assert.equal((await api.GET!(request())).status, 403);
  verified = true;
  assert.equal((await api.GET!(new Request(url.replace(id, "invalid"), { headers: { Authorization: "Bearer fixture" } }))).status, 400);
  assert.equal((await (await api.GET!(request())).json()).statuses[id].status, "not_sent");
  failed = true;
  const response = await api.GET!(request());
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await response.json()).statuses[id].status, "unavailable");
});


test("republicação exige a tentativa publicada exata e preserva o envio anterior", async () => {
  const { db, records } = storageFixture();
  const first = (await claimInstagramPublication(db, "post", "carousel", "first", account))!;
  first.status = "published";
  await saveInstagramPublication(db, "post", "carousel", first);
  assert.equal(await claimInstagramPublication(db, "post", "carousel", "duplicate", account), null);
  assert.equal(await claimInstagramPublication(db, "post", "carousel", "stale", account, 99), null);
  const claims = await Promise.all([
    claimInstagramPublication(db, "post", "carousel", "new-a", account, first.attempt),
    claimInstagramPublication(db, "post", "carousel", "new-b", account, first.attempt),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal(claims.find(Boolean)!.attempt, 2);
  assert.equal(records.size, 2);
  assert.equal(JSON.parse(records.get("instagram/post/carousel/00000001.json")!).status, "published");
  assert.equal(await claimInstagramPublication(db, "post", "carousel", "replay", account, first.attempt), null);
});
