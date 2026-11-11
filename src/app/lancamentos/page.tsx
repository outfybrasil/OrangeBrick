import { Metadata } from "next";
import { ReleasesPageClient } from "./ReleasesPageClient";
import type { ReleaseItem } from "@/components/feed/ReleaseRadarStrip";
import { getActiveReleaseItems, getReleaseHypeCounts } from "@/lib/server/public-data-cache";
import { isRetainedRelease } from "@/lib/release-dates";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Calendário de Lançamentos de Jogos | Orange Brick",
  description: "Agenda de lançamentos de jogos para PlayStation 5, Xbox Series X/S, Nintendo Switch, Switch 2 e PC, organizada pelo ano oficial.",
  openGraph: {
    title: "Calendário de Lançamentos de Jogos — Orange Brick",
    description: "Agenda de lançamentos de jogos organizada por data e plataforma.",
    url: "/lancamentos",
  },
  alternates: { canonical: "/lancamentos" },
};

export default async function LancamentosPage() {
  const [items, hype] = await Promise.all([getActiveReleaseItems(), getReleaseHypeCounts()]);

  const initialReleases: ReleaseItem[] = items.filter((item) => isRetainedRelease(item.release_date)).map((item) => ({
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

  const initialHypeCounts: Record<string, Record<"buy" | "watch" | "skip", number>> | undefined = hype ? {} : undefined;
  if (initialHypeCounts) {
    for (const row of hype || []) {
      if (row.vote_type !== "buy" && row.vote_type !== "watch" && row.vote_type !== "skip") continue;
      const current = initialHypeCounts[row.release_id] || { buy: 0, watch: 0, skip: 0 };
      current[row.vote_type] = Number(row.vote_count);
      initialHypeCounts[row.release_id] = current;
    }
  }

  return <ReleasesPageClient initialReleases={initialReleases} initialHypeCounts={initialHypeCounts} />;
}
