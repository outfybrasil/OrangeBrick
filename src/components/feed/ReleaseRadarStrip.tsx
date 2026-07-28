"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { isAllowedReleaseImageUrl } from "@/lib/release-images";
import type { ReleaseRadarItem } from "@/lib/types/database";

export interface ReleaseItem {
  id: string;
  game: string;
  releaseDate: string;
  releaseDateIso?: string;
  dayOfWeek: string;
  platforms: string[];
  image: string;
  badge: string;
  category: "week" | "upcoming";
  slug?: string;
}

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

function releaseDateValue(item: ReleaseItem) {
  if (item.releaseDateIso) return new Date(`${item.releaseDateIso}T12:00:00Z`);
  const match = item.releaseDate.toLowerCase().match(/^(\d{1,2}) de ([a-zç]+)/);
  if (!match || MONTHS[match[2]] === undefined) return null;
  return new Date(Date.UTC(2026, MONTHS[match[2]], Number(match[1]), 12));
}

export function ReleaseRadarStrip() {
  const supabase = useMemo(() => createDataClient(), []);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      const { data, error } = await supabase
        .from("release_radar_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error || !data || data.length === 0) return;
      const databaseItems = (data as ReleaseRadarItem[]).map((item) => ({
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
      setReleases(databaseItems.sort((a, b) => {
        const first = releaseDateValue(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const second = releaseDateValue(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return first - second || a.game.localeCompare(b.game, "pt-BR");
      }));
    });
  }, [supabase]);

  const currentMonthReleases = useMemo(() => {
    const currentDate = new Date();
    return releases.filter((item) => {
      const date = releaseDateValue(item);
      return date?.getUTCFullYear() === currentDate.getFullYear()
        && date.getUTCMonth() === currentDate.getMonth();
    });
  }, [releases]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -360 : 360;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section className="mb-8 w-full" aria-labelledby="release-radar-title">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center justify-between gap-4">
            <p className="mb-1 text-xs font-bold text-brand-orange">Agenda de jogos</p>
            <Link
              href="/lancamentos"
              className="text-xs font-bold text-brand-orange hover:underline sm:hidden"
            >
              Ver todos →
            </Link>
          </div>
          <h2 id="release-radar-title" className="font-heading text-2xl font-black tracking-[-0.025em] text-white sm:text-3xl">
            Radar de lançamentos
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm">
            Todos os jogos previstos para este mês.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Link
            href="/lancamentos"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3.5 py-2 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
          >
            Ver calendário completo <span aria-hidden="true">→</span>
          </Link>

          <div className="hidden items-center sm:flex">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              className="flex min-h-11 min-w-11 items-center justify-center border-l border-y border-white/10 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Ver lançamentos anteriores"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              className="flex min-h-11 min-w-11 items-center justify-center border border-white/10 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Ver próximos lançamentos"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <div
          ref={scrollContainerRef}
          className="-mx-3 flex snap-x snap-mandatory overflow-x-auto border-y border-white/10 px-3 scrollbar-none sm:mx-0 sm:px-0"
        >
          {currentMonthReleases.map((item) => {
            const CardContent = (
                  <article className="group flex h-full w-[260px] xs:w-[280px] sm:w-[300px] shrink-0 snap-start flex-col border-r border-white/10 bg-background-void transition-colors hover:bg-white/[0.025]">
                    <div className="relative aspect-video w-full overflow-hidden bg-[#0C0D11]">
                      {isAllowedReleaseImageUrl(item.image) ? (
                        <img
                          src={item.image}
                          alt={item.game}
                          className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center">
                          <span className="text-xs font-semibold text-gray-400">Capa pendente</span>
                        </div>
                      )}
                      <span className="absolute right-2 top-2 z-10 border-b-2 border-brand-orange bg-black/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md">
                        {item.badge}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <time className="text-xs font-black uppercase text-brand-orange">{item.releaseDate}</time>
                          <span className="text-[10px] font-semibold text-gray-500">{item.dayOfWeek}</span>
                        </div>
                        <h3 className="font-heading text-sm sm:text-base font-extrabold leading-tight text-white transition-colors group-hover:text-brand-orange line-clamp-2">
                          {item.game}
                        </h3>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-2 border-t border-white/[0.08] pt-3">
                        <p className="text-[10px] font-bold uppercase text-gray-500 truncate">
                          {item.platforms.join(" · ")}
                        </p>
                        {item.slug ? (
                          <span className="shrink-0 text-[10px] font-bold text-gray-300 transition-colors group-hover:text-white">
                            Ler matéria <span aria-hidden="true">→</span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-bold text-gray-500">
                            Detalhes
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );

                if (item.slug) {
                  return (
                    <Link
                      key={item.id}
                      href={`/posts/${item.slug}`}
                      className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange"
                    >
                      {CardContent}
                    </Link>
                  );
                }

                return <div key={item.id} className="shrink-0">{CardContent}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
