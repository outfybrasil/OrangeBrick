import { allowRequest, handleOptions, hashIdentity, isUuid, json, requestIp, serviceClient } from "../_shared/platform.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const rate = await allowRequest(request, "view", 60, 60);
    if (!rate.allowed) return json({ error: "Muitas tentativas" }, 429);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);
    const { post_id, device_id } = payload as Record<string, unknown>;
    if (!isUuid(post_id) || typeof device_id !== "string" || !/^[a-f0-9]{32,128}$/i.test(device_id)) {
      return json({ error: "Dados de visualização inválidos" }, 400);
    }
    const supabase = serviceClient();
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", post_id)
      .eq("is_published", true)
      .maybeSingle();
    if (postError) throw postError;
    if (!post) return json({ error: "Matéria não encontrada" }, 404);
    const ipHash = await hashIdentity(requestIp(request));
    const { data: existing, error: findError } = await supabase
      .from("post_views")
      .select("id")
      .eq("post_id", post_id)
      .or(`device_id.eq.${device_id},ip_hash.eq.${ipHash}`)
      .limit(1);
    if (findError) throw findError;
    let action = "already_viewed";
    if (!existing?.length) {
      const { error } = await supabase.from("post_views").insert({ post_id, device_id, ip_hash: ipHash });
      if (error && error.code !== "23505") throw error;
      if (!error) action = "registered";
    }
    const { count, error: countError } = await supabase
      .from("post_views")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post_id);
    if (countError) throw countError;
    return json({ action, count: count || 0 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
