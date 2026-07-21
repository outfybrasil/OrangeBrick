import { allowRequest, handleOptions, hashIdentity, isUuid, json, requestIp, serviceClient } from "../_shared/platform.ts";

const reactionTypes = new Set(["hype", "flop", "salty"]);

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const rate = await allowRequest(request, "reaction", 30, 60);
    if (!rate.allowed) return json({ error: "Muitas tentativas. Aguarde um minuto." }, 429);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);
    const { post_id, device_id, reaction_type } = payload as Record<string, unknown>;
    if (!isUuid(post_id) || typeof device_id !== "string" || !/^[a-f0-9]{32,128}$/i.test(device_id) || typeof reaction_type !== "string" || !reactionTypes.has(reaction_type)) {
      return json({ error: "Dados da reação inválidos" }, 400);
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
    const { data: rows, error: findError } = await supabase
      .from("reactions")
      .select("id, reaction_type")
      .eq("post_id", post_id)
      .or(`device_id.eq.${device_id},ip_hash.eq.${ipHash}`)
      .order("created_at", { ascending: false })
      .limit(1);
    if (findError) throw findError;
    const existing = rows?.[0];
    let action = "inserted";
    let activeReaction: string | null = reaction_type;
    if (existing?.reaction_type === reaction_type) {
      const { error } = await supabase.from("reactions").delete().eq("id", existing.id);
      if (error) throw error;
      action = "removed";
      activeReaction = null;
    } else if (existing) {
      const { error } = await supabase
        .from("reactions")
        .update({ reaction_type, device_id, ip_hash: ipHash })
        .eq("id", existing.id);
      if (error) throw error;
      action = "updated";
    } else {
      const { error } = await supabase.from("reactions").insert({
        post_id,
        device_id,
        reaction_type,
        ip_hash: ipHash,
      });
      if (error) throw error;
    }
    const { data: reactions, error: countError } = await supabase
      .from("reactions")
      .select("reaction_type")
      .eq("post_id", post_id);
    if (countError) throw countError;
    const counts = { hype: 0, flop: 0, salty: 0 };
    for (const reaction of reactions || []) {
      const type = reaction.reaction_type as keyof typeof counts;
      if (type in counts) counts[type]++;
    }
    return json({ action, activeReaction, counts });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
