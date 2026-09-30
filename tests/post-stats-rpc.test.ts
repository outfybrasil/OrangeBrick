import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("aggregates post statistics beyond the PostgREST row limit", async () => {
  const database = new PGlite();

  try {
    await database.exec(`
create role anon;
create role authenticated;
create role service_role;
create table public.posts (id uuid primary key, is_published boolean not null);
create table public.reactions (id bigint generated always as identity primary key, post_id uuid not null, reaction_type text not null, device_id text not null);
create table public.post_views (id bigint generated always as identity primary key, post_id uuid not null);
create table public.comments (id bigint generated always as identity primary key, post_id uuid not null);
`);

    const migration = await readFile(new URL("../supabase/migrations/20260925000001_post_stats_rpc.sql", import.meta.url), "utf8");
    await database.exec(migration);

    const publishedId = "00000000-0000-4000-8000-000000000001";
    const unpublishedId = "00000000-0000-4000-8000-000000000002";
    const deviceId = "a".repeat(32);

    await database.query("insert into public.posts (id, is_published) values ($1, true), ($2, false)", [publishedId, unpublishedId]);
    await database.query(`
insert into public.reactions (post_id, reaction_type, device_id)
select $1, case when i % 3 = 1 then 'hype' when i % 3 = 2 then 'flop' else 'salty' end, lpad(to_hex(i), 32, '0')
from generate_series(1, 1503) as i`, [publishedId]);
    await database.query("insert into public.reactions (post_id, reaction_type, device_id) values ($1, 'hype', $2)", [publishedId, deviceId]);
    await database.query("insert into public.post_views (post_id) select $1 from generate_series(1, 1501)", [publishedId]);
    await database.query("insert into public.comments (post_id) select $1 from generate_series(1, 1201)", [publishedId]);

    const result = await database.query(
      "select * from public.get_post_stats($1::uuid[], $2::text)",
      [[publishedId, unpublishedId], deviceId],
    );

    assert.equal(result.rows.length, 1);
    const row = result.rows[0] as Record<string, unknown>;
    assert.deepEqual({
      ...row,
      hype: Number(row.hype),
      flop: Number(row.flop),
      salty: Number(row.salty),
      views: Number(row.views),
      comments: Number(row.comments),
    }, {
      post_id: publishedId,
      hype: 502,
      flop: 501,
      salty: 501,
      views: 1501,
      comments: 1201,
      user_reaction: "hype",
    });
  } finally {
    await database.close();
  }
});
