import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = (await readFile(new URL("../supabase/migrations/20260925000000_restrict_security_definer_privileges.sql", import.meta.url), "utf8"))
  .replace(/\s+/g, " ")
  .toLowerCase();

test("the admin-check helper remains executable by authenticated RLS policies", () => {
  assert.match(migration, /revoke all on function public\.current_user_is_admin\(\) from public, anon, authenticated;/);
  assert.match(migration, /grant execute on function public\.current_user_is_admin\(\) to authenticated;/);
});

test("internal moderation and retention RPCs are not callable by public roles", () => {
  assert.match(migration, /revoke all on function public\.assert_community_participation_allowed\(uuid\) from public, anon, authenticated;/);
  assert.match(migration, /grant execute on function public\.assert_community_participation_allowed\(uuid\) to authenticated;/);
  assert.match(migration, /revoke all on function public\.apply_retention_policy\(\) from public, anon, authenticated;/);
  assert.match(migration, /grant execute on function public\.apply_retention_policy\(\) to service_role;/);
});

test("public profile and leaderboard RPCs are explicitly granted to intended roles", () => {
  assert.match(migration, /revoke all on function public\.public_profile\(text\) from public, anon, authenticated;/);
  assert.match(migration, /grant execute on function public\.public_profile\(text\) to anon, authenticated;/);
  assert.match(migration, /revoke all on function public\.season_leaderboard\(text, integer\) from public, anon, authenticated;/);
  assert.match(migration, /grant execute on function public\.season_leaderboard\(text, integer\) to anon, authenticated;/);
});

test("future functions created by the migration role default to restricted execute privileges", () => {
  assert.match(migration, /alter default privileges revoke execute on functions from public;/);
  assert.match(migration, /where schema_entry\.nspname = 'public' and function_entry\.prosecdef/);
  assert.doesNotMatch(migration, /; revoke execute on functions from public, anon, authenticated;/);
});
