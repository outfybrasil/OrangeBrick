import { allowRequest, handleOptions, isUuid, json, serviceClient } from "../_shared/platform.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const rate = await allowRequest(request, "post-stats", 120, 60);
    if (!rate.allowed) return json({ error: "Muitas tentativas" }, 429);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);
    const { post_ids, device_id } = payload as { post_ids?: unknown; device_id?: unknown };
    if (!Array.isArray(post_ids) || post_ids.length === 0 || post_ids.length > 50 || !post_ids.every(isUuid)) {
      return json({ error: "Lista de matérias inválida" }, 400);
    }
    if (device_id !== undefined && (typeof device_id !== "string" || !/^[a-f0-9]{32,128}$/i.test(device_id))) {
      return json({ error: "Dispositivo inválido" }, 400);
    }
    const supabase = serviceClient();
    const ids = post_ids as string[];
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id")
      .in("id", ids)
      .eq("is_published", true);
    if (postsError) throw postsError;
    const publishedIds = (posts || []).map((post) => post.id);
    const stats: Record<string, { reactions: { hype: number; flop: number; salty: number }; views: number; comments: number; userReaction: string | null }> = {};
    for (const id of ids) stats[id] = { reactions: { hype: 0, flop: 0, salty: 0 }, views: 0, comments: 0, userReaction: null };
    if (publishedIds.length === 0) return json({ stats });
    const [reactionResult, viewResult, commentResult] = await Promise.all([
      supabase.from("reactions").select("post_id, reaction_type, device_id").in("post_id", publishedIds),
      supabase.from("post_views").select("post_id").in("post_id", publishedIds),
      supabase.from("comments").select("post_id").in("post_id", publishedIds),
    ]);
    if (reactionResult.error) throw reactionResult.error;
    if (viewResult.error) throw viewResult.error;
    if (commentResult.error) throw commentResult.error;
    for (const row of reactionResult.data || []) {
      const item = stats[row.post_id];
      const type = row.reaction_type as keyof typeof item.reactions;
      if (item && type in item.reactions) item.reactions[type]++;
      if (item && row.device_id === device_id) item.userReaction = row.reaction_type;
    }
    for (const row of viewResult.data || []) if (stats[row.post_id]) stats[row.post_id].views++;
    for (const row of commentResult.data || []) if (stats[row.post_id]) stats[row.post_id].comments++;
    return json({ stats });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
