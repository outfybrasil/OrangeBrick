"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CoverflowGallery from "@/components/originkit/ui/coverflowgallery-custom-style";
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

function saoPauloTodayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function releaseDateIso(item: ReleaseItem) {
  if (item.releaseDateIso) return item.releaseDateIso;
  const date = releaseDateValue(item);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function ReleaseRadarStrip() {
  const supabase = useMemo(() => createDataClient(), []);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const loadReleases = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("release_radar_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      setLoadError("Não foi possível carregar os lançamentos.");
      setIsLoading(false);
      return;
    }
    const databaseItems = ((data || []) as ReleaseRadarItem[]).map((item) => ({
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
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(loadReleases);
  }, [loadReleases]);

  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    map.set("all", "Todos os meses");
    for (const item of releases) {
      const match = item.releaseDate.toLowerCase().match(/^(\d{1,2}) de ([a-zç]+)/);
      if (match) {
        const monthKey = match[2];
        const capitalized = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
        map.set(monthKey, `${capitalized} 2026`);
      }
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [releases]);

  const [todayIso] = useState(() => saoPauloTodayIso());

  const displayedReleases = useMemo(() => {
    if (selectedMonth !== "all") {
      return releases.filter((item) => {
        const match = item.releaseDate.toLowerCase().match(/^(\d{1,2}) de ([a-zç]+)/);
        return match && match[2] === selectedMonth;
      });
    }
    const upcoming = releases
      .filter((item) => {
        const iso = releaseDateIso(item);
        return iso !== null && iso >= todayIso;
      })
      .sort((first, second) => {
        const firstDate = releaseDateIso(first) || "9999-12-31";
        const secondDate = releaseDateIso(second) || "9999-12-31";
        return firstDate.localeCompare(secondDate) || first.game.localeCompare(second.game, "pt-BR");
      });
    if (upcoming.length > 0) return upcoming.slice(0, 14);
    return releases.filter((item) => releaseDateIso(item) !== null).slice(-8);
  }, [releases, selectedMonth, todayIso]);

  const coverflowSlides = useMemo(() => displayedReleases.map((item) => ({
    image: {
      src: isAllowedReleaseImageUrl(item.image) ? item.image : undefined,
      alt: `Arte oficial de ${item.game}`,
    },
    title: `${item.game}\n${item.releaseDate} · ${item.platforms.join(" · ")}`,
  })), [displayedReleases]);

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
            {selectedMonth === "all"
              ? "Jogos organizados por mês de lançamento."
              : `Lançamentos confirmados para ${monthOptions.find((m) => m.key === selectedMonth)?.label || ""}.`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Link
            href="/lancamentos"
            className="inline-flex min-h-11 items-center gap-1.5 border border-brand-orange/30 bg-brand-orange/10 px-3.5 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
          >
            Ver calendário completo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {!isLoading && monthOptions.length > 1 && (
        <div className="mt-3 flex max-w-full items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="shrink-0 font-bold uppercase tracking-wider text-gray-400">Filtrar mês:</span>
          {monthOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedMonth(option.key)}
              className={`min-h-11 shrink-0 rounded-sm border px-3 text-xs font-bold transition-all ${
                selectedMonth === option.key
                  ? "border-brand-orange bg-brand-orange text-black font-black"
                  : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="pt-3" aria-live="polite">
        {isLoading && (
          <div className="grid grid-cols-1 gap-px overflow-hidden border-y border-white/10 bg-white/10 sm:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse bg-background-void" />)}
          </div>
        )}
        {!isLoading && loadError && (
          <div className="flex min-h-32 flex-col items-start justify-center gap-3 border-y border-white/10 py-5">
            <p className="text-sm text-gray-300">{loadError}</p>
            <button type="button" onClick={() => void loadReleases()} className="min-h-11 border border-brand-orange/40 px-4 text-xs font-bold text-brand-orange hover:bg-brand-orange/10">
              Tentar novamente
            </button>
          </div>
        )}
        {!isLoading && !loadError && displayedReleases.length === 0 && (
          <div className="flex min-h-32 items-center border-y border-white/10 py-5">
            <p className="text-sm text-gray-300">Nenhum lançamento encontrado para o mês selecionado.</p>
          </div>
        )}
        {!isLoading && !loadError && displayedReleases.length > 0 && (
          <div className="relative -mx-3 h-[340px] overflow-hidden border-y border-white/10 bg-[#08090c] sm:mx-0 sm:h-[375px] md:h-[390px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-brand-orange/70" />
            <CoverflowGallery
              slides={coverflowSlides}
              cardWidth={560}
              cardHeight={315}
              radius={2}
              tilt={11}
              sideTilt={3}
              gap={7}
              opacity={52}
              autoplay={false}
              showTitle
              titleColor="#ffffff"
              titleFont={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 900, lineHeight: "1.25em" }}
              titlePosition={{ position: "bottomLeft", paddingLeft: 22, paddingRight: 22, paddingBottom: 22 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
            <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-brand-orange/30 bg-black/90 px-4 py-1 text-xs font-bold text-brand-orange shadow-lg">
              {selectedMonth === "all"
                ? `${displayedReleases.length} jogos no radar`
                : `${displayedReleases.length} jogos em ${monthOptions.find((m) => m.key === selectedMonth)?.label}`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
