import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateNewsDraft, NoFreshTopicError } from "@/lib/ai/gemini-news";
import { notifyAdmin } from "@/lib/telegram/bot";
import { getSiteUrl } from "@/lib/site-url";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { isMissingPostgrestRelation } from "@/lib/postgrest-error";
import { claimEditorialSlot, isScheduledEditorialSlot, type EditorialSlotStore } from "@/lib/server/editorial-slot";
import { editorialPublicationBlockers } from "@/lib/server/editorial-publication";
import { deliverPublicationNotice, queuePublicationNotice, retryPendingPublicationNotices } from "@/lib/server/telegram-publication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function saoPauloDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function setSlotState(supabase: ReturnType<typeof serviceClient>, key: string, value: string) {
  const { error } = await supabase
    .from("bot_state")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) {
    if (isMissingPostgrestRelation(error)) {
      console.error("bot_state indisponível no schema remoto; seguindo sem lock persistente.");
      return;
    }
    throw error;
  }
}

function editorialSlotStore(supabase: ReturnType<typeof serviceClient>): EditorialSlotStore {
  return {
    async readSlot(key) {
      const { data, error } = await supabase.from("bot_state").select("value, updated_at").eq("key", key).maybeSingle();
      if (error) throw error;
      return data;
    },
    async insertRunningSlot(key, updatedAt) {
      const { error } = await supabase.from("bot_state").insert({ key, value: "running", updated_at: updatedAt });
      if (error?.code === "23505") return false;
      if (error) throw error;
      return true;
    },
    async isPostPublished(postId) {
      const { data, error } = await supabase.from("posts").select("is_published").eq("id", postId).maybeSingle();
      if (error) throw error;
      return data?.is_published === true;
    },
    async compareAndSetSlot(key, expectedValue, expectedUpdatedAt, nextValue, nextUpdatedAt) {
      const { data, error } = await supabase
        .from("bot_state")
        .update({ value: nextValue, updated_at: nextUpdatedAt })
        .eq("key", key)
        .eq("value", expectedValue)
        .eq("updated_at", expectedUpdatedAt)
        .select("key")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slot = new URL(request.url).searchParams.get("slot");
  if (!isScheduledEditorialSlot(slot)) {
    return NextResponse.json({ error: "Horário de publicação inválido" }, { status: 400 });
  }

  const supabase = serviceClient();
  const slotKey = `scheduled-publication:${saoPauloDate(new Date())}:${slot}`;
  let slotStateTransitioned = false;

  try {
    await retryPendingPublicationNotices().catch((error) => {
      console.error("Falha ao reenviar avisos pendentes:", error);
    });
    const claimed = await claimEditorialSlot(editorialSlotStore(supabase), slotKey);
    if (!claimed) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Horário já processado ou em andamento" });
    }

    const result = await generateNewsDraft();
    const blockers = editorialPublicationBlockers(result);
    if (blockers.length > 0) {
      await setSlotState(supabase, slotKey, `draft:${result.post.id}`);
      slotStateTransitioned = true;
      await notifyAdmin(
        `⚠️ <b>Matéria mantida como rascunho</b>\n${escapeHtml(result.post.title)}\n\n${blockers.map((blocker) => `• ${escapeHtml(blocker)}`).join("\n")}`,
      );
      return NextResponse.json({ ok: true, published: false, draftId: result.post.id, blockers, wordCount: result.wordCount });
    }

    await queuePublicationNotice(result.post.id);
    await setSlotState(supabase, slotKey, `publishing:${result.post.id}`);
    const now = new Date().toISOString();
    const { data: publishedPost, error: publicationError } = await supabase.from("posts")
      .update({ is_published: true, published_at: now, updated_at: now })
      .eq("id", result.post.id).eq("is_published", false).select("id").maybeSingle();
    if (publicationError || !publishedPost) throw publicationError || new Error("Publicação não confirmada pelo banco.");
    slotStateTransitioned = true;
    await setSlotState(supabase, slotKey, `published:${result.post.id}`).catch((error) => {
      console.error("Falha ao registrar publicação do horário editorial:", error);
    });
    const postUrl = `${getSiteUrl()}/posts/${result.post.slug}`;
    const telegramNotified = await deliverPublicationNotice(result.post.id);
    if (!telegramNotified) console.error("Matéria publicada, mas o Telegram não confirmou a notificação.");
    return NextResponse.json({
      ok: true,
      published: true,
      postId: result.post.id,
      url: postUrl,
      telegramNotified,
      wordCount: result.wordCount,
    });
  } catch (error: unknown) {
    if (!slotStateTransitioned) {
      await setSlotState(supabase, slotKey, "failed").catch((stateError) => {
        console.error("Falha ao registrar estado do horário editorial:", stateError);
      });
    }
    if (error instanceof NoFreshTopicError) {
      await notifyAdmin(`📭 <b>Nenhum rascunho inédito foi gerado no horário das ${slot}h.</b>\n${escapeHtml(error.message)}`);
      return NextResponse.json({ ok: false, reason: error.message });
    }
    const message = error instanceof Error ? error.message : "Falha na geração editorial";
    console.error("Erro na geração editorial programada:", error);
    await notifyAdmin(`❌ <b>Falha na geração da matéria das ${slot}h.</b>\n<code>${escapeHtml(message.slice(0, 300))}</code>`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
