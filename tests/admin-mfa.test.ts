import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "../src/lib/auth.ts";

const admin: User = { id: "admin-user", app_metadata: { is_admin: true }, user_metadata: {}, aud: "authenticated", created_at: "2026-10-10T00:00:00Z" };
function token(sub: string, aal: string) {
  return `header.${Buffer.from(JSON.stringify({ sub, aal })).toString("base64url")}.signature`;
}

test("requires a verified admin user and an AAL2 token for the same user", () => {
  assert.equal(isVerifiedAdminSession(admin, token(admin.id, "aal2")), true);
  assert.equal(isVerifiedAdminSession(admin, token(admin.id, "aal1")), false);
  assert.equal(isVerifiedAdminSession(admin, token("other-user", "aal2")), false);
  assert.equal(isVerifiedAdminSession(null, token(admin.id, "aal2")), false);
  assert.equal(isVerifiedAdminSession({ ...admin, app_metadata: {}, user_metadata: { is_admin: true } }, token(admin.id, "aal2")), false);
});

test("rejects missing and malformed assurance claims", () => {
  for (const value of ["", "invalid", "header.invalid.signature", token(admin.id, ""), token(admin.id, "aal3")]) {
    assert.equal(isVerifiedAdminSession(admin, value), false);
  }
});

test("enforces MFA in Postgres even when an administrator bypasses the site APIs", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { readFile } = await import("node:fs/promises");
  const database = new PGlite();
  try {
    await database.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      grant usage on schema auth to anon, authenticated, service_role;
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
      $$;
      grant execute on function auth.jwt() to anon, authenticated, service_role;
      create table public.admin_test_items (id integer primary key);
      alter table public.admin_test_items enable row level security;
      grant all on public.admin_test_items to authenticated;
      create policy authenticated_access on public.admin_test_items for all to authenticated using (true) with check (true);
      insert into public.admin_test_items values (1);
    `);
    await database.exec(await readFile(new URL("../supabase/migrations/20261010021625_admin_mfa_security.sql", import.meta.url), "utf8"));
    for (const [isAdmin, aal, allowed] of [[true, "aal1", false], [true, "aal2", true], [false, "aal1", true]] as const) {
      await database.exec("reset role");
      await database.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ role: "authenticated", aal, app_metadata: { is_admin: isAdmin } })]);
      await database.exec("set role authenticated");
      const rows = await database.query("select * from public.admin_test_items");
      assert.equal(rows.rows.length, allowed ? 1 : 0, `${isAdmin}/${aal}`);
      const permission = await database.query<{ allowed: boolean }>("select public.current_user_is_admin() as allowed");
      assert.equal(permission.rows[0].allowed, isAdmin && aal === "aal2");
      if (!allowed) {
        await assert.rejects(database.exec("insert into public.admin_test_items values (2)"), /row-level security/);
        const updated = await database.query("update public.admin_test_items set id = 3 returning id");
        assert.equal(updated.rows.length, 0);
        const deleted = await database.query("delete from public.admin_test_items returning id");
        assert.equal(deleted.rows.length, 0);
      }
    }
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ role: "service_role" })]);
    await database.exec("set role service_role");
    const permission = await database.query<{ allowed: boolean }>("select public.current_user_is_admin() as allowed");
    assert.equal(permission.rows[0].allowed, true);
  } finally { await database.close(); }
});
