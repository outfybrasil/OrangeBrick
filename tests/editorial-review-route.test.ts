import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("automatic review requires a verified admin, validates selections and starts only authorized draft jobs", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  let allowed = false;
  let queued = 0;
  const background: Array<() => Promise<void>> = [];
  const compiled = ts.transpileModule(readFileSync(new URL("../src/app/api/admin/posts/review/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { POST?: (request: Request) => Promise<Response>; GET?: (request: Request) => Promise<Response> } = {};
  vm.runInNewContext(compiled, {
    exports: exported, Request, Response, Buffer, Set,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "fixture", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture" } },
    require: (name: string) => {
      if (name === "next/server") return { after: (fn: () => Promise<void>) => background.push(fn), NextResponse: { json: Response.json } };
      if (name === "@supabase/supabase-js") return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: "admin" } }, error: null }) } }) };
      if (name.includes("/auth")) return { isVerifiedAdminSession: () => allowed };
      if (name.includes("server/network")) return { readResponseBuffer: async (response: Response) => Buffer.from(await response.arrayBuffer()) };
      if (name.includes("editorial-review-jobs")) return {
        enqueueEditorialReviews: async (ids: string[], actor: string, channel: string) => { assert.equal(ids[0], id); assert.equal(actor, "admin"); assert.equal(channel, "admin"); queued++; return [{ id: "job", post_id: id }]; },
        loadEditorialReviews: async () => [], processNextEditorialReview: async () => false,
      };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  const request = (ids: unknown) => new Request("https://fixture.test/api/admin/posts/review", { method: "POST", headers: { authorization: "Bearer fixture", "content-type": "application/json" }, body: JSON.stringify({ ids }) });
  assert.equal((await exported.POST!(request([id]))).status, 403);
  assert.equal((await exported.GET!(request([id]))).status, 403);
  assert.equal(queued, 0); assert.equal(background.length, 0);
  allowed = true;
  for (const ids of [[], [id, id], ["invalid"], Array(51).fill(id)]) assert.equal((await exported.POST!(request(ids))).status, 400);
  assert.equal(queued, 0);
  const accepted = await exported.POST!(request([id]));
  assert.equal(accepted.status, 202); assert.equal(queued, 1); assert.equal(background.length, 1);
  assert.equal(accepted.headers.get("cache-control"), "private, no-store");
});
