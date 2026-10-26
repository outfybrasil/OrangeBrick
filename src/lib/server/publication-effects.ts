import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { queuePublicationNotice, deliverPublicationNotice } from "./telegram-publication.ts";
import { triggerReelGeneration } from "../video/reel-service.ts";

export interface PublishedPostRef {
  id: string;
  slug: string;
  title: string;
  summary: string;
  image_url: string | null;
  category: string | null;
  topic_id: string | null;
  publish_to_brickboard?: boolean | null;
  scheduled_by?: string | null;
  brickboard_copy?: string | null;
}

export interface BrickboardThreadInput {
  userId: string;
  copy: string;
  topicId: string | null;
}

export interface PublicationEffectsOptions {
  queueNotice?: boolean;
  deliverNotice?: boolean;
  reel?: boolean;
  push?: boolean;
  brickboardThread?: BrickboardThreadInput | null;
}

export type PublicationEffectsResult = {
  failures: string[];
  telegramNotified: boolean;
  reelQueued: boolean;
};

export function refreshPublishedPages(): void {
  for (const path of ["/", "/noticias", "/feed.xml", "/sitemap.xml", "/news-sitemap.xml", "/en", "/brickboard", "/en/brickboard"]) revalidatePath(path);
  revalidatePath("/posts/[slug]", "page");
  revalidatePath("/en/posts/[slug]", "page");
}

export async function runPostPublicationEffects(
  supabase: SupabaseClient,
  post: PublishedPostRef,
  options: PublicationEffectsOptions = {},
): Promise<PublicationEffectsResult> {
  const { queueNotice = false, deliverNotice = true, reel = true, push = true, brickboardThread = null } = options;
  const failures: string[] = [];

  if (queueNotice) {
    try {
      await queuePublicationNotice(post.id);
    } catch {
      failures.push("o aviso do Telegram não pôde ser registrado");
    }
  }

  if (deliverNotice) {
    try {
      if (!await deliverPublicationNotice(post.id)) {
        failures.push("o Telegram não confirmou o aviso; reenvio pendente");
      }
    } catch {
      failures.push("o aviso do Telegram ficou pendente de reenvio");
    }
  }

  let reelQueued = false;
  if (reel) {
    try {
      const reelResult = await triggerReelGeneration(post.slug);
      reelQueued = reelResult.queued;
      if (!reelQueued) failures.push(`o Reel não entrou na fila: ${reelResult.message}`);
    } catch (error) {
      failures.push(`o Reel não entrou na fila: ${error instanceof Error ? error.message : "falha desconhecida"}`);
    }
  }

  if (push) {
    try {
      const serviceRoleKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
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
      failures.push("o push de notificação falhou");
    }
  }

  if (brickboardThread) {
    try {
      const { data: existingThread } = await supabase.from("community_posts")
        .select("id")
        .eq("source_post_id", post.id)
        .eq("is_official_thread", true)
        .maybeSingle();
      if (!existingThread) {
        const { error: threadError } = await supabase.from("community_posts").insert({
          user_id: brickboardThread.userId,
          author_name: "Orange Brick",
          author_avatar: "",
          content: brickboardThread.copy.slice(0, 280),
          attached_article: {
            id: post.id,
            slug: post.slug,
            title: post.title,
            summary: post.summary,
            image_url: post.image_url,
            category: post.category,
            topic_id: post.topic_id,
          },
          topic_id: brickboardThread.topicId,
          source_post_id: post.id,
          is_official_thread: true,
        });
        if (threadError) failures.push(`a thread do Brickboard não foi criada: ${threadError.message}`);
      }
    } catch (error) {
      failures.push(`a thread do Brickboard não foi criada: ${error instanceof Error ? error.message : "falha desconhecida"}`);
    }
  }

  try {
    const { data: currentPost } = await supabase
      .from("posts")
      .select("id, title, summary, slug, title_en, summary_en, slug_en")
      .eq("id", post.id)
      .maybeSingle();

    if (currentPost && (!currentPost.title_en || !currentPost.summary_en || !currentPost.slug_en)) {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: "Translate this Portuguese gaming news headline and summary into natural English. Also generate an English URL slug (lowercase alphanumeric and hyphens). Respond with valid JSON only: { \"title_en\": string, \"summary_en\": string, \"slug_en\": string }.",
              },
              {
                role: "user",
                content: `Title: ${currentPost.title}\nSummary: ${currentPost.summary}`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const json = await res.json();
          const parsed = JSON.parse(json.choices[0].message.content);
          if (parsed.title_en && parsed.summary_en) {
            await supabase
              .from("posts")
              .update({
                title_en: parsed.title_en,
                summary_en: parsed.summary_en,
                slug_en: parsed.slug_en || post.slug,
              })
              .eq("id", post.id);
          }
        }
      }
    }
  } catch {
  }

  return {
    failures,
    telegramNotified: !failures.some((failure) => failure.includes("Telegram")),
    reelQueued: reel && reelQueued,
  };
}
