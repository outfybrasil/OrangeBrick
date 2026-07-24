import { allowRequest, handleOptions, isAllowedPushEndpoint, json, serviceClient } from "../_shared/platform.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const rate = await allowRequest(request, "push-subscription", 10, 3600);
    if (!rate.allowed) return json({ error: "Muitas tentativas" }, 429);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);
    const { action, endpoint, p256dh_key, auth_key, user_agent } = payload as Record<string, unknown>;
    if ((action !== "subscribe" && action !== "unsubscribe") || typeof endpoint !== "string" || endpoint.length > 2048 || !isAllowedPushEndpoint(endpoint)) {
      return json({ error: "Assinatura inválida" }, 400);
    }
    const supabase = serviceClient();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (action === "unsubscribe") {
      const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      if (error) throw error;
      return json({ success: true });
    }
    if (typeof p256dh_key !== "string" || typeof auth_key !== "string" || p256dh_key.length > 512 || auth_key.length > 512) {
      return json({ error: "Chaves inválidas" }, 400);
    }
    const { error } = await supabase.from("push_subscriptions").upsert({
      endpoint,
      p256dh_key,
      auth_key,
      user_agent: typeof user_agent === "string" ? user_agent.slice(0, 512) : null,
      user_id: user?.id || null,
    }, { onConflict: "endpoint" });
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
