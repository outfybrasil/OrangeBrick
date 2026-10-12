import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("publication review reads restricted editorial columns only after verified admin authentication", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const post = { id, title: "Notícia", updated_at: "2026-10-12T00:00:00Z", is_published: false };
  let allowed = true;
  const reads: string[] = [];
  const writes: string[] = [];
  const created: string[] = [];
  const compiled = ts.transpileModule(readFileSync(new URL("../src/app/api/admin/posts/publish/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { POST?: (request: Request) => Promise<Response> } = {};
  vm.runInNewContext(compiled, {
    exports: exported, Response, Request, Buffer, Date, Map, Set,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-fixture", SUPABASE_SECRET_KEY: "service-fixture" } },
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      if (name === "next/cache") return { revalidatePath: () => {} };
      if (name.includes("/auth")) return { isVerifiedAdminSession: () => allowed };
      if (name.includes("content-validation")) return { validateStoredEditorialPost: () => ["Resumo curto"] };
      if (name.includes("server/network")) return { readResponseBuffer: async (response: Response) => Buffer.from(await response.arrayBuffer()) };
      if (name.includes("manual-publication-images")) return { inspectPublicationImagesInDatabase: async (_posts: unknown, client: { key: string }) => { assert.equal(client.key, "service-fixture"); return new Map([[id, []]]); } };
      if (name === "@supabase/supabase-js") return { createClient: (_url: string, key: string, options: { global?: unknown }) => {
        created.push(key);
        if (key === "service-fixture") assert.equal(options.global, undefined);
        return {
          key,
          auth: { getUser: async () => ({ data: { user: { id: "admin" } }, error: null }) },
          from: () => ({ select: () => ({ in: async () => { reads.push(key); return key === "service-fixture" ? { data: [post], error: null } : { data: null, error: { message: "permission denied" } }; } }) }),
          rpc: async () => { writes.push(key); return { data: [post], error: null }; },
        };
      } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const request = (action: string) => new Request("https://fixture.test/api/admin/posts/publish", { method: "POST", headers: { authorization: "Bearer fixture", "content-type": "application/json" }, body: JSON.stringify({ action, ids: [id], reviewed: [{ id, updated_at: post.updated_at }] }) });
  const review = await exported.POST!(request("review"));
  assert.equal(review.status, 200);
  assert.deepEqual((await review.json()).posts[0].warnings, ["Resumo curto"]);
  const published = await exported.POST!(request("publish"));
  assert.equal(published.status, 200);
  assert.deepEqual(reads, ["service-fixture", "service-fixture"]);
  assert.deepEqual(writes, ["public-fixture"]);
  allowed = false;
  const count = created.length;
  assert.equal((await exported.POST!(request("review"))).status, 403);
  assert.equal(created.length, count + 1);
  assert.equal(reads.length, 2);
});
