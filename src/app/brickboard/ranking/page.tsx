"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { divisionLabel, formatXp } from "@/lib/progression";
import { resolveAvatarUrl } from "@/lib/avatar";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { LeaderboardEntry } from "@/lib/types/progression";

export default function RankingPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const { profile } = useAuth();
  const username = profile?.username || null;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("season_leaderboard", {
        target_season_slug: null,
        target_limit: 100,
      });
      setEntries((data || []) as LeaderboardEntry[]);
      setIsLoading(false);
    }
    void load();
  }, [supabase]);

  return (
    <main className="min-h-dvh bg-background-void text-white">
      <PageHeader title="Ranking" />
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <p className="text-xs font-bold text-brand-orange">Temporada de calibração</p>
              <h1 className="mt-3 max-w-4xl font-heading text-[clamp(2.5rem,8vw,5rem)] font-black leading-[0.92] tracking-[-0.03em]">
                O nível fica. A disputa recomeça.
              </h1>
              <p className="mt-5 max-w-[68ch] text-sm leading-6 text-gray-300">
                O ranking considera apenas o XP da temporada. Seu nível vitalício e suas conquistas nunca são apagados.
              </p>
            </div>
            <Link href="/brickboard/como-funciona" className="inline-flex min-h-11 items-center justify-center border border-white/15 px-4 text-xs font-bold hover:border-brand-orange/50">
              Como o XP funciona
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <MyStandingCard entries={entries} username={username} isLoading={isLoading} />
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <h2 className="font-heading text-xl font-bold">Classificação atual</h2>
            <p className="mt-1 text-xs text-gray-500">Mínimo de 100 XP em três dias ativos.</p>
          </div>
          <span className="text-xs text-gray-500">{entries.length} classificados</span>
        </div>

        {isLoading ? (
          <p className="py-16 text-sm text-gray-400">Carregando classificação…</p>
        ) : entries.length === 0 ? (
          <div className="border-y border-white/10 py-16">
            <h2 className="font-heading text-2xl font-bold">A parede ainda está vazia.</h2>
            <p className="mt-2 text-sm text-gray-400">O ranking abre quando os primeiros leitores atingirem os critérios.</p>
          </div>
        ) : (
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {entries.map((entry) => {
              const isMe = Boolean(username && entry.username === username);
              return (
              <li key={entry.username} className={isMe ? "bg-brand-orange/[0.07] ring-1 ring-inset ring-brand-orange/30" : undefined}>
                <Link href={`/profile/${entry.username}`} className="grid min-h-20 grid-cols-[2.5rem_2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-3 px-2 hover:bg-white/[0.03] sm:grid-cols-[3rem_3rem_minmax(0,1fr)_8rem_7rem]">
                  <span className={`font-heading text-lg font-black ${entry.rank <= 3 || isMe ? "text-brand-orange" : "text-gray-500"}`}>{entry.rank}</span>
                  <img src={resolveAvatarUrl(entry.avatar_url, entry.display_name)} alt="" className="h-11 w-11 object-cover" referrerPolicy="no-referrer" />
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{entry.display_name}{isMe && <span className="ml-2 text-xs font-bold text-brand-orange">(você)</span>}</strong>
                    <span className="mt-1 block text-xs text-gray-500">Nível {entry.level} · {entry.active_days} dias ativos</span>
                  </span>
                  <span className="hidden text-xs font-semibold text-gray-300 sm:block">{divisionLabel(entry.division)}</span>
                  <span className="text-right text-sm font-bold text-white">{formatXp(entry.eligible_xp)} <small className="text-xs text-gray-500">XP</small></span>
                </Link>
              </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}

function PageHeader({ title }: { title: string }) {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/brickboard" className="flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">← Brickboard</Link>
        <span className="font-heading text-sm font-black">{title}</span>
      </div>
    </header>
  );
}

function MyStandingCard({ entries, username, isLoading }: { entries: LeaderboardEntry[]; username: string | null; isLoading: boolean }) {
  if (isLoading) return null;
  const myIndex = username ? entries.findIndex((entry) => entry.username === username) : -1;

  return (
    <div className="mb-6 border border-brand-orange/25 bg-brand-orange/[0.06] px-4 py-4 sm:px-5">
      {!username ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">Sua posição</p>
          <p className="mt-1 text-sm text-gray-300">
            Entre na sua conta e acumule XP na temporada para aparecer no ranking.
          </p>
        </>
      ) : myIndex === -1 ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">Sua posição</p>
          <p className="mt-1 text-sm text-gray-300">
            Você ainda não está no top 100. Publique, comente e reaja para entrar na disputa.
          </p>
        </>
      ) : (
        (() => {
          const me = entries[myIndex];
          const ahead = myIndex > 0 ? entries[myIndex - 1] : null;
          const gap = ahead ? Math.max(ahead.eligible_xp - me.eligible_xp + 1, 1) : null;
          return (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">Sua posição</p>
                  <p className="mt-0.5 font-heading text-2xl font-black text-white">
                    #{me.rank}
                    <span className="ml-2 text-sm font-bold text-gray-400">{divisionLabel(me.division)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatXp(me.eligible_xp)} XP</p>
                  {gap !== null && (
                    <p className="mt-0.5 text-xs text-gray-400">Faltam {formatXp(gap)} XP para o #{me.rank - 1}</p>
                  )}
                  {gap === null && <p className="mt-0.5 text-xs text-brand-orange">Você é o líder da temporada</p>}
                </div>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
