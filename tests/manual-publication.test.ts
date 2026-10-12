import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { publishedPostCursorFilter } from "../src/lib/news-query.ts";

const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const third = "00000000-0000-4000-8000-000000000003";
const fourth = "00000000-0000-4000-8000-000000000004";
const updated = "2026-10-10T12:00:00Z";

function articleImages(prefix: string) {
  return JSON.stringify([
    { id: "text", type: "text", content: "Texto curto com pendências editoriais." },
    { id: "image-1", type: "image", url: `https://playstation.com/${prefix}-1.jpg`, alt: "Arte oficial do jogo", caption: "Imagem oficial do jogo em anúncio." },
    { id: "image-2", type: "image", url: `https://playstation.com/${prefix}-2.jpg`, alt: "Cena oficial do jogo", caption: "Outro ângulo oficial do jogo." },
  ]);
}

async function databaseFixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    grant usage on schema auth to anon, authenticated, service_role;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub', '')::uuid $$;
    create function public.current_user_is_admin() returns boolean language sql stable as $$
      select coalesce(auth.jwt()->>'role' = 'service_role', false) or (coalesce((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) and auth.jwt()->>'aal' = 'aal2')
    $$;
    create table public.posts (
      id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
      summary text not null default '', body text not null default '[]', category text not null default 'industry',
      image_url text, image_alt text, author_name text not null default 'Redação', author_tag text, topic_id uuid,
      information_status text not null default 'confirmed', featured_quote jsonb, editorial_sources jsonb default '[]',
      short_article_reason text, correction_note text, is_published boolean not null default false,
      published_at timestamptz, updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
      scheduled_at timestamptz, scheduled_by uuid
    );
    create table public.bot_state (key text primary key, value text not null, updated_at timestamptz not null default now());
    grant all on public.bot_state to service_role;
    alter table public.posts enable row level security;
    grant all on public.posts to authenticated, service_role;
    create policy admin_write on public.posts for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/20260924000002_post_editorial_gate_fields.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20261011234239_manual_batch_publication.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20261012000650_telegram_image_publication.sql", import.meta.url), "utf8"));
  for (const [index, id] of [first, second, third, fourth].entries()) {
    await db.query("insert into posts (id,slug,title,body,updated_at,created_at,scheduled_at,scheduled_by,image_url,image_alt) values ($1,$2,$3,$6,$4,$5,now(),$1,$7,'Arte oficial do jogo')", [id, `post-${index}`, `Draft ${index}`, updated, `2026-10-${10 - index}T12:00:00Z`, articleImages(id), `https://playstation.com/${id}-cover.jpg`]);
  }
  return db;
}

async function authenticate(db: PGlite, role = "authenticated", admin = true, aal = "aal2") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: role === "service_role" ? undefined : first, role, app_metadata: { is_admin: admin }, aal })]);
  await db.exec(`set role ${role}`);
}

async function publish(db: PGlite, ids: string[], versions: string[] = ids.map(() => updated)) {
  return db.query<{ id: string; published_at: string }>("select * from public.admin_publish_posts($1::uuid[], $2::timestamptz[])", [ids, versions]);
}

test("manual batch publication overrides editorial warnings, preserves selection order and clears scheduling", async () => {
  const db = await databaseFixture();
  try {
    await authenticate(db);
    const result = await publish(db, [second, first]);
    assert.deepEqual(result.rows.map((post) => post.id), [second, first]);
    assert.ok(new Date(result.rows[1].published_at).getTime() > new Date(result.rows[0].published_at).getTime());
    const latest = await db.query<{ id: string; scheduled_at: unknown; scheduled_by: unknown }>("select id,scheduled_at,scheduled_by from posts where is_published order by published_at desc, id desc");
    assert.deepEqual(latest.rows.map((post) => post.id), [first, second]);
    assert.ok(latest.rows.every((post) => post.scheduled_at === null && post.scheduled_by === null));
    await assert.rejects(publish(db, [first]), /alterada ou publicada/);
    await assert.rejects(db.query("update posts set is_published=true where id=$1", [third]), /corpo|Corpo|resumo|Resumo/);
  } finally { await db.close(); }
});

test("a stale review rolls back the whole batch and unauthorized callers cannot override quality", async () => {
  const db = await databaseFixture();
  try {
    await authenticate(db);
    await db.query("update posts set updated_at=now() where id=$1", [second]);
    await assert.rejects(publish(db, [first, second]), /alterada ou publicada/);
    const firstRow = await db.query<{ is_published: boolean }>("select is_published from posts where id=$1", [first]);
    assert.equal(firstRow.rows[0].is_published, false);
    await assert.rejects(publish(db, [first, first]), /distintas/);
    await authenticate(db, "authenticated", true, "aal1");
    await assert.rejects(publish(db, [first]), /dois fatores/);
    await authenticate(db, "authenticated", false, "aal2");
    await assert.rejects(publish(db, [first]), /dois fatores/);
    await authenticate(db, "service_role");
    await assert.rejects(publish(db, [first]), /permission denied/);
    await assert.rejects(db.query("update posts set is_published=true where id=$1", [third]), /corpo|Corpo|resumo|Resumo/);
  } finally { await db.close(); }
});

