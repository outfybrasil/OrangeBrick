import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateNewsDraft, NoFreshTopicError } from "@/lib/ai/gemini-news";
import { notifyAdmin } from "@/lib/telegram/bot";
import { getSiteUrl } from "@/lib/site-url";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { isMissingPostgrestRelation } from "@/lib/postgrest-error";
import { claimEditorialSlot, isScheduledEditorialSlot, type EditorialSlotStore } from "@/lib/server/editorial-slot";
import { editorialPublicationBlockers } from "@/lib/server/editorial-publication";
import { inspectPublicationImagesInDatabase } from "@/lib/server/manual-publication-images";
import { queuePublicationNotice, retryPendingPublicationNotices } from "@/lib/server/telegram-publication";
import { refreshPublishedPages, runPostPublicationEffects } from "@/lib/server/publication-effects";
import { buildCoverAbsenceTelegramMessage } from "@/lib/editorial-cover";

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
  const { data, error } = await supabase
    .from("bot_state")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key)
    .select("key")
    .maybeSingle();
  if (error) {
    if (isMissingPostgrestRelation(error)) {
      throw new Error("bot_state indisponível; publicação editorial bloqueada sem lock persistente.");
    }
    throw error;
  }
  if (!data) throw new Error("Lock editorial indisponível; publicação bloqueada.");
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

async function claimFailedRetry(supabase: ReturnType<typeof serviceClient>, slotKey: string): Promise<boolean> {
  const store = editorialSlotStore(supabase);
  const existing = await store.readSlot(slotKey);
  if (existing?.value !== "failed") return false;

  const retryKey = slotKey.replace("scheduled-publication:", "scheduled-publication-retry:");
  const { error } = await supabase.from("bot_state").insert({ key: retryKey, value: "claimed", updated_at: new Date().toISOString() });
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

function safeDiagnosticMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/((?:api[_-]?key|key|secret|token)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[redacted]")
    .replace(/\bsb_secret_[A-Za-z0-9_-]+\b/gi, "[redacted]")
    .replace(/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/g, "[redacted]")
    .slice(0, 500);
}

async function recordEditorialDiagnostic(
  supabase: ReturnType<typeof serviceClient>,
  source: string,
  message: string,
  slot: string,
  reference: string,
) {
  const { error } = await supabase.rpc("record_app_error", {
    target_source: source,
    target_message: safeDiagnosticMessage(message),
    target_route: `/api/cron/generate-daily?slot=${slot}`,
    target_reference: reference,
    target_metadata: { slot },
  }).abortSignal(AbortSignal.timeout(3_000));
  if (error) console.error("Falha ao registrar diagnóstico editorial:", error.code);
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
  const date = saoPauloDate(new Date());
  const slotKey = `scheduled-publication:${date}:${slot}`;
  const retryFailedOnly = new URL(request.url).searchParams.get("retry_failed") === "1";
  let generatedPostId: string | null = null;

  try {
    if (retryFailedOnly && !(await claimFailedRetry(supabase, slotKey))) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Não há falha elegível para nova tentativa." });
    }

    await retryPendingPublicationNotices().catch((error) => {
      console.error("Falha ao reenviar avisos pendentes:", error);
    });
    const claimed = await claimEditorialSlot(editorialSlotStore(supabase), slotKey);
    if (!claimed) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Horário já processado ou em andamento" });
    }

    const result = await generateNewsDraft();
    generatedPostId = result.post.id;
    await setSlotState(supabase, slotKey, `draft:${generatedPostId}`);
    const imageChecks = await inspectPublicationImagesInDatabase([result.post], supabase);
    const blockers = [...new Set([...editorialPublicationBlockers(result), ...(imageChecks.get(result.post.id) || [])])];
    if (blockers.length > 0) {
      await recordEditorialDiagnostic(supabase, "scheduled-publication-draft", blockers.join(" | "), slot, result.post.id);
      const isCoverBlocker =
        !result.post.image_url?.trim() ||
        blockers.some((b) => b.toLowerCase().includes("capa"));

      if (isCoverBlocker) {
        await notifyAdmin(buildCoverAbsenceTelegramMessage(slot));
      } else {
        await notifyAdmin(
          `⚠️ <b>Matéria mantida como rascunho</b>\n${escapeHtml(result.post.title)}\n\n${blockers.map((blocker) => `• ${escapeHtml(blocker)}`).join("\n")}`,
        );
      }
      return NextResponse.json({ ok: true, published: false, draftId: result.post.id, blockers, wordCount: result.wordCount });
    }

    await queuePublicationNotice(result.post.id);
    await setSlotState(supabase, slotKey, `publishing:${result.post.id}`);
    const now = new Date().toISOString();
    const { data: publishedPost, error: publicationError } = await supabase.from("posts")
      .update({ is_published: true, published_at: now, updated_at: now })
      .eq("id", result.post.id).eq("is_published", false).select("id").maybeSingle();
    if (publicationError || !publishedPost) throw publicationError || new Error("Publicação não confirmada pelo banco.");
    await setSlotState(supabase, slotKey, `published:${result.post.id}`).catch((error) => {
      console.error("Falha ao registrar publicação do horário editorial:", error);
    });
    const postUrl = `${getSiteUrl()}/posts/${result.post.slug}`;
    refreshPublishedPages();
    const effects = await runPostPublicationEffects(supabase, result.post, { deliverNotice: true, reel: true, push: true });
    if (effects.failures.length) console.error(`Efeitos pós-publicação de ${result.post.slug}:`, effects.failures.join(" | "));
    return NextResponse.json({
      ok: true,
      published: true,
      postId: result.post.id,
      url: postUrl,
      telegramNotified: effects.telegramNotified,
      reelQueued: effects.reelQueued,
      wordCount: result.wordCount,
    });
  } catch (error: unknown) {
    if (generatedPostId) {
      const published = await editorialSlotStore(supabase).isPostPublished(generatedPostId).catch(() => false);
      await setSlotState(supabase, slotKey, `${published ? "published" : "draft"}:${generatedPostId}`).catch((stateError) => {
        console.error("Falha ao preservar estado da matéria gerada:", stateError);
      });
    } else {
      await setSlotState(supabase, slotKey, "failed").catch((stateError) => {
        console.error("Falha ao registrar estado do horário editorial:", stateError);
      });
    }
    if (error instanceof NoFreshTopicError) {
      const safeMessage = safeDiagnosticMessage(error.message);
      await recordEditorialDiagnostic(supabase, "scheduled-publication-failed", safeMessage, slot, slotKey);
      await notifyAdmin(`📭 <b>Nenhum rascunho inédito foi gerado no horário das ${slot}h.</b>\n${escapeHtml(safeMessage)}`);
      return NextResponse.json({ ok: false, reason: safeMessage });
    }
    const message = error instanceof Error ? error.message : "Falha na geração editorial";
    const safeMessage = safeDiagnosticMessage(message);
    console.error("Erro na geração editorial programada:", safeMessage);
    await recordEditorialDiagnostic(supabase, "scheduled-publication-failed", safeMessage, slot, generatedPostId || slotKey);
    await notifyAdmin(`❌ <b>Falha na geração da matéria das ${slot}h.</b>\n<code>${escapeHtml(safeMessage.slice(0, 300))}</code>`);
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
