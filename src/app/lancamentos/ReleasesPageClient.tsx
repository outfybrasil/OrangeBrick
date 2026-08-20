"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/ui/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { createDataClient } from "@/lib/supabase/client";
import type { ReleaseItem } from "@/components/feed/ReleaseRadarStrip";
import { isAllowedReleaseImageUrl } from "@/lib/release-images";
import { useAuth } from "@/lib/contexts/AuthContext";
import type {
  ReleaseHypeCount,
  ReleaseHypeVote,
  ReleaseHypeVoteSelection,
  ReleaseRadarItem,
} from "@/lib/types/database";

type HypeVoteType = ReleaseHypeVote["vote_type"];
type HypeCounts = Record<HypeVoteType, number>;

const EMPTY_HYPE_COUNTS: HypeCounts = { buy: 0, watch: 0, skip: 0 };
const HYPE_OPTIONS: { type: HypeVoteType; label: string; shortLabel: string }[] = [
  { type: "buy", label: "Já garanti", shortLabel: "Garanti" },
  { type: "watch", label: "No meu radar", shortLabel: "Radar" },
  { type: "skip", label: "Passo reto", shortLabel: "Passo" },
];

function ReleaseHypeMeter({
  releaseId,
  counts,
  selectedVote,
  isVoting,
  onVote,
}: {
  releaseId: string;
  counts: HypeCounts;
  selectedVote?: HypeVoteType;
  isVoting: boolean;
  onVote: (releaseId: string, vote: HypeVoteType) => void;
}) {
  const total = counts.buy + counts.watch + counts.skip;
  const positiveShare = total === 0 ? 0 : Math.round(((counts.buy + counts.watch) / total) * 100);

  return (
    <div className="mt-4 border-t border-white/[0.08] pt-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
          Termômetro da comunidade
        </span>
        <span className="text-xs font-bold tabular-nums text-gray-300">
          {total === 0 ? "Seja o primeiro" : `${positiveShare}% no hype`}
        </span>
      </div>
      <div className="mb-2.5 flex h-1 overflow-hidden bg-white/[0.06]" aria-hidden="true">
        {total > 0 && (
          <>
            <span className="bg-brand-orange" style={{ width: `${(counts.buy / total) * 100}%` }} />
            <span className="bg-[#F4A261]" style={{ width: `${(counts.watch / total) * 100}%` }} />
            <span className="bg-gray-600" style={{ width: `${(counts.skip / total) * 100}%` }} />
          </>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {HYPE_OPTIONS.map((option) => {
          const isSelected = selectedVote === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onVote(releaseId, option.type)}
              disabled={isVoting}
              aria-pressed={isSelected}
              aria-label={`${option.label}: ${counts[option.type]} votos`}
              className={`min-h-11 border px-1.5 text-xs font-extrabold uppercase tracking-[0.04em] transition-colors disabled:cursor-wait disabled:opacity-60 ${
                isSelected
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-white/10 bg-white/[0.025] text-gray-400 hover:border-white/25 hover:text-white"
              }`}
            >
              <span className="block sm:hidden">{option.shortLabel}</span>
              <span className="hidden sm:block">{option.label}</span>
              <span className={`ml-1 tabular-nums ${isSelected ? "text-white/75" : "text-gray-600"}`}>
                {counts[option.type]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getMonthGroupKey(dateStr: string): { key: string; label: string } {
  const lower = dateStr.toLowerCase();
  if (lower.includes("janeiro")) return { key: "2026-01", label: "Janeiro de 2026" };
  if (lower.includes("fevereiro")) return { key: "2026-02", label: "Fevereiro de 2026" };
  if (lower.includes("março")) return { key: "2026-03", label: "Março de 2026" };
  if (lower.includes("abril")) return { key: "2026-04", label: "Abril de 2026" };
  if (lower.includes("maio")) return { key: "2026-05", label: "Maio de 2026" };
  if (lower.includes("junho")) return { key: "2026-06", label: "Junho de 2026" };
  if (lower.includes("julho")) return { key: "2026-07", label: "Julho de 2026" };
  if (lower.includes("agosto")) return { key: "2026-08", label: "Agosto de 2026" };
  if (lower.includes("setembro")) return { key: "2026-09", label: "Setembro de 2026" };
  if (lower.includes("outubro")) return { key: "2026-10", label: "Outubro de 2026" };
  if (lower.includes("novembro")) return { key: "2026-11", label: "Novembro de 2026" };
  if (lower.includes("dezembro")) return { key: "2026-12", label: "Dezembro de 2026" };
  return { key: "other", label: "A confirmar" };
}

function extractDayNumber(dateStr: string, isoStr?: string): number {
  if (isoStr) {
    const parts = isoStr.split("-");
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) return parsed;
    }
  }
  const match = dateStr.match(/^(\d{1,2})\s+de/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 99;
}

export function ReleasesPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createDataClient(), []);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState(true);
  const [releaseError, setReleaseError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [hypeCounts, setHypeCounts] = useState<Record<string, HypeCounts>>({});
  const [myVotes, setMyVotes] = useState<Record<string, HypeVoteType>>({});
  const [votingReleaseId, setVotingReleaseId] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<{ releaseId: string; vote: HypeVoteType } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [hypeError, setHypeError] = useState("");
  const hasPositionedCalendar = useRef(false);
  const todayIso = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const loadReleases = useCallback(async () => {
    setIsLoadingReleases(true);
    setReleaseError("");
    const { data, error } = await supabase
      .from("release_radar_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      setReleaseError("Não foi possível carregar o calendário de lançamentos.");
      setIsLoadingReleases(false);
      return;
    }
    const databaseReleases = ((data || []) as ReleaseRadarItem[]).map((item): ReleaseItem => ({
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
    const now = new Date();
    const currentMonthStart = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-01";
    setReleases(databaseReleases.filter((item) => !item.releaseDateIso || item.releaseDateIso >= currentMonthStart));
    setIsLoadingReleases(false);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(loadReleases);
  }, [loadReleases]);

  const loadHype = useCallback(async () => {
    const { data: countData, error: countError } = await supabase.rpc("get_release_hype_counts");
    if (countError) {
      setHypeError("O termômetro está indisponível agora.");
      return;
    }

    const nextCounts: Record<string, HypeCounts> = {};
    for (const row of (countData || []) as ReleaseHypeCount[]) {
      const current = nextCounts[row.release_id] || { ...EMPTY_HYPE_COUNTS };
      current[row.vote_type] = Number(row.vote_count);
      nextCounts[row.release_id] = current;
    }
    setHypeCounts(nextCounts);

    if (!user) {
      setMyVotes({});
      return;
    }

    const { data: voteData } = await supabase.rpc("get_my_release_hype_votes");
    const nextVotes: Record<string, HypeVoteType> = {};
    for (const row of (voteData || []) as ReleaseHypeVoteSelection[]) {
      nextVotes[row.release_id] = row.vote_type;
    }
    setMyVotes(nextVotes);
  }, [supabase, user]);

  useEffect(() => {
    queueMicrotask(loadHype);
  }, [loadHype]);

  const commitVote = useCallback(async (releaseId: string, vote: HypeVoteType) => {
    if (!user || votingReleaseId) return;

    const previousVote = myVotes[releaseId];
    const previousCounts = hypeCounts[releaseId] || { ...EMPTY_HYPE_COUNTS };
    const nextVote = previousVote === vote ? undefined : vote;
    const nextCounts = { ...previousCounts };

    if (previousVote) nextCounts[previousVote] = Math.max(0, nextCounts[previousVote] - 1);
    if (nextVote) nextCounts[nextVote] += 1;

    setVotingReleaseId(releaseId);
    setHypeError("");
    setHypeCounts((current) => ({ ...current, [releaseId]: nextCounts }));
    setMyVotes((current) => {
      const next = { ...current };
      if (nextVote) next[releaseId] = nextVote;
      else delete next[releaseId];
      return next;
    });

    const operation = nextVote
      ? supabase
          .from("release_hype_votes")
          .upsert(
            { release_id: releaseId, user_id: user.id, vote_type: nextVote },
            { onConflict: "release_id,user_id" }
          )
      : supabase
          .from("release_hype_votes")
          .delete()
          .eq("release_id", releaseId)
          .eq("user_id", user.id);

    const { error } = await operation;
    if (error) {
      setHypeCounts((current) => ({ ...current, [releaseId]: previousCounts }));
      setMyVotes((current) => {
        const next = { ...current };
        if (previousVote) next[releaseId] = previousVote;
        else delete next[releaseId];
        return next;
      });
      setHypeError("Seu voto não foi salvo. Tente novamente.");
    }
    setVotingReleaseId(null);
  }, [hypeCounts, myVotes, supabase, user, votingReleaseId]);

  const handleVote = useCallback((releaseId: string, vote: HypeVoteType) => {
    if (!user) {
      setPendingVote({ releaseId, vote });
      setIsAuthModalOpen(true);
      return;
    }
    void commitVote(releaseId, vote);
  }, [commitVote, user]);

  const filteredReleases = useMemo(() => {
    return releases.filter((item) => {
      if (search) {
        const query = search.toLowerCase();
        const matchesGame = item.game.toLowerCase().includes(query);
        const matchesBadge = item.badge.toLowerCase().includes(query);
        if (!matchesGame && !matchesBadge) return false;
      }
      if (selectedPlatform !== "all") {
        const hasPlatform = item.platforms.some((p) =>
          p.toLowerCase().includes(selectedPlatform.toLowerCase())
        );
        if (!hasPlatform) return false;
      }
      return true;
    });
  }, [releases, search, selectedPlatform]);

  const groupedReleases = useMemo(() => {
    const groups = new Map<string, { label: string; items: ReleaseItem[] }>();
    for (const item of filteredReleases) {
      const month = getMonthGroupKey(item.releaseDate);
      const group = groups.get(month.key) || { label: month.label, items: [] };
      group.items.push(item);
      groups.set(month.key, group);
    }
    return [...groups.entries()]
      .map(([key, group]) => ({
        key,
        ...group,
        items: group.items.sort((first, second) => {
          const dayA = extractDayNumber(first.releaseDate, first.releaseDateIso);
          const dayB = extractDayNumber(second.releaseDate, second.releaseDateIso);
          if (dayA !== dayB) return dayA - dayB;
          return first.game.localeCompare(second.game, "pt-BR");
        }),
      }))
      .sort((first, second) => {
        if (first.key === "other") return 1;
        if (second.key === "other") return -1;
        return first.key.localeCompare(second.key);
      });
  }, [filteredReleases]);

  useEffect(() => {
    if (hasPositionedCalendar.current || releases.length === 0 || search || selectedPlatform !== "all") return;
    const datedReleases = releases
      .filter((item) => item.releaseDateIso)
      .sort((first, second) => first.releaseDateIso!.localeCompare(second.releaseDateIso!));
    const target = datedReleases.find((item) => item.releaseDateIso! >= todayIso) || datedReleases.at(-1);
    if (!target) return;

    hasPositionedCalendar.current = true;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`release-${target.id}`)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [releases, search, selectedPlatform, todayIso]);

  const weeklyHypeRanking = useMemo(() => {
    return releases
      .filter((item) => item.category === "week")
      .map((item) => {
        const counts = hypeCounts[item.id] || EMPTY_HYPE_COUNTS;
        return {
          item,
          counts,
          score: counts.buy * 3 + counts.watch * 2,
          total: counts.buy + counts.watch + counts.skip,
        };
      })
      .filter((entry) => entry.total > 0)
      .sort((first, second) => second.score - first.score || second.total - first.total)
      .slice(0, 5);
  }, [hypeCounts, releases]);

  return (
    <div className="min-h-dvh bg-background-void text-white">
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-card-slate/30 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 transition-colors hover:text-white"
          >
            ← Voltar para a Home
          </button>
          <Link href="/" className="group flex items-center gap-2">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick"
              style={{ maxHeight: "32px", maxWidth: "44px", width: "auto", height: "auto" }}
              className="h-7 sm:h-8 w-auto max-h-8 max-w-11 object-contain transform group-hover:scale-105 transition-transform duration-200 shrink-0"
            />
            <span className="font-heading text-base sm:text-lg font-black tracking-wider text-white uppercase group-hover:text-brand-orange transition-colors whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <div className="border-b border-white/10 bg-card-slate/10 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-brand-orange">
            Calendário de Games 2026
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Lançamentos <span className="text-brand-orange">Oficiais</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
            Agenda completa dos principais jogos confirmados para PlayStation, Xbox, Nintendo Switch, Switch 2 e PC em 2026.
          </p>

          {/* Filtros e Busca */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Buscar por nome do jogo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-11 w-full border border-white/10 bg-background-void px-4 text-sm text-white placeholder:text-gray-500 focus:border-brand-orange focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                ["all", "Todas as plataformas"],
                ["ps5", "PS5"],
                ["xsx", "Xbox Series"],
                ["switch", "Nintendo"],
                ["pc", "PC"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPlatform(key)}
                  className={`min-h-11 border px-3 text-xs font-bold transition-colors ${
                    selectedPlatform === key
                      ? "border-brand-orange bg-brand-orange text-white"
                      : "border-white/10 bg-card-slate/40 text-gray-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grade Principal de Lançamentos */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="mb-12 border-y border-white/10" aria-labelledby="weekly-hype-title">
          <div className="grid gap-0 lg:grid-cols-[0.8fr_2.2fr]">
            <div className="border-b border-white/10 py-6 lg:border-b-0 lg:border-r lg:pr-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-orange">
                Voto da comunidade
              </p>
              <h2 id="weekly-hype-title" className="mt-2 font-heading text-2xl font-black leading-none text-white sm:text-3xl">
                Os mais aguardados da semana
              </h2>
              <p className="mt-3 max-w-sm text-xs leading-5 text-gray-400">
                Pré-venda vale três pontos. Entrar no radar vale dois. Sem algoritmo escondido.
              </p>
            </div>

            <div className="py-2 lg:pl-8">
              {weeklyHypeRanking.length === 0 ? (
                <div className="flex min-h-28 items-center">
                  <p className="text-sm text-gray-400">
                    O ranking abre assim que chegar o primeiro voto.
                  </p>
                </div>
              ) : (
                <ol className="divide-y divide-white/[0.08]">
                  {weeklyHypeRanking.map(({ item, counts, total }, index) => (
                    <li key={item.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3">
                      <span className={`font-heading text-xl font-black tabular-nums ${index === 0 ? "text-brand-orange" : "text-gray-600"}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-white">{item.game}</p>
                        <p className="mt-0.5 text-xs uppercase tracking-wide text-gray-400">
                          {counts.buy} garantiram · {counts.watch} no radar
                        </p>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-gray-400">
                        {total} {total === 1 ? "voto" : "votos"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </section>

        {hypeError && (
          <div role="status" className="mb-6 border-l-2 border-brand-orange bg-brand-orange/[0.06] px-4 py-3 text-xs text-gray-300">
            {hypeError}
          </div>
        )}

        {isLoadingReleases ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Carregando lançamentos">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse border border-white/10 bg-white/[0.025]" />)}
          </div>
        ) : releaseError ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-4 border-y border-white/10 text-center" role="alert">
            <p className="text-sm text-gray-300">{releaseError}</p>
            <button type="button" onClick={() => void loadReleases()} className="min-h-11 border border-brand-orange/40 px-4 text-xs font-bold text-brand-orange hover:bg-brand-orange/10">
              Tentar novamente
            </button>
          </div>
        ) : groupedReleases.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-gray-300">Nenhum jogo corresponde aos filtros selecionados.</p>
            {(search || selectedPlatform !== "all") && (
              <button type="button" onClick={() => { setSearch(""); setSelectedPlatform("all"); }} className="mt-4 min-h-11 border border-white/15 px-4 text-xs font-bold text-white hover:border-brand-orange hover:text-brand-orange">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {groupedReleases.map((group) => (
              <section key={group.key} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                  <span className="h-6 w-2.5 rounded-full bg-brand-orange shadow-[0_0_12px_#FF5E00]" />
                  <h2 className="font-heading text-xl font-black uppercase text-white sm:text-2xl">
                    {group.label}
                  </h2>
                  <span className="ml-auto text-xs font-mono text-gray-500">
                    {group.items.length} {group.items.length === 1 ? "lançamento" : "lançamentos"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      id={`release-${item.id}`}
                      data-current-release={item.releaseDateIso === todayIso ? "true" : undefined}
                      className={`group scroll-mt-20 flex flex-col overflow-hidden bg-background-void transition-colors hover:border-brand-orange/40 hover:bg-white/[0.025] ${
                        item.releaseDateIso === todayIso
                          ? "border border-brand-orange/70"
                          : "border border-white/10"
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-[#0C0D11]">
                        {isAllowedReleaseImageUrl(item.image) ? (
                          <img
                            src={item.image}
                            alt={item.game}
                            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center">
                            <span className="text-xs font-semibold text-gray-500">Capa pendente</span>
                          </div>
                        )}
                        <span className="absolute right-2 top-2 z-10 border-b-2 border-brand-orange bg-black/80 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white shadow-md">
                          {item.badge}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <div className="mb-2 flex items-baseline justify-between gap-2">
                            <time dateTime={item.releaseDateIso} className="text-xs font-black uppercase text-brand-orange">
                              {item.releaseDateIso === todayIso ? `Hoje · ${item.releaseDate}` : item.releaseDate}
                            </time>
                            <span className="text-xs font-semibold text-gray-400">
                              {item.dayOfWeek}
                            </span>
                          </div>
                          <h3 className="font-heading text-sm font-extrabold leading-tight text-white transition-colors group-hover:text-brand-orange sm:text-base line-clamp-2">
                            {item.game}
                          </h3>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-2">
                          <p className="truncate text-xs font-bold uppercase tracking-wide text-gray-400">
                            {item.platforms.join(" · ")}
                          </p>
                          {item.slug ? (
                            <Link
                              href={`/posts/${item.slug}`}
                              className="shrink-0 text-xs font-bold text-brand-orange hover:underline"
                            >
                              Ver matéria →
                            </Link>
                          ) : (
                            <span className="shrink-0 text-xs font-bold text-gray-400">
                              Confirmado
                            </span>
                          )}
                        </div>

                        <ReleaseHypeMeter
                          releaseId={item.id}
                          counts={hypeCounts[item.id] || EMPTY_HYPE_COUNTS}
                          selectedVote={myVotes[item.id]}
                          isVoting={votingReleaseId === item.id}
                          onVote={handleVote}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingVote(null);
        }}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          if (pendingVote) setHypeError("Volte ao Radar depois do acesso para confirmar seu voto.");
        }}
      />
    </div>
  );
}
