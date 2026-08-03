import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = serviceClient();
  const now = new Date().toISOString();
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
    const publishedAt = post.scheduled_at || now;
    const { error: publishError } = await supabase
      .from("posts")
      .update({
        is_published: true,
        published_at: publishedAt,
        scheduled_at: null,
        scheduled_by: null,
        updated_at: now,
      })
      .eq("id", post.id);

    if (publishError) {
      failures.push({ id: post.id, error: publishError.message });
      continue;
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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
    });
    if (!pushResponse.ok) {
      failures.push({ id: post.id, error: "Publicada, mas o push agendado falhou" });
    }

    published.push(post.id);
  }

  return NextResponse.json({ published, failures, checked_at: now });
}
