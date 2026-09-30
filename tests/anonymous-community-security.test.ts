import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const communityTables = [
  "community_posts",
  "community_reactions",
  "community_comments",
  "community_poll_votes",
  "community_comment_likes",
  "community_reports",
  "community_notes",
  "community_note_votes",
  "comments",
  "article_comment_likes",
  "game_clubs",
  "game_club_members",
];

test("blocks anonymous authenticated users from community writes while preserving regular users", async () => {
  const database = new PGlite();

  try {
    await database.exec(`
create role anon;
create role authenticated;
create schema auth;
grant usage on schema auth to anon, authenticated;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
grant execute on all functions in schema auth to anon, authenticated;
create table public.profiles (id uuid primary key, community_banned boolean not null default false, community_suspended_until timestamptz, community_moderation_reason text);
create function public.current_user_is_admin() returns boolean language sql stable as $$ select false $$;
`);

    for (const table of communityTables) {
      const reportColumns = table === "community_reports" ? ", reporter_id uuid, content_type text, content_id uuid, reason text, status text" : "";
      await database.exec(`create table public.${table} (user_id uuid${reportColumns}); alter table public.${table} enable row level security; grant all on public.${table} to authenticated; create policy authenticated_access on public.${table} for all to authenticated using (true) with check (true);`);
    }

    const migration = await readFile(new URL("../supabase/migrations/20260929000000_restrict_anonymous_community.sql", import.meta.url), "utf8");
    await database.exec(migration);

    const anonymousId = "00000000-0000-4000-8000-000000000001";
    await database.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: anonymousId, role: "authenticated", is_anonymous: true })]);
    await database.exec("set role authenticated");

    for (const table of communityTables) {
      await assert.rejects(database.query(`insert into public.${table} (user_id) values ($1)`, [anonymousId]));
    }
    await assert.rejects(database.query("select public.assert_community_participation_allowed($1::uuid)", [anonymousId]), /Contas anônimas/);
    await assert.rejects(database.query("select public.report_community_content('post', $1::uuid)", [anonymousId]), /Contas anônimas/);

    await database.exec("reset role");
    const humanId = "00000000-0000-4000-8000-000000000002";
    await database.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: humanId, role: "authenticated", is_anonymous: false })]);
    await database.exec("set role authenticated");

    for (const table of communityTables) {
      await database.query(`insert into public.${table} (user_id) values ($1)`, [humanId]);
    }
  } finally {
    await database.close();
  }
});
