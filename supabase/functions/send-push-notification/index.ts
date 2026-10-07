import webpush from "npm:web-push";
import { handleOptions, isServiceApiKey, json, serve, serviceClient } from "../_shared/platform.ts";

type CommunityEvent = "reaction" | "comment" | "repost" | "comment_like";

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const isServiceRequest = token ? await isServiceApiKey(token) : false;
    const supabase = serviceClient();
    const authResult = token && !isServiceRequest ? await supabase.auth.getUser(token) : null;
    const user = authResult?.data.user ?? null;
    if (!isServiceRequest && (!user || authResult?.error)) return json({ error: "Não autorizado" }, 401);

    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);

    const values = payload as Record<string, unknown>;
    const siteUrl = Deno.env.get("SITE_URL") || "https://orangebrick.blog";
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
    let conversationId: string | null = null;

    if ((isServiceRequest || user?.app_metadata?.is_admin === true) && typeof values.title === "string") {
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
      if (!user) return json({ error: "Não autorizado" }, 401);
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
      if (eventType !== "comment_like") conversationId = referenceId;

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
          .select("user_id, post_id")
          .eq("id", referenceId)
          .single();
        recipientId = comment?.user_id || null;
        conversationId = comment?.post_id || null;
        body = `${actorName} curtiu seu comentário`;
      }

      if (!recipientId || recipientId === user.id) return json({ sent: 0, total: 0 });
      title = "Orange Brick";
      url = new URL(conversationId ? `/brickboard?post=${encodeURIComponent(conversationId)}` : "/brickboard", siteBaseUrl).toString();
      tag = `community-${eventType}-${referenceId}`.slice(0, 96);
      kind = "community";
    }

    if (recipientId) {
      const { data: preferences, error: preferenceError } = await supabase.from("notification_preferences").select("brickboard_replies").eq("user_id", recipientId).maybeSingle();
      if (preferenceError) return json({ error: "N\u00e3o foi poss\u00edvel validar as prefer\u00eancias de notifica\u00e7\u00e3o" }, 503);
      if (preferences && preferences.brickboard_replies === false) return json({ sent: 0, total: 0, skipped: "preference" });
    }

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") || "mailto:contato@orangebrick.com",
      publicKey,
      privateKey
    );

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

    const pageSize = 100;
    const optedOutIds = new Set<string>();
    if (kind === "news" && !recipientId) {
      let offset = 0;
      while (true) {
        const { data: optedOut, error: preferenceError } = await supabase
          .from("notification_preferences")
          .select("user_id")
          .eq("breaking_news", false)
          .order("user_id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (preferenceError) return json({ error: "N\u00e3o foi poss\u00edvel validar as prefer\u00eancias de notifica\u00e7\u00e3o" }, 503);
        for (const row of optedOut || []) {
          if (row.user_id) optedOutIds.add(row.user_id);
        }
        if ((optedOut || []).length < pageSize) break;
        offset += pageSize;
      }
    }

    let lastEndpoint: string | null = null;
    let sent = 0;
    let expired = 0;
    let failed = 0;
    let total = 0;
    while (true) {
      let subscriptionQuery = supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh_key, auth_key, user_id");
      if (recipientId) subscriptionQuery = subscriptionQuery.eq("user_id", recipientId);
      if (lastEndpoint) subscriptionQuery = subscriptionQuery.gt("endpoint", lastEndpoint);

      const { data: subscriptions, error } = await subscriptionQuery
        .order("endpoint", { ascending: true })
        .limit(pageSize);
      if (error) throw error;
      if (!subscriptions?.length) break;

      lastEndpoint = subscriptions[subscriptions.length - 1].endpoint;
      const eligibleSubscriptions = kind === "news" && !recipientId
        ? subscriptions.filter((subscription) => !subscription.user_id || !optedOutIds.has(subscription.user_id))
        : subscriptions;
      total += eligibleSubscriptions.length;

      const results = await Promise.all(eligibleSubscriptions.map(async (subscription) => {
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
            const { error: deleteError } = await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
            return deleteError ? "failed" as const : "expired" as const;
          }
          return "failed" as const;
        }
      }));

      sent += results.filter((result) => result === "sent").length;
      expired += results.filter((result) => result === "expired").length;
      failed += results.filter((result) => result === "failed").length;
      if (subscriptions.length < pageSize) break;
    }
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
