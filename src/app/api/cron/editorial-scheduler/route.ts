import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyAdmin } from "@/lib/telegram/bot";
import { validateStoredEditorialPost } from "@/lib/content-validation";
import type { Post } from "@/lib/types/database";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { deliverPublicationNotice, queuePublicationNotice, retryPendingPublicationNotices } from "@/lib/server/telegram-publication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = serviceClient();
  const now = new Date().toISOString();
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
    return NextResponse.json({ error: "Falha ao carregar matérias agendadas" }, { status: 500 });
  }

  const published: string[] = [];
  const failures: { id: string; error: string }[] = [];

  for (const post of scheduledPosts || []) {
    const validationErrors = validateStoredEditorialPost(post as Post);
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
      .select("id")
      .maybeSingle();

    if (publishError) {
      failures.push({ id: post.id, error: publishError.message });
      continue;
    }
    if (!publishedPost) continue;

    published.push(post.id);
    try {
      if (!await deliverPublicationNotice(post.id)) {
        failures.push({ id: post.id, error: "Publicada, mas o Telegram não confirmou o aviso; reenvio pendente." });
      }
    } catch {
      failures.push({ id: post.id, error: "Publicada, mas o aviso do Telegram ficou pendente de reenvio." });
    }

    if (post.publish_to_brickboard && post.scheduled_by) {
      const { data: existingThread } = await supabase
        .from("community_posts")
        .select("id")
        .eq("source_post_id", post.id)
        .eq("is_official_thread", true)
        .maybeSingle();
      if (!existingThread) {
        const { error: threadError } = await supabase.from("community_posts").insert({
          user_id: post.scheduled_by,
          author_name: "Orange Brick",
          author_avatar: "",
          content: (post.brickboard_copy || post.summary).slice(0, 280),
          attached_article: {
            id: post.id,
            slug: post.slug,
            title: post.title,
            summary: post.summary,
            image_url: post.image_url,
            category: post.category,
            topic_id: post.topic_id,
          },
          topic_id: post.topic_id,
          source_post_id: post.id,
          is_official_thread: true,
        });
        if (threadError) {
          failures.push({ id: post.id, error: threadError.message });
        }
      }
    }

    const serviceRoleKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
    try {
      const pushResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: post.title,
          body: post.summary,
          url: `/posts/${post.slug}`,
          tag: `news-${post.slug}`,
          kind: "news",
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!pushResponse.ok) throw new Error("push_unavailable");
    } catch {
      failures.push({ id: post.id, error: "Publicada, mas o push agendado falhou" });
    }
  }

  if (failures.length > 0) {
    const detail = failures
      .slice(0, 5)
      .map((failure) => `• <code>${failure.id}</code>: ${failure.error.replace(/</g, "&lt;")}`)
      .join("\n");
    await notifyAdmin(`⚠️ <b>Scheduler publicou com ${failures.length} falha(s).</b>\n${detail}`).catch(() => {});
  }

  return NextResponse.json({ published, failures, checked_at: now });
}
