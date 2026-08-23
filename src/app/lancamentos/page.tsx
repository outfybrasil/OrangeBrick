import { Metadata } from "next";
import { ReleasesPageClient } from "./ReleasesPageClient";
import type { ReleaseItem } from "@/components/feed/ReleaseRadarStrip";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { ReleaseRadarItem } from "@/lib/types/database";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Calendário de Lançamentos de Jogos 2026 — Orange Brick",
  description: "Agenda completa de lançamentos de jogos para PlayStation 5, Xbox Series X/S, Nintendo Switch, Switch 2 e PC em 2026.",
  openGraph: {
    title: "Calendário de Lançamentos de Jogos 2026 — Orange Brick",
    description: "Agenda completa de lançamentos de jogos em 2026 organizados por mês e plataforma.",
  },
};

export default async function LancamentosPage() {
  const supabase = createPublicServerClient();
  const [{ data: items }, { data: hype }] = await Promise.all([
    supabase
      .from("release_radar_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.rpc("get_release_hype_counts"),
  ]);

  const initialReleases: ReleaseItem[] = ((items || []) as unknown as ReleaseRadarItem[]).map((item) => ({
    id: item.id,
    game: item.game,
    releaseDate: item.release_label,
    releaseDateIso: item.release_date || undefined,
    dayOfWeek: item.schedule_label,
    platforms: item.platforms,
    image: item.image_url || "",
    badge: item.badge,
    category: item.category,
    slug: item.post_slug || undefined,
  }));

  const initialHypeCounts: Record<string, Record<"buy" | "watch" | "skip", number>> = {};
  for (const row of ((hype || []) as Array<{ release_id: string; vote_type: string; vote_count: number }>)) {
    if (row.vote_type !== "buy" && row.vote_type !== "watch" && row.vote_type !== "skip") continue;
    const current = initialHypeCounts[row.release_id] || { buy: 0, watch: 0, skip: 0 };
    current[row.vote_type] = Number(row.vote_count);
    initialHypeCounts[row.release_id] = current;
  }

  return <ReleasesPageClient initialReleases={initialReleases} initialHypeCounts={initialHypeCounts} />;
}
