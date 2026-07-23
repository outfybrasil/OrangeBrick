"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { ReleaseRadarStrip } from "@/components/feed/ReleaseRadarStrip";
import { PlatformBar } from "@/components/feed/PlatformBar";
import { UserNav } from "@/components/auth/UserNav";
import { Footer } from "@/components/ui/Footer";
import type { PostCategory } from "@/lib/types/database";

function HomeContent() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") as PostCategory | null;
  const qParam = searchParams.get("q") || "";
  const tagParam = searchParams.get("tag") || null;

  const [searchQuery, setSearchQuery] = useState(qParam);
  const activeTag = tagParam;

  const validCategories: PostCategory[] = ["breaking", "review", "hardware", "opinion", "industry", "modding"];
  const activeCategory = categoryParam && validCategories.includes(categoryParam) ? categoryParam : null;

  const handleCategoryClick = (catValue: PostCategory | null) => {
    const params = new URLSearchParams();
    if (catValue) params.set("category", catValue);
    if (searchQuery) params.set("q", searchQuery);
    if (activeTag) params.set("tag", activeTag);
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (activeTag) params.set("tag", activeTag);
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  };

  return (
    <>
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/10 py-3 sm:py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 sm:flex-nowrap sm:gap-6 sm:px-6 lg:px-8">
          {/* LOGO */}
          <button
            type="button"
            className="group flex min-h-11 min-w-0 shrink-0 items-center gap-2 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-brand-orange sm:gap-3"
            onClick={() => handleCategoryClick(null)}
            aria-label="Voltar para todas as notícias"
          >
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              style={{ maxHeight: "36px", maxWidth: "48px", width: "auto", height: "auto" }}
              className="h-8 sm:h-9 w-auto object-contain transform group-hover:scale-[1.05] transition-transform duration-300 shrink-0"
            />
            <span className="hidden sm:inline text-xl sm:text-2xl font-heading font-extrabold text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors duration-300 shrink-0 whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </button>

          {/* BARRA DE PESQUISA EXPANDIDA NO CENTRO */}
          <div className="order-3 w-full min-w-0 flex-none sm:order-none sm:mx-6 sm:flex-1 sm:max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <label htmlFor="site-search" className="sr-only">
                Buscar notícias
              </label>
              <input
                id="site-search"
                name="q"
                aria-label="Buscar notícias"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar matérias, jogos, hardware..."
                className="min-h-11 w-full rounded-xl border border-brand-orange-muted/20 bg-background-void/90 px-3 pl-9 text-xs text-white outline-none transition-all placeholder:text-gray-500 focus:border-brand-orange/60 focus:ring-1 focus:ring-brand-orange/30 sm:px-4 sm:pl-10 sm:text-sm shadow-inner"
              />
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>
          </div>

          {/* BOTÕES DE AÇÃO NA DIREITA */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              href="/brickboard"
              aria-label="Abrir Brickboard"
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-brand-orange/40 bg-brand-orange/10 px-3 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange sm:px-3.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="hidden xs:inline">Brickboard</span>
            </Link>

            <UserNav />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="sr-only">Orange Brick — notícias de games, hardware e indústria</h1>
        <ReleaseRadarStrip />
        <PlatformBar />
        <NewsFeed
          category={activeCategory}
          searchQuery={searchQuery}
          activeTag={activeTag}
          onSelectCategory={handleCategoryClick}
        />
      </main>

      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background-void text-mono text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            <span className="text-gray-400 font-mono">Carregando portal...</span>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