test("editor publication accepts warnings but preserves original publication dates and checks revisions", async () => {
  const db = await databaseFixture();
  try {
    await authenticate(db);
    const data = { slug: "editor-post", title: "Editor post", summary: "Short", body: articleImages("editor"), image_url: "https://playstation.com/editor-cover.jpg", image_alt: "Arte oficial do jogo", category: "industry", author_name: "Editor", information_status: "confirmed", editorial_sources: [], is_published: true };
    const saved = await db.query<{ id: string; published_at: string; updated_at: string }>("select id,published_at::text as published_at,updated_at::text as updated_at from admin_save_editorial_post(null, $1::jsonb)", [JSON.stringify(data)]);
    assert.equal(saved.rows.length, 1);
    const original = saved.rows[0];
    const edited = await db.query<{ published_at: string }>("select id,published_at::text as published_at,updated_at::text as updated_at from admin_save_editorial_post($1,$2::jsonb)", [original.id, JSON.stringify({ ...data, title: "Edited", expected_updated_at: original.updated_at })]);
    assert.equal(edited.rows[0].published_at, original.published_at);
    await assert.rejects(db.query("select id,published_at::text as published_at,updated_at::text as updated_at from admin_save_editorial_post($1,$2::jsonb)", [original.id, JSON.stringify({ ...data, expected_updated_at: updated })]), /alterada por outra pessoa/);
  } finally { await db.close(); }
});

test("publication cursors preserve timestamp ties and include legacy rows without a publication date", () => {
  assert.equal(publishedPostCursorFilter({ id: first, published_at: updated }), `published_at.lt.${updated},and(published_at.eq.${updated},id.lt.${first}),published_at.is.null`);
  assert.equal(publishedPostCursorFilter({ id: first, published_at: null }), `and(published_at.is.null,id.lt.${first})`);
  assert.throws(() => publishedPostCursorFilter({ id: "x,or", published_at: updated }), /Cursor inválido/);
});

test("images remain mandatory even after manual confirmation in ADM", async () => {
  const db = await databaseFixture();
  try {
    await authenticate(db);
    await db.query("update posts set image_url=null where id=$1", [second]);
    await assert.rejects(publish(db, [first, second]), /capa/);
    const rows = await db.query<{ is_published: boolean }>("select is_published from posts where id=$1", [first]);
    assert.equal(rows.rows[0].is_published, false);
    await db.query("update posts set body='[]' where id=$1", [third]);
    await assert.rejects(publish(db, [third]), /duas imagens/);
  } finally { await db.close(); }
});

test("Telegram receipts allow text warnings, are idempotent and preserve selection order", async () => {
  const db = await databaseFixture();
  try {
    await authenticate(db, "service_role");
    await db.query("select telegram_toggle_publication_selection('999',$1)", [second]);
    await db.query("select telegram_toggle_publication_selection('999',$1)", [first]);
    const key = "telegram:publish-review:00000000-0000-4000-8000-000000000099";
    const review = { actor_id: "999", status: "pending", images_verified: true, expires_at: "2099-01-01T00:00:00Z", posts: [second, first].map(id => ({ id, updated_at: updated })) };
    await db.query("insert into bot_state (key,value) values ($1,$2)", [key, JSON.stringify(review)]);
    const published = await db.query<{ result: Array<{ id: string; published_at: string }> }>("select telegram_publish_review($1,'999') as result", [key]);
    assert.deepEqual(published.rows[0].result.map(post => post.id), [second, first]);
    assert.ok(Date.parse(published.rows[0].result[1].published_at) > Date.parse(published.rows[0].result[0].published_at));
    const repeated = await db.query("select telegram_publish_review($1,'999') as result", [key]);
    assert.deepEqual(repeated.rows, published.rows);
    const selection = await db.query<{ value: string }>("select value from bot_state where key='telegram:publish-selection:999'");
    assert.equal(selection.rows[0].value, "[]");
    await assert.rejects(db.query("select telegram_publish_review($1,'123')", [key]), /não autorizado/);
    await authenticate(db);
    await assert.rejects(db.query("select telegram_publish_review($1,'999')", [key]), /permission denied/);
  } finally { await db.close(); }
});

test("Telegram image failures roll back the entire batch and cancelled receipts cannot publish", async () => {
  const db = await databaseFixture();
  try {
    await db.query("update posts set body='[]' where id=$1", [second]);
    await authenticate(db, "service_role");
    const key = "telegram:publish-review:00000000-0000-4000-8000-000000000099";
    const review = { actor_id: "999", status: "pending", images_verified: true, expires_at: "2099-01-01T00:00:00Z", posts: [first, second].map(id => ({ id, updated_at: updated })) };
    await db.query("insert into bot_state (key,value) values ($1,$2)", [key, JSON.stringify(review)]);
    await assert.rejects(db.query("select telegram_publish_review($1,'999')", [key]), /duas imagens/);
    const post = await db.query<{ is_published: boolean }>("select is_published from posts where id=$1", [first]);
    assert.equal(post.rows[0].is_published, false);
    await db.query("delete from bot_state where key=$1", [key]);
    await assert.rejects(db.query("select telegram_publish_review($1,'999')", [key]), /cancelada/);
  } finally { await db.close(); }
});
