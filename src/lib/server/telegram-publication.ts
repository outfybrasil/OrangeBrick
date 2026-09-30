import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";
import { sendTelegramMessageWithRetry } from "@/lib/telegram/bot";

const NOTICE_PREFIX = "telegram:publication:";
const STALE_DELIVERY_MS = 120_000;
const ABANDONED_PUBLICATION_MS = 48 * 60 * 60 * 1000;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function noticeKey(postId: string) {
  return `${NOTICE_PREFIX}${postId}`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function queuePublicationNotice(postId: string): Promise<void> {
  const supabase = serviceClient();
  const key = noticeKey(postId);
  const { error } = await supabase.from("bot_state").insert({ key, value: "pending" });
  if (!error) return;
  if (error.code !== "23505") throw error;

  const { data: existing, error: readError } = await supabase.from("bot_state").select("value").eq("key", key).maybeSingle();
  if (readError || !existing) throw readError || new Error("Estado da notificação indisponível.");
  if (existing.value !== "cancelled") return;

  const { error: resetError } = await supabase.from("bot_state")
    .update({ value: "pending", updated_at: new Date().toISOString() })
    .eq("key", key)
    .eq("value", "cancelled");
  if (resetError) throw resetError;
}

export async function deliverPublicationNotice(postId: string): Promise<boolean> {
  const supabase = serviceClient();
  const key = noticeKey(postId);
  const { data: state, error: stateError } = await supabase.from("bot_state")
    .select("value,updated_at").eq("key", key).maybeSingle();
  if (stateError || !state) throw stateError || new Error("Aviso de publicação não foi registrado.");
  if (state.value === "sent") return true;
  if (state.value === "cancelled") return false;
  if (state.value !== "pending" && !(state.value.startsWith("sending:")
    && Date.now() - Date.parse(state.updated_at) > STALE_DELIVERY_MS)) return false;

  const { data: post, error: postError } = await supabase.from("posts")
    .select("title,slug,is_published").eq("id", postId).maybeSingle();
  if (postError) throw postError;
  if (!post?.is_published) return false;

  const claimValue = `sending:${new Date().toISOString()}`;
  const { data: claimed, error: claimError } = await supabase.from("bot_state")
    .update({ value: claimValue, updated_at: new Date().toISOString() })
    .eq("key", key)
    .eq("value", state.value)
    .eq("updated_at", state.updated_at)
    .select("key")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return false;

  const notified = await sendTelegramMessageWithRetry({
    chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
    text: `✅ <b>Matéria publicada</b>\n\n${escapeHtml(post.title)}\n\n${escapeHtml(`${getSiteUrl()}/posts/${post.slug}`)}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  const { data: saved, error: saveError } = await supabase.from("bot_state")
    .update({ value: notified ? "sent" : "pending", updated_at: new Date().toISOString() })
    .eq("key", key)
    .eq("value", claimValue)
    .select("key")
    .maybeSingle();
  if (saveError || !saved) throw saveError || new Error("Estado da notificação não foi atualizado.");
  return notified;
}

export async function retryPendingPublicationNotices(maxDeliveries = 2): Promise<number> {
  const supabase = serviceClient();
  const { data: rows, error } = await supabase.from("bot_state")
    .select("key,value,updated_at")
    .like("key", `${NOTICE_PREFIX}%`)
    .neq("value", "sent")
    .neq("value", "cancelled")
    .order("updated_at", { ascending: true })
    .limit(20);
  if (error) throw error;

  let delivered = 0;
  let attempted = 0;
  for (const row of rows || []) {
    if (attempted >= maxDeliveries) break;
    const postId = row.key.slice(NOTICE_PREFIX.length);
    const age = Date.now() - Date.parse(row.updated_at);
    const { data: post, error: postError } = await supabase.from("posts")
      .select("is_published").eq("id", postId).maybeSingle();
    if (postError) throw postError;
    if (!post?.is_published) {
      if (age > ABANDONED_PUBLICATION_MS) {
        await supabase.from("bot_state").update({ value: "cancelled", updated_at: new Date().toISOString() })
          .eq("key", row.key).eq("value", row.value);
      }
      continue;
    }
    if (row.value.startsWith("sending:") && age <= STALE_DELIVERY_MS) continue;
    attempted++;
    try {
      if (await deliverPublicationNotice(postId)) delivered++;
    } catch (cause) {
      console.error("Falha ao reenviar aviso de publicação:", cause);
    }
  }
  return delivered;
}
