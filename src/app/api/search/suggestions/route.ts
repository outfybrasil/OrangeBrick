import { NextResponse } from "next/server";
import { createPublicServerClient, createServiceDataClient } from "@/lib/supabase/server";
import { normalizeNewsSearch } from "@/lib/news-query";
import { getRateLimitIdentity, getRateLimitWindowStart } from "@/lib/server/rate-limit";
import { PLATFORMS_CONFIG } from "@/lib/types/platform";
import type { Post, Game } from "@/lib/types/database";
import type { SearchSuggestion } from "@/lib/content-discovery";

export async function GET(request: Request) {
  const query = normalizeNewsSearch(new URL(request.url).searchParams.get("q") || "");
  const headers = { "Cache-Control": "private, no-store" };
  if (query.length < 2) return NextResponse.json({ items: [], partial: false }, { headers });
  const secret = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const identity = getRateLimitIdentity(request, secret);
  if (!identity) return NextResponse.json({ error: "Sugestões indisponíveis. Use a busca completa." }, { status: 503, headers });
  const { data: allowed, error } = await createServiceDataClient().rpc("consume_rate_limit", { p_action: "search_suggestions", p_identity_hash: identity, p_window_start: getRateLimitWindowStart().toISOString(), p_limit: 60 });
  if (error || !allowed) return NextResponse.json({ error: "Aguarde um pouco ou use a busca completa." }, { status: error ? 503 : 429, headers: { ...headers, "Retry-After": "60" } });
  const publicClient = createPublicServerClient();
  const signal = AbortSignal.timeout(5000);
  const [posts, games] = await Promise.all([
    publicClient.from("posts").select("id,title,slug").eq("is_published", true).or(`title.ilike.%${query}%,summary.ilike.%${query}%`).order("published_at", { ascending: false }).order("id", { ascending: false }).limit(4).abortSignal(signal).returns<Pick<Post, "id" | "title" | "slug">[]>(),
    publicClient.from("games").select("id,name,slug").eq("is_active", true).ilike("name", `%${query}%`).order("name").limit(3).abortSignal(signal).returns<Pick<Game, "id" | "name" | "slug">[]>(),
  ]);
  const platforms = Object.values(PLATFORMS_CONFIG).filter(platform => [platform.name, ...platform.tagKeywords].some(name => name.toLowerCase().includes(query.toLowerCase()))).slice(0, 2);
  const items: SearchSuggestion[] = [
    ...(posts.data || []).map(post => ({ id: `post:${post.id}`, label: post.title, href: `/posts/${post.slug}`, kind: "Notícia" as const })),
    ...(games.data || []).map(game => ({ id: `game:${game.id}`, label: game.name, href: `/games/${game.slug}`, kind: "Jogo" as const })),
    ...platforms.map(platform => ({ id: `platform:${platform.slug}`, label: platform.name, href: `/plataforma/${platform.slug}`, kind: "Plataforma" as const })),
  ];
  return NextResponse.json({ items, partial: Boolean(posts.error || games.error) }, { headers });
}
