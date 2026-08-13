"use client";

import { useEffect, useRef, useState } from "react";
import { createDataClient } from "@/lib/supabase/client";

interface GameResult {
  id: string;
  title: string;
  releaseDate: string;
  platforms: string[];
  referenceImageUrl: string | null;
}

export function GameRadarAutocomplete({ onSelect }: { onSelect: (game: GameResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { session } } = await createDataClient().auth.getSession();
        if (!session) throw new Error("Sessão expirada");
        const response = await fetch(`/api/admin/games?q=${encodeURIComponent(term)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json() as { results?: GameResult[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Falha ao buscar jogos");
        if (currentRequest === requestId.current) setResults(payload.results || []);
      } catch (searchError) {
        if (currentRequest === requestId.current) setError(searchError instanceof Error ? searchError.message : "Falha ao buscar jogos");
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative mb-5">
      <label htmlFor="game-catalog-search" className="mb-1.5 block text-xs font-semibold text-gray-300">Buscar no catálogo de jogos</label>
      <input id="game-catalog-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome oficial do jogo" autoComplete="off" className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111218] px-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-brand-orange" />
      {isLoading && <span className="absolute right-4 top-10 size-4 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" aria-label="Buscando jogos" />}
      {error && <p className="mt-2 text-xs text-amber-200">{error}</p>}
      {results.length > 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#111218] p-1 shadow-2xl shadow-black/60">
          {results.map((game) => (
            <button key={game.id} type="button" onClick={() => { onSelect(game); setQuery(game.title); setResults([]); }} className="flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">
              {game.referenceImageUrl ? <img src={game.referenceImageUrl} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" /> : <span className="h-10 w-16 shrink-0 rounded-md bg-white/[0.05]" />}
              <span className="min-w-0"><strong className="block truncate text-xs text-white">{game.title}</strong><span className="mt-1 block truncate text-[10px] text-gray-400">{[game.releaseDate, game.platforms.join(" · ")].filter(Boolean).join(" · ") || "Dados incompletos"}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
