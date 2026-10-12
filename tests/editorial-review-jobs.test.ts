import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const token = "00000000-0000-4000-8000-000000000003";

async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    grant usage on schema auth to anon,authenticated,service_role;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
    create table public.posts(id uuid primary key,slug text,title text,summary text,body text,image_url text,image_alt text,
      is_published boolean not null default false,published_at timestamptz,archived_at timestamptz,updated_at timestamptz not null default now(),
      scheduled_at timestamptz,scheduled_by uuid,information_status text,featured_quote jsonb,editorial_sources jsonb,short_article_reason text);
    grant all on public.posts to service_role;
    insert into public.posts(id,slug,title,summary,body,scheduled_at) values('${first}','original-slug','Original','Resumo','[]',now()),('${second}','second-slug','Second','Resumo','[]',now());`);
  await db.exec(await readFile(new URL("../supabase/migrations/20261012025845_editorial_review_jobs.sql", import.meta.url), "utf8"));
  await db.exec(`select set_config('request.jwt.claims','{"role":"service_role"}',false);set role service_role;`);
  return db;
}

test("the review queue is private, deduplicates requests and permits only one worker", async () => {
  const db = await fixture();
  try {
    const jobs = await db.query<{ id: string }>("select * from enqueue_editorial_reviews($1::uuid[],'admin','admin')", [[first, second]]);
    assert.equal(jobs.rows.length, 2);
    assert.equal((await db.query<{ scheduled_at: unknown }>("select scheduled_at from posts where id=$1", [first])).rows[0].scheduled_at, null);
    const duplicate = await db.query<{ id: string }>("select * from enqueue_editorial_reviews($1::uuid[],'admin','admin')", [[first]]);
    assert.equal(duplicate.rows[0].id, jobs.rows[0].id);
    const claimed = await db.query<{ id: string; post_id: string }>("select * from claim_editorial_review($1)", [token]);
    assert.equal(claimed.rows[0].post_id, first);
    assert.equal((await db.query("select * from claim_editorial_review($1)", [second])).rows.length, 0);
    await db.exec("reset role;set role authenticated");
    await assert.rejects(db.query("select * from editorial_review_jobs"), /permission denied/);
    await assert.rejects(db.query("select * from enqueue_editorial_reviews($1::uuid[],'admin','admin')", [[first]]), /permission denied/);
    await db.exec("reset role;set role anon");
    await assert.rejects(db.query("select * from claim_editorial_review($1)", [token]), /permission denied/);
  } finally { await db.close(); }
});

test("review results preserve identity and publication state, clear scheduling and reject changed drafts", async () => {
  const db = await fixture();
  try {
    await db.query("select * from enqueue_editorial_reviews($1::uuid[],'admin','admin')", [[first, second]]);
    const job = (await db.query<{ id: string }>("select * from claim_editorial_review($1)", [token])).rows[0];
    const candidate = { id: first, slug: "changed-slug", is_published: false, title: "Revised", summary: "New summary", body: "[]", image_url: null, image_alt: "", information_status: "developing", featured_quote: { absence_registered: true }, editorial_sources: [], short_article_reason: "Cobertura focada em um anúncio breve." };
    await assert.rejects(db.query("select finish_editorial_review($1,$2,$3::jsonb,'{}','completed')", [job.id, second, JSON.stringify(candidate)]), /Outra revisão/);
    await assert.rejects(db.query("select finish_editorial_review($1,$2,$3::jsonb,'{}','completed')", [job.id, token, JSON.stringify({ ...candidate, is_published: true })]), /mesmo rascunho/);
    await db.query("select finish_editorial_review($1,$2,$3::jsonb,'{}','needs_review')", [job.id, token, JSON.stringify(candidate)]);
    const post = (await db.query<{ title: string; slug: string; is_published: boolean; scheduled_at: unknown }>("select * from posts where id=$1", [first])).rows[0];
    assert.equal(post.title, "Revised"); assert.equal(post.slug, "original-slug"); assert.equal(post.is_published, false); assert.equal(post.scheduled_at, null);
    const next = (await db.query<{ id: string }>("select * from claim_editorial_review($1)", [token])).rows[0];
    await db.query("update posts set title='Human edit',updated_at=clock_timestamp() where id=$1", [second]);
    const result = await db.query<{ status: string }>("select finish_editorial_review($1,$2,$3::jsonb,'{}','completed') as status", [next.id, token, JSON.stringify({ ...candidate, id: second })]);
    assert.equal(result.rows[0].status, "skipped");
    assert.equal((await db.query<{ title: string }>("select title from posts where id=$1", [second])).rows[0].title, "Human edit");
  } finally { await db.close(); }
});

test("an expired worker cannot save and abandoned tasks are retried at most twice", async () => {
  const db = await fixture();
  try {
    await db.query("select * from enqueue_editorial_reviews($1::uuid[],'999','telegram')", [[first]]);
    const job = (await db.query<{ id: string }>("select * from claim_editorial_review($1)", [token])).rows[0];
    await db.exec("update editorial_review_jobs set lease_until=now()-interval '1 minute'");
    await assert.rejects(db.query("select finish_editorial_review($1,$2,null,'{}','failed')", [job.id, token]), /Outra revisão/);
    const retry = await db.query<{ attempts: number }>("select * from claim_editorial_review($1)", [second]);
    assert.equal(retry.rows[0].attempts, 2);
    await db.exec("update editorial_review_jobs set lease_until=now()-interval '1 minute'");
    assert.equal((await db.query("select * from claim_editorial_review($1)", [token])).rows.length, 0);
    assert.equal((await db.query<{ status: string }>("select status from editorial_review_jobs")).rows[0].status, "failed");
  } finally { await db.close(); }
});
