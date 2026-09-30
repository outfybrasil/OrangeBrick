import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("returns complete poll totals without exposing individual votes", async () => {
  const database = new PGlite();
  try {
    await database.exec(`
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.community_poll_votes (
  poll_id uuid not null,
  user_id uuid not null,
  option_index integer not null
);
`);

    const migration = await readFile(new URL("../supabase/migrations/20260930000000_community_poll_results.sql", import.meta.url), "utf8");
    await database.exec(migration);
    const pollId = "00000000-0000-4000-8000-000000000001";
    await database.query(`
insert into public.community_poll_votes(poll_id, user_id, option_index)
select $1, ('00000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid, i % 2
from generate_series(1, 1503) i
`, [pollId]);

    await database.exec("set role anon");
    const anonymous = await database.query("select public.community_poll_results($1::uuid) as result", [pollId]);
    assert.deepEqual(anonymous.rows[0], {
      result: { counts: { "0": 751, "1": 752 }, total_votes: 1503, user_voted_option: null },
    });
    await assert.rejects(database.query("select * from public.community_poll_votes"), /permission denied/);

    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.sub', $1, false)", ["00000000-0000-4000-8000-000000000001"]);
    await database.exec("set role authenticated");
    const authenticated = await database.query("select public.community_poll_results($1::uuid) as result", [pollId]);
    assert.deepEqual(authenticated.rows[0], {
      result: { counts: { "0": 751, "1": 752 }, total_votes: 1503, user_voted_option: 1 },
    });
  } finally {
    await database.close();
  }
});
