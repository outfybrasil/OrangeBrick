import webpush from "npm:web-push";
import { handleOptions, json, serviceClient } from "../_shared/platform.ts";

type CommunityEvent = "reaction" | "comment" | "repost" | "comment_like";

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
    const siteUrl = Deno.env.get("SITE_URL");
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!siteUrl || !publicKey || !privateKey) return json({ error: "Push não configurado" }, 500);

    let title: string;
    let body: string;
    let url: string;
    let recipientId: string | null = null;

    if (user.app_metadata?.is_admin === true && typeof values.title === "string") {
      title = values.title;
      body = typeof values.body === "string" ? values.body : "";
      url = typeof values.url === "string" ? values.url : "";
      if (!title || !body || title.length > 120 || body.length > 240) {
        return json({ error: "Notificação inválida" }, 400);
      }
      if (new URL(url).origin !== new URL(siteUrl).origin) {
        return json({ error: "URL não permitida" }, 400);
      }
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
      url = `${siteUrl}/brickboard`;
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
      icon: `${siteUrl}/icons/icon-192.png`,
      badge: `${siteUrl}/icons/icon-192.png`,
    });

    let sent = 0;
    await Promise.allSettled((subscriptions || []).map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh_key, auth: subscription.auth_key },
        }, notification);
        sent++;
      } catch (cause) {
        const status = typeof cause === "object" && cause && "statusCode" in cause
          ? Number(cause.statusCode)
          : 0;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        }
      }
    }));

    return json({ sent, total: subscriptions?.length || 0 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
