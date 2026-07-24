import webpush from "npm:web-push";
import { handleOptions, json, serviceClient } from "../_shared/platform.ts";

type CommunityEvent = "reaction" | "comment" | "repost" | "comment_like";

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Não autorizado" }, 401);

    const supabase = serviceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Não autorizado" }, 401);

    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);

    const values = payload as Record<string, unknown>;
    const siteUrl = Deno.env.get("SITE_URL") || "https://orangebrick.com.br";
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!publicKey || !privateKey) return json({ error: "Push não configurado (chaves VAPID ausentes)" }, 500);

    let siteBaseUrl: string;
    let siteOrigin: string;
    try {
      let formatted = siteUrl.trim();
      if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
        formatted = `https://${formatted}`;
      }
      const parsedBase = new URL(formatted.endsWith("/") ? formatted : `${formatted}/`);
      siteBaseUrl = parsedBase.href;
      siteOrigin = parsedBase.origin;
    } catch {
      return json({ error: "SITE_URL inválida" }, 500);
    }

    let title: string;
    let body: string;
    let url: string;
    let tag: string;
    let kind: "news" | "community";
    let recipientId: string | null = null;

    if (user.app_metadata?.is_admin === true && typeof values.title === "string") {
      title = cleanText(values.title, 120);
      body = cleanText(values.body, 240);
      const requestedUrl = cleanText(values.url, 2048);
      tag = cleanText(values.tag, 96) || `news-${crypto.randomUUID()}`;
      kind = "news";
      if (!title || !body || !requestedUrl) {
        return json({ error: "Notificação inválida" }, 400);
      }

      let targetUrl: URL;
      try {
        if (requestedUrl.startsWith("http://") || requestedUrl.startsWith("https://")) {
          targetUrl = new URL(requestedUrl);
        } else {
          const cleanPath = requestedUrl.startsWith("/") ? requestedUrl : `/${requestedUrl}`;
          targetUrl = new URL(cleanPath, siteBaseUrl);
        }
      } catch {
        return json({ error: "URL da notícia inválida" }, 400);
      }
      if (targetUrl.origin !== siteOrigin) {
        return json({ error: "URL não permitida" }, 400);
      }
      url = targetUrl.toString();
    } else {
      const eventType = values.event_type as CommunityEvent;
      const referenceId = values.reference_id;
      if (
        !["reaction", "comment", "repost", "comment_like"].includes(eventType) ||
        typeof referenceId !== "string"
      ) {
        return json({ error: "Evento inválido" }, 400);
      }

      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("user_id", user.id)
        .maybeSingle();
      const actorName = actorProfile?.nickname || user.user_metadata?.full_name || "Alguém";

      if (eventType === "reaction") {
        const { data: reaction } = await supabase
          .from("community_reactions")
          .select("id")
          .eq("post_id", referenceId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!reaction) return json({ error: "Reação não encontrada" }, 404);
        const { data: post } = await supabase
          .from("community_posts")
          .select("user_id")
          .eq("id", referenceId)
          .single();
        recipientId = post?.user_id || null;
        body = `${actorName} reagiu ao seu Brick`;
      } else if (eventType === "comment") {
        const { data: comment } = await supabase
          .from("community_comments")
          .select("id")
          .eq("post_id", referenceId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!comment) return json({ error: "Comentário não encontrado" }, 404);
        const { data: post } = await supabase
          .from("community_posts")
          .select("user_id")
          .eq("id", referenceId)
          .single();
        recipientId = post?.user_id || null;
        body = `${actorName} comentou no seu Brick`;
      } else if (eventType === "repost") {
        const { data: repost } = await supabase
          .from("community_posts")
          .select("id")
          .eq("shared_post_id", referenceId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!repost) return json({ error: "Republicação não encontrada" }, 404);
        const { data: post } = await supabase
          .from("community_posts")
          .select("user_id")
          .eq("id", referenceId)
          .single();
        recipientId = post?.user_id || null;
        body = `${actorName} republicou seu Brick`;
      } else {
        const { data: like } = await supabase
          .from("community_comment_likes")
          .select("id")
          .eq("comment_id", referenceId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!like) return json({ error: "Curtida não encontrada" }, 404);
        const { data: comment } = await supabase
          .from("community_comments")
          .select("user_id")
          .eq("id", referenceId)
          .single();
        recipientId = comment?.user_id || null;
        body = `${actorName} curtiu seu comentário`;
      }

      if (!recipientId || recipientId === user.id) return json({ sent: 0, total: 0 });
      title = "Orange Brick";
      url = new URL("/brickboard", siteBaseUrl).toString();
      tag = `community-${eventType}-${referenceId}`.slice(0, 96);
      kind = "community";
    }

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") || "mailto:contato@orangebrick.com",
      publicKey,
      privateKey
    );

    let subscriptionQuery = supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh_key, auth_key");
    if (recipientId) subscriptionQuery = subscriptionQuery.eq("user_id", recipientId);

    const { data: subscriptions, error } = await subscriptionQuery;
    if (error) throw error;

    const notification = JSON.stringify({
      title,
      body,
      url,
      tag,
      kind,
      icon: new URL("/icons/icon-192.png", siteBaseUrl).toString(),
      badge: new URL("/icons/icon-192.png", siteBaseUrl).toString(),
      timestamp: Date.now(),
    });

    const results = await Promise.all((subscriptions || []).map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh_key, auth: subscription.auth_key },
        }, notification, {
          TTL: kind === "news" ? 86400 : 14400,
          urgency: kind === "news" ? "high" : "normal",
        });
        return "sent" as const;
      } catch (cause) {
        const status = typeof cause === "object" && cause && "statusCode" in cause
          ? Number(cause.statusCode)
          : 0;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
          return "expired" as const;
        }
        return "failed" as const;
      }
    }));

    const sent = results.filter((result) => result === "sent").length;
    const expired = results.filter((result) => result === "expired").length;
    const failed = results.filter((result) => result === "failed").length;
    const total = subscriptions?.length || 0;

    if (total > 0 && sent === 0 && failed > 0) {
      return json({
        error: "O alerta não chegou aos aparelhos. Verifique as chaves VAPID e tente novamente.",
        sent,
        failed,
        expired,
        total,
      }, 502);
    }

    return json({ sent, failed, expired, total });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
