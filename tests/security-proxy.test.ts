import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { User } from "@supabase/supabase-js";
import ts from "typescript";
import { isVerifiedAdminSession } from "../src/lib/auth.ts";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server");
const compiled = ts.transpileModule(readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

async function request(path: string, aal = "aal1", isAdmin = true) {
  const user: User = { id: "admin", app_metadata: { is_admin: isAdmin }, user_metadata: {}, aud: "authenticated", created_at: "2026-10-10T00:00:00Z" };
  const accessToken = `header.${Buffer.from(JSON.stringify({ sub: user.id, aal })).toString("base64url")}.signature`;
  const exported: { proxy?: (request: unknown) => Promise<Response> } = {};
  vm.runInNewContext(compiled, {
    exports: exported,
    crypto: globalThis.crypto,
    process: { env: {} },
    URL,
    Headers,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse };
      if (name === "@/lib/auth") return { isVerifiedAdminSession };
      if (name === "@/lib/i18n" || name === "@/lib/i18n/index.ts") return {
        detectLocale: () => "pt",
        LOCALE_COOKIE_NAME: "ob_locale",
      };
      if (name === "@supabase/ssr") return { createServerClient: () => ({ auth: {
        getUser: async () => ({ data: { user } }),
        getSession: async () => ({ data: { session: { access_token: accessToken } } }),
      } }) };
      throw new Error(name);
    },
  });
  return exported.proxy!(new NextRequest(`https://orangebrick.test${path}`));
}

test("requires MFA for admin pages and keeps enrollment reachable", async () => {
  const unverified = await request("/admin");
  assert.equal(unverified.status, 307);
  assert.equal(new URL(unverified.headers.get("location")!).pathname, "/admin/seguranca");
  assert.equal((await request("/admin", "aal2")).status, 200);
  assert.equal((await request("/admin/seguranca")).status, 200);
  assert.equal(new URL((await request("/admin", "aal2", false)).headers.get("location")!).pathname, "/admin/login");
});

test("blocks sensitive files and disables caching of private responses", async () => {
  for (const path of ["/.env", "/.env.local", "/.git/config", "/backups/archive.zip", "/backup.sql", "/package.json"]) {
    assert.equal((await request(path)).status, 404, path);
  }
  assert.equal((await request("/api/admin/posts")).headers.get("cache-control"), "private, no-store");
  assert.equal((await request("/admin", "aal2")).headers.get("cache-control"), "private, no-store");
  assert.equal((await request("/noticias")).status, 200);
});
