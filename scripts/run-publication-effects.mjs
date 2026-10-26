import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://orangebrick.blog";
const NOTICE_PREFIX = "telegram:publication:";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return response.json();
}

async function queueNotice(postId) {
  const key = `${NOTICE_PREFIX}${postId}`;
  const { error } = await supabase.from("bot_state").insert({ key, value: "pending" });
  if (!error) return;
  if (error.code !== "23505") throw error;
  const { data } = await supabase.from("bot_state").select("value").eq("key", key).maybeSingle();
  if (data?.value === "cancelled") {
    await supabase.from("bot_state").update({ value: "pending", updated_at: new Date().toISOString() }).eq("key", key);
  }
}

async function deliverNotice(post) {
  const key = `${NOTICE_PREFIX}${post.id}`;
  const { data: state, error } = await supabase.from("bot_state").select("value,updated_at").eq("key", key).maybeSingle();
  if (error || !state) throw new Error(`Estado do aviso ausente para ${post.slug}.`);
  if (state.value === "sent") return "já enviado";
  const claimValue = `sending:${new Date().toISOString()}`;
  const { data: claimed } = await supabase.from("bot_state")
    .update({ value: claimValue, updated_at: new Date().toISOString() })
    .eq("key", key).eq("value", state.value).eq("updated_at", state.updated_at)
    .select("key").maybeSingle();
  if (!claimed) throw new Error(`Não foi possível reservar o aviso de ${post.slug}.`);
  const response = await telegram("sendMessage", {
    chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
    text: `✅ <b>Matéria publicada</b>\n\n${escapeHtml(post.title)}\n\n${escapeHtml(`${SITE_URL}/posts/${post.slug}`)}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  const result = response.ok ? "sent" : response.error_code >= 400 && response.error_code < 500 ? "failed" : "unknown";
  await supabase.from("bot_state").update({ value: result, updated_at: new Date().toISOString() }).eq("key", key).eq("value", claimValue);
  if (result !== "sent") throw new Error(`Telegram recusou ${post.slug}: ${response.description || result}`);
  return "enviado";
}

async function sendPush(post) {
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": "application/json" },
    body: JSON.stringify({ title: post.title, body: post.summary, url: `/posts/${post.slug}`, tag: `news-${post.slug}`, kind: "news" }),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Push ${response.status}: ${text.slice(0, 200)}`);
  return text.slice(0, 200);
}

async function dispatchReelWorker() {
  const response = await fetch(`https://api.github.com/repos/outfybrasil/OrangeBrick/actions/workflows/reel-generator.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REELS_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: "master" }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`GitHub dispatches ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return "workflow disparado";
}

async function run() {
  const { data: posts, error } = await supabase.from("posts")
    .select("id,slug,title,summary,category,image_url,is_published,published_at")
    .in("id", ["e5c0ca0c-a5a1-41f0-8876-70dc372935a5", "50866e04-53f3-415c-a25a-f7467bdded6d"])
    .order("published_at", { ascending: true });
  if (error || !posts) throw error || new Error("Matérias não encontradas.");
  if (posts.some((post) => !post.is_published)) throw new Error("Há matéria não publicada na seleção.");

  for (const post of posts) {
    const report = { slug: post.slug };
    try { await queueNotice(post.id); report.telegram_queue = "ok"; }
    catch (cause) { report.telegram_queue = `falhou: ${cause.message}`; }
    try { report.telegram = await deliverNotice(post); }
    catch (cause) { report.telegram = `falhou: ${cause.message}`; }
    try { report.push = await sendPush(post); }
    catch (cause) { report.push = `falhou: ${cause.message}`; }
    console.log(JSON.stringify(report));
  }

  const { data: jobs } = await supabase.from("reel_jobs")
    .select("id,post_id,status,created_at")
    .in("post_id", posts.map((post) => post.id))
    .in("status", ["queued", "running"]);
  console.log("REEL_JOBS", JSON.stringify(jobs));
  if (jobs?.length) {
    try { console.log("REEL_DISPATCH", await dispatchReelWorker()); }
    catch (cause) { console.log("REEL_DISPATCH", `falhou: ${cause.message}`); }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
