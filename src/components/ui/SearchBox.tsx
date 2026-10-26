"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SearchSuggestion } from "@/lib/content-discovery";

type Suggestions = { query: string; items: SearchSuggestion[]; message: string };

export function SearchBox({ initialQuery = "", compact = false }: { initialQuery?: string; compact?: boolean }) {
  const id = useId();
  const pathname = usePathname();
  const isEn = pathname?.startsWith("/en");
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const links = useRef<Array<HTMLAnchorElement | null>>([]);
  useEffect(() => {
    if (query.trim().length < 2 || !open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.slice(0, 80))}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(7000)]) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || (isEn ? "Suggestions unavailable." : "Sugestões indisponíveis. Use a busca completa."));
        if (!controller.signal.aborted) setResult({ query, items: data.items, message: data.partial ? (isEn ? "Some suggestions are unavailable." : "Algumas sugestões estão indisponíveis. Você pode usar a busca completa.") : data.items.length ? "" : (isEn ? "No suggestions found." : "Sem sugestões. Tente a busca completa para consultar o acervo.") });
      } catch (cause) {
        if (!controller.signal.aborted) setResult({ query, items: [], message: cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : (isEn ? "Suggestions unavailable." : "Sugestões indisponíveis. Use a busca completa.") });
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, open, isEn]);
  const visible = open && query.trim().length >= 2;
  const suggestions = result?.query === query ? result.items : [];
  return <form role="search" method="GET" action="/busca" className="relative flex w-full gap-2" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.querySelector("input")?.focus(); setOpen(false); } }}>
    <div className="relative min-w-0 flex-1"><input id={`${id}-input`} name="q" type="search" role="combobox" aria-haspopup="dialog" inputMode="search" autoComplete="off" data-site-search-input value={query} maxLength={80} minLength={2} required onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={event => { if (event.key === "ArrowDown" && visible && suggestions.length) { event.preventDefault(); links.current[0]?.focus(); } }} aria-label={isEn ? "Search articles, games or community" : "Buscar matérias, jogos, leitores ou conversas"} aria-expanded={visible} aria-controls={visible ? `${id}-suggestions` : undefined} placeholder={compact ? (isEn ? "Search Orange Brick   /" : "Buscar no Orange Brick   /") : (isEn ? "Article, game or community discussion" : "Matéria, jogo, leitor ou conversa")} className={compact ? "h-9 w-full border border-white/10 bg-white/[0.04] px-3 text-xs text-white outline-none focus:border-brand-orange/60" : "min-h-12 w-full rounded-xl border border-white/15 bg-card-slate/40 px-4 text-sm text-white outline-none focus:border-brand-orange/60"} /></div>
    {!compact && <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-brand-orange px-4 text-xs font-black uppercase text-black sm:px-6">{isEn ? "Search" : "Buscar"}</button>}
    {visible && <div id={`${id}-suggestions`} className="absolute inset-x-0 top-full z-[60] mt-2 max-h-[60dvh] overflow-y-auto rounded-xl border border-white/15 bg-[#111217] p-2 shadow-xl" role="dialog" aria-label="Sugestões de busca">
      <p role="status" className="px-2 py-1 text-xs text-gray-400">{loading || result?.query !== query ? (isEn ? "Searching..." : "Buscando sugestões…") : (isEn ? `${suggestions.length} suggestions` : `${suggestions.length} sugestões`)}</p>
      {suggestions.length > 0 && <ul>{suggestions.map((item, index) => <li key={item.id}><Link ref={node => { links.current[index] = node; }} href={item.href} onClick={() => setOpen(false)} onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = index + (event.key === "ArrowDown" ? 1 : -1); if (next < 0) document.getElementById(`${id}-input`)?.focus(); else links.current[Math.min(next, suggestions.length - 1)]?.focus(); } }} className="block rounded-lg px-2 py-3 text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-orange"><span className="mb-1 block text-[10px] font-bold uppercase text-brand-orange">{item.kind}</span><span className="block break-words font-semibold text-white">{item.label}</span></Link></li>)}</ul>}
      {result?.query === query && result.message && <p className="px-2 py-3 text-xs leading-5 text-gray-400">{result.message}</p>}
      <Link href={`/busca?q=${encodeURIComponent(query)}`} onClick={() => setOpen(false)} className="mt-1 flex min-h-11 items-center rounded-lg border-t border-white/10 px-2 text-xs font-bold text-brand-orange">{isEn ? "See full results →" : "Ver resultados completos →"}</Link>
    </div>}
  </form>;
}
