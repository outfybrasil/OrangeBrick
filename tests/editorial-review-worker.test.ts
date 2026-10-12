import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as crypto from "node:crypto";

test("review workers save verified corrections as drafts and leave unverifiable or changed drafts untouched", async () => {
  const current = { id: "post", title: "Original", summary: "Old", body: "[]", is_published: false, updated_at: "2026-10-12T00:00:00Z" };
  const candidate = { ...current, title: "Revised", summary: "New" };
  let stale = false;
  let uncertainty = false;
  let aiCalls = 0;
  let imageBlockers: string[] = [];
  const saved: Array<Record<string, unknown>> = [];
  const job = { id: "job", post_id: "post", expected_updated_at: current.updated_at, channel: "admin" };
  const db = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === "claim_editorial_review") return { data: [job], error: null };
      assert.equal(name, "finish_editorial_review");
      saved.push(args);
      return { data: stale ? "skipped" : args.p_status, error: null };
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { ...current, updated_at: stale ? "2026-10-12T00:01:00Z" : current.updated_at }, error: null }) }) }) }),
  };
  const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/server/editorial-review-jobs.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { processNextEditorialReview?: () => Promise<boolean> } = {};
  vm.runInNewContext(compiled, {
    exports: exported, fetch, AbortSignal, Date, Set, JSON,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "fixture", SUPABASE_SECRET_KEY: "fixture" } },
    require: (name: string) => {
      if (name === "@supabase/supabase-js") return { createClient: () => db };
      if (name === "node:crypto") return { randomUUID: () => "lock" };
      if (name.includes("gemini-news")) return { reviewNewsDraft: async () => { aiCalls++; if (uncertainty) throw new Error("A checagem factual encontrou afirmações sem comprovação."); return { post: candidate }; } };
      if (name.includes("content-validation")) return { validateStoredEditorialPost: () => [] };
      if (name.includes("manual-publication-images")) return { inspectPublicationImagesInDatabase: async () => new Map([[current.id, imageBlockers]]) };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  await exported.processNextEditorialReview!();
  assert.equal(saved[0].p_status, "completed");
  assert.equal((saved[0].p_candidate as typeof candidate).is_published, false);
  imageBlockers = ["Falta a segunda imagem interna."];
  await exported.processNextEditorialReview!();
  assert.equal(saved[1].p_status, "needs_review");
  assert.deepEqual(JSON.parse(JSON.stringify(saved[1].p_report)).remaining, imageBlockers);
  uncertainty = true;
  await exported.processNextEditorialReview!();
  assert.equal(saved[2].p_candidate, null);
  stale = true;
  const count = aiCalls;
  await exported.processNextEditorialReview!();
  assert.equal(aiCalls, count);
  assert.equal(saved[3].p_candidate, null);
});

test("the database dispatcher uses its own token and rejects missing, malformed or wrong credentials", async () => {
  const secret = "a".repeat(64);
  const hash = crypto.createHash("sha256").update(secret).digest("hex");
  let reads = 0;
  const db = { from: (table: string) => {
    assert.equal(table, "editorial_review_dispatch_auth"); reads++;
    return { select: () => ({ eq: () => ({ single: async () => ({ data: { secret_hash: hash }, error: null }) }) }) };
  } };
  const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/server/editorial-review-jobs.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { isAuthorizedEditorialDispatcher?: (request: Request) => Promise<boolean> } = {};
  vm.runInNewContext(compiled, {
    exports: exported, fetch, AbortSignal, Buffer,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "fixture", SUPABASE_SECRET_KEY: "fixture" } },
    require: (name: string) => name === "@supabase/supabase-js" ? { createClient: () => db } : name === "node:crypto" ? crypto : {},
  });
  const request = (value?: string) => new Request("https://fixture.test", { headers: value ? { authorization: `Bearer ${value}` } : {} });
  assert.equal(await exported.isAuthorizedEditorialDispatcher!(request()), false);
  assert.equal(await exported.isAuthorizedEditorialDispatcher!(request("invalid")), false);
  assert.equal(reads, 0);
  assert.equal(await exported.isAuthorizedEditorialDispatcher!(request("b".repeat(64))), false);
  assert.equal(await exported.isAuthorizedEditorialDispatcher!(request(secret)), true);
});
