import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!isAdminUser(user)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || "";
  if (query.length < 2) return NextResponse.json({ results: [] });
  if (!process.env.RAWG_API_KEY) return NextResponse.json({ error: "RAWG_API_KEY não configurada" }, { status: 503 });

  const params = new URLSearchParams({ key: process.env.RAWG_API_KEY, search: query, search_precise: "true", page_size: "6" });
  const response = await fetch(`https://api.rawg.io/api/games?${params}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) return NextResponse.json({ error: "A consulta ao catálogo de jogos falhou" }, { status: 502 });
  const payload = await response.json() as { results?: Array<{ id: number; name: string; released: string | null; background_image: string | null; platforms?: Array<{ platform?: { name?: string } }> }> };
  return NextResponse.json({
    results: (payload.results || []).map((game) => ({
      id: String(game.id),
      title: game.name,
      releaseDate: game.released || "",
      platforms: (game.platforms || []).map((entry) => entry.platform?.name).filter((name): name is string => Boolean(name)),
      referenceImageUrl: game.background_image,
    })),
  });
}
