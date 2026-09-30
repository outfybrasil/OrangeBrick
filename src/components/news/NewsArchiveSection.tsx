"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface NewsArchiveSectionProps {
  initialSearch?: string;
  initialPeriod?: string;
}

export function NewsArchiveSection({ initialSearch = "", initialPeriod = "todas" }: NewsArchiveSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [period, setPeriod] = useState(initialPeriod === "mes" ? "mes" : "todas");

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== initialSearch) {
        startTransition(() => {
          const params = new URLSearchParams();
          if (period === "mes") params.set("periodo", "mes");
          if (searchTerm.trim().length >= 2) params.set("q", searchTerm.trim());
          const queryStr = params.toString();
          router.push(queryStr ? `/noticias/arquivo?${queryStr}` : "/noticias/arquivo");
        });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm, period, initialSearch, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (period === "mes") params.set("periodo", "mes");
    if (searchTerm.trim().length >= 2) params.set("q", searchTerm.trim());
    const queryStr = params.toString();
    router.push(queryStr ? `/noticias/arquivo?${queryStr}` : "/noticias/arquivo");
  };

  return (
    <section aria-labelledby="archive-section-heading" className="my-14 rounded-sm border border-white/10 bg-[#111217] p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">
            Pesquisa & Histórico
          </span>
          <h2 id="archive-section-heading" className="mt-1 font-heading text-2xl font-black uppercase text-white sm:text-3xl">
            Arquivo Orange Brick
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Encontre qualquer matéria, furo ou análise publicada desde o início do portal.
          </p>
        </div>

        <Link
          href="/noticias/arquivo"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-sm border border-brand-orange/40 bg-[#16171D] px-5 text-xs font-black uppercase tracking-wider text-brand-orange transition-all hover:border-brand-orange hover:bg-brand-orange hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
        >
          Abrir arquivo completo →
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="archive-search-input" className="sr-only">
            Buscar no arquivo
          </label>
          <input
            id="archive-search-input"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título, estúdio, jogo ou assunto..."
            className="min-h-12 w-full rounded-sm border border-white/15 bg-background-void px-4 text-sm text-white placeholder:text-gray-500 focus:border-brand-orange focus:outline-none"
          />
          {isPending && (
            <span className="absolute right-3.5 top-3.5 h-5 w-5 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPeriod("mes")}
            className={`min-h-12 px-4 text-xs font-black uppercase tracking-wider transition-all rounded-sm ${
              period === "mes"
                ? "bg-brand-orange text-white"
                : "border border-white/15 bg-background-void text-gray-400 hover:text-white"
            }`}
          >
            Este mês
          </button>
          <button
            type="button"
            onClick={() => setPeriod("todas")}
            className={`min-h-12 px-4 text-xs font-black uppercase tracking-wider transition-all rounded-sm ${
              period === "todas"
                ? "bg-brand-orange text-white"
                : "border border-white/15 bg-background-void text-gray-400 hover:text-white"
            }`}
          >
            Todas
          </button>
          <button
            type="submit"
            className="min-h-12 rounded-sm bg-brand-orange px-6 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#d94f00] focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            Buscar
          </button>
        </div>
      </form>
    </section>
  );
}
