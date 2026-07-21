import webpush from "npm:web-push";
import { handleOptions, json, serviceClient } from "../_shared/platform.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Não autorizado" }, 401);
    const supabase = serviceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || user?.app_metadata?.is_admin !== true) return json({ error: "Acesso proibido" }, 403);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);
    const { title, body, url } = payload as Record<string, unknown>;
    if (typeof title !== "string" || typeof body !== "string" || typeof url !== "string" || title.length > 120 || body.length > 240) {
      return json({ error: "Notificação inválida" }, 400);
    }
    const siteUrl = Deno.env.get("SITE_URL");
    if (!siteUrl || new URL(url).origin !== new URL(siteUrl).origin) return json({ error: "URL não permitida" }, 400);
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!publicKey || !privateKey) return json({ error: "VAPID não configurado" }, 500);
    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:contato@orangebrick.com", publicKey, privateKey);
    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("endpoint, p256dh_key, auth_key");
    if (error) throw error;
    const notification = JSON.stringify({
      title,
      body,
      url,
      icon: `${siteUrl}/logos/Logo Tijolo Quebrado.PNG`,
      badge: `${siteUrl}/logos/Logo Tijolo Quebrado.PNG`,
    });
    let sent = 0;
    await Promise.allSettled((subscriptions || []).map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh_key, auth: subscription.auth_key },
        }, notification);
        sent++;
      } catch (error) {
        const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
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
