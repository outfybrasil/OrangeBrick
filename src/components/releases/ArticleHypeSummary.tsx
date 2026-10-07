"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import type { ReleaseHypeCount, ReleaseRadarItem } from "@/lib/types/database";

export function ArticleHypeSummary({ postSlug }: { postSlug: string }) {
  const supabase = useMemo(() => createDataClient(), []);
  const [release, setRelease] = useState<ReleaseRadarItem | null>(null);
  const [counts, setCounts] = useState({ buy: 0, watch: 0, skip: 0 });
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setLoadError(false);
      setRelease(null);
      setCounts({ buy: 0, watch: 0, skip: 0 });
      try {
        const { data: releaseData, error: releaseError } = await supabase
          .from("release_radar_items")
          .select("*")
          .eq("post_slug", postSlug)
          .eq("is_active", true)
          .maybeSingle();
        if (releaseError) throw releaseError;
        const matchedRelease = releaseData as ReleaseRadarItem | null;
        if (!matchedRelease) {
          if (isMounted) setRelease(null);
          return;
        }

        const { data: countData, error: countError } = await supabase.rpc("get_release_hype_counts");
        if (countError) throw countError;
        const nextCounts = { buy: 0, watch: 0, skip: 0 };
        for (const row of (countData || []) as ReleaseHypeCount[]) {
          if (row.release_id === matchedRelease.id) {
            nextCounts[row.vote_type] = Number(row.vote_count);
          }
        }
        if (isMounted) {
          setRelease(matchedRelease);
          setCounts(nextCounts);
        }
      } catch {
        if (isMounted) setLoadError(true);
      }
    }

    void loadSummary();
    return () => {
      isMounted = false;
    };
  }, [postSlug, retry, supabase]);

  if (loadError) {
    return (
      <section role="alert" className="mt-10 border-y border-red-400/20 py-5 text-sm text-red-200">
        <p>Não foi possível carregar o termômetro desta matéria.</p>
        <button type="button" onClick={() => { setRelease(null); setRetry((value) => value + 1); }} className="mt-2 min-h-11 font-bold text-brand-orange">
          Tentar novamente
        </button>
      </section>
    );
  }

  if (!release) return null;

  const total = counts.buy + counts.watch + counts.skip;
  const positiveShare = total === 0 ? 0 : Math.round(((counts.buy + counts.watch) / total) * 100);

  return (
    <section className="mt-10 border-y border-white/10 py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
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
        <Link href={`/lancamentos#release-${release.id}`} className="ml-auto font-bold text-brand-orange hover:text-white">
          Votar no Radar
        </Link>
      </div>
    </section>
  );
}
