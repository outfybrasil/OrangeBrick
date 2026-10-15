import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { audiencePath } from "../src/lib/audience.ts";

test("audience paths exclude credentials, admin, queries and profile identifiers", () => {
  assert.equal(audiencePath("/"), "/");
  assert.equal(audiencePath("/posts/gta-vi"), "/posts/gta-vi");
  assert.equal(audiencePath("/u/private-name"), "/perfil");
  for (const path of ["/admin", "/profile/setup", "/admin/metricas", "/entrar", "/nova-senha", "/busca?q=secret", "/posts/a?token=secret", "/api/audience"]) assert.equal(audiencePath(path), null);
});

test("aggregates preserve daily totals, unique visitors, empty days and service-only permissions", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role; create table posts(id uuid primary key,title text,slug text); create table post_views(post_id uuid,device_id text,viewed_at timestamptz); create table reactions(post_id uuid,created_at timestamptz); create table comments(post_id uuid,created_at timestamptz);");
    await db.exec(await readFile(new URL("../supabase/migrations/20261015164011_admin_audience_metrics.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/20261015164231_audience_pageviews.sql", import.meta.url), "utf8"));
    await db.exec("insert into posts values ('00000000-0000-0000-0000-000000000001','Example','example'); insert into post_views values ('00000000-0000-0000-0000-000000000001','same-device',now()),('00000000-0000-0000-0000-000000000001','another-device',now()),('00000000-0000-0000-0000-000000000001','old-device',now()-interval '100 days'); insert into reactions values ('00000000-0000-0000-0000-000000000001',now()); insert into comments values ('00000000-0000-0000-0000-000000000001',now()); insert into audience_pageviews values ('00000000-0000-0000-0000-000000000011','/',repeat('a',64),now()),('00000000-0000-0000-0000-000000000012','/noticias',repeat('a',64),now()),('00000000-0000-0000-0000-000000000013','/',repeat('b',64),now());");
    const { rows: [row] } = await db.query<{ article: { views: number; readers: number; reactions: number; comments: number; daily: { views: number }[] }; site: { visitors: number; pageviews: number; daily: { views: number }[]; pages: { path: string; views: number }[] } }>("select admin_audience_metrics(7) article, admin_site_metrics(7) site");
    assert.equal(row.article.views, 2);
    assert.equal(row.article.readers, 2);
    assert.equal(row.article.reactions + row.article.comments, 2);
    assert.equal(row.article.daily.length, 7);
    assert.equal(row.site.visitors, 2);
    assert.equal(row.site.pageviews, 3);
    assert.equal(row.site.daily.reduce((total, day) => total + day.views, 0), 3);
    assert.deepEqual(row.site.pages[0], { path: "/", views: 2 });
    const { rows: [permissions] } = await db.query("select has_function_privilege('anon','admin_site_metrics(integer)','execute') anon, has_function_privilege('authenticated','admin_audience_metrics(integer)','execute') member, has_function_privilege('service_role','admin_site_metrics(integer)','execute') service");
    assert.deepEqual(permissions, { anon: false, member: false, service: true });
    await assert.rejects(db.query("select admin_site_metrics(365)"), /Invalid period/);
  } finally { await db.close(); }
});
