import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { validateStoredEditorialPost } from "../src/lib/content-validation.ts";

test("Telegram asks for confirmation, cancels without publishing and cannot bypass image blockers", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const post = { id, title: "Nintendo anuncia novos jogos", slug: "nintendo-jogos", summary: "Resumo curto", body: JSON.stringify([{ id: "image-1", type: "image", url: "https://nintendo.com/one.jpg", alt: "Arte oficial Nintendo", caption: "A imagem oficial do Nintendo Switch." }, { id: "image-2", type: "image", url: "https://nintendo.com/two.jpg", alt: "Outro ângulo Nintendo", caption: "Outra imagem oficial do console Nintendo." }]), image_url: "https://nintendo.com/cover.jpg", image_alt: "Logo oficial Nintendo", category: "industry", author_name: "Redação", created_at: "2026-10-12T00:00:00Z", updated_at: "2026-10-12T00:00:00Z", is_published: false };
  const states = new Map<string, string>();
  const messages: Array<Record<string, unknown>> = [];
  let writes = 0;
  let imageBlocked = false;
  let reviewsQueued = 0;
  type Result = { data: unknown; error: null; count: number };
  function query(table: string) {
    let key = "";
    let operation = "read";
    let values: Record<string, unknown> = {};
    const execute = async (): Promise<Result> => {
      if (table === "bot_state") {
        if (operation === "upsert") states.set(String(values.key), String(values.value));
        if (operation === "delete") states.delete(key);
        return { data: states.has(key) ? { value: states.get(key) } : null, error: null, count: 0 };
      }
      return { data: [post], error: null, count: 1 };
    };
    const chain = {
      select: () => chain,
      in: () => chain,
      eq: (column: string, value: string) => { if (column === "key") key = value; return chain; },
      maybeSingle: async () => table === "posts" ? { data: post, error: null } : execute(),
      upsert: (value: Record<string, unknown>) => { operation = "upsert"; values = value; return chain; },
      delete: () => { operation = "delete"; return chain; },
      then: <TResult1 = Result, TResult2 = never>(resolve?: ((result: Result) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((error: unknown) => TResult2 | PromiseLike<TResult2>) | null) => execute().then(resolve, reject),
    };
    return chain;
  }
  const client = { from: query, rpc: async (name: string, params: Record<string, unknown>) => {
    assert.equal(name, "telegram_publish_review");
    const key = String(params.p_review_key);
    assert(states.has(key));
    writes++;
    post.is_published = true;
    const review = JSON.parse(states.get(key)!);
    review.status = "published";
    states.set(key, JSON.stringify(review));
    return { data: [{ id }], error: null };
  } };
  const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/telegram/bot.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { handleTelegramWebhook?: (update: unknown) => Promise<void> } = {};
  vm.runInNewContext(compiled, {
    exports: exported, crypto: globalThis.crypto, console, URL, Date, AbortSignal, setTimeout,
    process: { env: { TELEGRAM_BOT_TOKEN: "fixture", TELEGRAM_ADMIN_CHAT_ID: "999", NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_SECRET_KEY: "fixture" } },
    fetch: async (_url: string, options: { body: string }) => { messages.push(JSON.parse(options.body)); return Response.json({ ok: true }); },
    require: (name: string) => {
      if (name === "@supabase/supabase-js") return { createClient: () => client };
      if (name.includes("site-url")) return { getSiteUrl: () => "https://orangebrick.blog" };
      if (name.includes("preview-token")) return { createPreviewToken: () => null };
      if (name.includes("content-validation")) return { validateStoredEditorialPost };
      if (name.includes("manual-publication-images")) return { inspectPublicationImagesInDatabase: async () => new Map([[id, imageBlocked ? ["A capa é obrigatória."] : []]]) };
      if (name.includes("editorial-review-jobs")) return { enqueueEditorialReviews: async (ids: string[], actor: string, channel: string) => { assert.equal(ids.length, 1); assert.equal(ids[0], id); assert.equal(actor, "999"); assert.equal(channel, "telegram"); reviewsQueued++; return [{ id }]; } };
      return {};
    },
  });
  const click = (data: string, actor = "999") => exported.handleTelegramWebhook!({ update_id: messages.length + 1, callback_query: { id: "fixture-callback", from: { id: actor }, message: { message_id: 1, chat: { id: "999" } }, data } });
  await click(`rev:${id}`, "other-user");
  assert.equal(reviewsQueued, 0);
  await click(`rev:${id}`);
  assert.equal(reviewsQueued, 1);
  assert.equal(writes, 0);
  const confirmation = () => {
    const message = messages.findLast(item => String(item.text || "").includes("Confirmar publicação"))!;
    const markup = message.reply_markup as { inline_keyboard: Array<Array<{ callback_data: string }>> };
    return markup.inline_keyboard[0];
  };
  await click(`pub:${id}`);
  assert.equal(writes, 0);
  assert(messages.some(item => String(item.text || "").includes("Avisos editoriais")));
  await click(confirmation()[1].callback_data);
  assert.equal(writes, 0);
  assert.equal(states.size, 0);
  imageBlocked = true;
  await click(`pub:${id}`);
  assert.equal(states.size, 0);
  assert(messages.some(item => String(item.text || "").includes("Corrija a capa")));
  imageBlocked = false;
  await click(`pub:${id}`);
  const confirm = confirmation()[0].callback_data;
  await click(confirm, "123");
  assert.equal(writes, 0);
  imageBlocked = true;
  await click(confirm);
  assert.equal(writes, 0);
  imageBlocked = false;
  await click(confirm);
  assert.equal(writes, 1);
  assert(messages.some(item => String(item.text || "").includes("matéria(s) publicada(s)")));
});
