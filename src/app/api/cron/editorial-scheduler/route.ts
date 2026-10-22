import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyAdmin } from "@/lib/telegram/bot";
import { validateStoredEditorialPost } from "@/lib/content-validation";
import type { Post } from "@/lib/types/database";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { queuePublicationNotice, retryPendingPublicationNotices } from "@/lib/server/telegram-publication";
import { inspectPublicationImagesInDatabase } from "@/lib/server/manual-publication-images";
import { refreshPublishedPages, runPostPublicationEffects } from "@/lib/server/publication-effects";

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

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&" + "amp;").replace(/</g, "&" + "lt;").replace(/>/g, "&" + "gt;");
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = serviceClient();
  const now = new Date().toISOString();

  try {
    await retryPendingPublicationNotices().catch((error) => {
      console.error("Falha ao reenviar avisos pendentes:", error);
    });
    const { data: scheduledPosts, error: loadError } = await supabase
      .from("posts")
      .select("*")
      .eq("is_published", false)
      .is("archived_at", null)
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now);

    if (loadError) {
      console.error("Falha ao carregar matérias agendadas:", loadError.message);
      await notifyAdmin(`⚠️ <b>Scheduler não conseguiu carregar os agendamentos.</b>\n<code>${escapeHtml(loadError.message.slice(0, 200))}</code>`).catch(() => {});
      return NextResponse.json({ error: "Falha ao carregar matérias agendadas" }, { status: 500 });
    }

    const published: string[] = [];
    const failures: { id: string; error: string }[] = [];

    for (const post of scheduledPosts || []) {
      const validationErrors = [...validateStoredEditorialPost(post as Post), ...((await inspectPublicationImagesInDatabase([post as Post], supabase)).get(post.id) || [])];
      if (validationErrors.length > 0) {
        const { error: unscheduleError } = await supabase
          .from("posts")
          .update({ scheduled_at: null, scheduled_by: null, updated_at: now })
          .eq("id", post.id);
        failures.push({
          id: post.id,
          error: `${validationErrors.join(" ")}${unscheduleError ? ` Não foi possível remover o agendamento: ${unscheduleError.message}` : " O agendamento foi removido para revisão editorial."}`,
        });
        continue;
      }

      try {
        await queuePublicationNotice(post.id);
      } catch {
        failures.push({ id: post.id, error: "Aviso do Telegram não pôde ser registrado; publicação adiada." });
        continue;
      }

      const publishedAt = new Date().toISOString();
      const { data: publishedPost, error: publishError } = await supabase
        .from("posts")
        .update({
          is_published: true,
          published_at: publishedAt,
          scheduled_at: null,
          scheduled_by: null,
          updated_at: publishedAt,
        })
        .eq("id", post.id)
        .eq("is_published", false)
        .eq("updated_at", post.updated_at)
        .eq("scheduled_at", post.scheduled_at)
        .select("id")
        .maybeSingle();

      if (publishError) {
        failures.push({ id: post.id, error: publishError.message });
        continue;
      }
      if (!publishedPost) continue;

      published.push(post.id);
      refreshPublishedPages();
      const effects = await runPostPublicationEffects(supabase, post as Post, {
        deliverNotice: true,
        reel: true,
        push: true,
        brickboardThread: post.publish_to_brickboard && post.scheduled_by
          ? { userId: post.scheduled_by, copy: post.brickboard_copy || post.summary, topicId: post.topic_id }
          : null,
      });
      for (const failure of effects.failures) {
        failures.push({ id: post.id, error: `Publicada, mas ${failure}` });
      }
    }

    if (failures.length > 0) {
      const detail = failures
        .slice(0, 5)
        .map((failure) => `• <code>${failure.id}</code>: ${failure.error.replace(/</g, "&" + "lt;")}`)
        .join("\n");
      await notifyAdmin(`⚠️ <b>Scheduler publicou com ${failures.length} falha(s).</b>\n${detail}`).catch(() => {});
    }

    return NextResponse.json({ published, failures, checked_at: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha desconhecida";
    console.error("Falha no scheduler editorial:", error);
    await notifyAdmin(`❌ <b>Scheduler editorial falhou.</b>\n<code>${escapeHtml(message.slice(0, 300))}</code>`).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
