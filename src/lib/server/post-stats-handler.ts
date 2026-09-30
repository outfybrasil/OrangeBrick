export interface PostStatsRow {
  post_id: string;
  hype: number | string;
  flop: number | string;
  salty: number | string;
  views: number | string;
  comments: number | string;
  user_reaction: string | null;
}

interface PostStatsHandlerDependencies {
  allowRequest(request: Request, action: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean }>;
  handleOptions(request: Request): Response | null;
  isUuid(value: unknown): value is string;
  json(data: unknown, status?: number): Response;
  loadStats(postIds: string[], deviceId: string | null): Promise<PostStatsRow[]>;
}

function emptyStats(): {
  reactions: { hype: number; flop: number; salty: number };
  views: number;
  comments: number;
  userReaction: string | null;
} {
  return { reactions: { hype: 0, flop: 0, salty: 0 }, views: 0, comments: 0, userReaction: null };
}

export function createPostStatsHandler(dependencies: PostStatsHandlerDependencies) {
  return async function handlePostStats(request: Request): Promise<Response> {
    const options = dependencies.handleOptions(request);
    if (options) return options;
    if (request.method !== "POST") return dependencies.json({ error: "Método não permitido" }, 405);

    try {
      const rate = await dependencies.allowRequest(request, "post-stats", 120, 60);
      if (!rate.allowed) return dependencies.json({ error: "Muitas tentativas" }, 429);

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return dependencies.json({ error: "Payload inválido" }, 400);
      }
      if (!payload || typeof payload !== "object") return dependencies.json({ error: "Payload inválido" }, 400);

      const { post_ids: postIds, device_id: deviceId } = payload as { post_ids?: unknown; device_id?: unknown };
      if (!Array.isArray(postIds) || postIds.length === 0 || postIds.length > 50 || !postIds.every(dependencies.isUuid)) {
        return dependencies.json({ error: "Lista de matérias inválida" }, 400);
      }
      if (deviceId !== undefined && (typeof deviceId !== "string" || !/^[a-f0-9]{32,128}$/i.test(deviceId))) {
        return dependencies.json({ error: "Dispositivo inválido" }, 400);
      }

      const stats: Record<string, ReturnType<typeof emptyStats>> = {};
      for (const id of postIds) stats[id] = emptyStats();

      for (const row of await dependencies.loadStats(postIds, typeof deviceId === "string" ? deviceId : null)) {
        if (!Object.hasOwn(stats, row.post_id)) continue;
        stats[row.post_id] = {
          reactions: { hype: Number(row.hype), flop: Number(row.flop), salty: Number(row.salty) },
          views: Number(row.views),
          comments: Number(row.comments),
          userReaction: row.user_reaction === "hype" || row.user_reaction === "flop" || row.user_reaction === "salty"
            ? row.user_reaction
            : null,
        };
      }

      return dependencies.json({ stats });
    } catch {
      return dependencies.json({ error: "Erro interno" }, 500);
    }
  };
}
