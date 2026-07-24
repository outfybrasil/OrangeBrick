"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import type { ReleaseHypeCount, ReleaseRadarItem } from "@/lib/types/database";

export function ArticleHypeSummary({ postSlug }: { postSlug: string }) {
  const supabase = useMemo(() => createDataClient(), []);
  const [release, setRelease] = useState<ReleaseRadarItem | null>(null);
  const [counts, setCounts] = useState({ buy: 0, watch: 0, skip: 0 });

  useEffect(() => {
    async function loadSummary() {
      const { data: releaseData } = await supabase
        .from("release_radar_items")
        .select("*")
        .eq("post_slug", postSlug)
        .eq("is_active", true)
        .maybeSingle();
      const matchedRelease = releaseData as ReleaseRadarItem | null;
      if (!matchedRelease) return;

      setRelease(matchedRelease);
      const { data: countData } = await supabase.rpc("get_release_hype_counts");
      const nextCounts = { buy: 0, watch: 0, skip: 0 };
      for (const row of (countData || []) as ReleaseHypeCount[]) {
        if (row.release_id === matchedRelease.id) {
          nextCounts[row.vote_type] = Number(row.vote_count);
        }
      }
      setCounts(nextCounts);
    }

    void loadSummary();
  }, [postSlug, supabase]);

  if (!release) return null;

  const total = counts.buy + counts.watch + counts.skip;
  const positiveShare = total === 0 ? 0 : Math.round(((counts.buy + counts.watch) / total) * 100);

  return (
    <section className="mt-10 border-y border-white/10 py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
            Hype Meter
          </p>
          <h2 className="mt-1 font-heading text-lg font-black text-white">{release.game}</h2>
        </div>
        <p className="text-right text-sm font-black tabular-nums text-white">
          {total === 0 ? "Sem votos" : `${positiveShare}% no radar`}
        </p>
      </div>
      <div className="mt-4 flex h-1.5 overflow-hidden bg-white/[0.06]" aria-hidden="true">
        {total > 0 && (
          <>
            <span className="bg-brand-orange" style={{ width: `${(counts.buy / total) * 100}%` }} />
            <span className="bg-[#F4A261]" style={{ width: `${(counts.watch / total) * 100}%` }} />
            <span className="bg-gray-600" style={{ width: `${(counts.skip / total) * 100}%` }} />
          </>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-400">
        <span>{counts.buy} garantiram</span>
        <span>{counts.watch} estão de olho</span>
        <span>{counts.skip} vão passar</span>
        <Link href={`/lancamentos#${release.id}`} className="ml-auto font-bold text-brand-orange hover:text-white">
          Votar no Radar
        </Link>
      </div>
    </section>
  );
}
