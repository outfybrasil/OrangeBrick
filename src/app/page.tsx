"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { ReleaseRadarStrip } from "@/components/feed/ReleaseRadarStrip";
import { PlatformBar } from "@/components/feed/PlatformBar";
import { CommunityPulse } from "@/components/feed/CommunityPulse";
import { SinceLastVisit } from "@/components/feed/SinceLastVisit";
import { HomeEngagementTracker } from "@/components/feed/HomeEngagementTracker";
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

  const activeTag = tagParam;

  const validCategories: PostCategory[] = ["breaking", "review", "hardware", "opinion", "industry", "modding"];
  const activeCategory = categoryParam && validCategories.includes(categoryParam) ? categoryParam : null;

  const handleCategoryClick = (catValue: PostCategory | null) => {
    const params = new URLSearchParams();
    if (catValue) params.set("category", catValue);
    if (qParam) params.set("q", qParam);
    if (activeTag) params.set("tag", activeTag);
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const submittedQuery = String(formData.get("q") || "").trim();
    if (submittedQuery) params.set("q", submittedQuery);
    if (activeTag) params.set("tag", activeTag);
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0e12]/98 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center h-14 px-4 sm:px-6 lg:px-8 gap-3">
          <Link
            href="/"
            className="group flex min-h-11 shrink-0 items-center gap-2.5 text-left"
            aria-label="Ir para a página inicial do Orange Brick"
          >
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              style={{ maxHeight: "32px", maxWidth: "42px", width: "auto", height: "auto" }}
              className="h-8 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 shrink-0"
            />
            <span className="hidden sm:inline text-lg font-heading font-extrabold text-white uppercase tracking-widest group-hover:text-brand-orange transition-colors shrink-0 whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>

          <div className="flex-1 max-w-xs hidden md:block mx-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <label htmlFor="site-search" className="sr-only">Buscar notícias</label>
              <input
                id="site-search"
                name="q"
                aria-label="Buscar notícias"
                type="text"
                defaultValue={qParam}
                key={`desktop-${qParam}`}
                placeholder="Buscar no OrangeBrick"
                className="h-9 w-full border border-white/10 bg-white/[0.04] px-3 pl-9 text-xs text-white outline-none transition-all placeholder:text-gray-500 focus:border-brand-orange/40 focus:bg-white/[0.06]"
              />
              <svg className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>
          </div>

          <nav className="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              className="hidden min-h-11 items-center px-3 text-xs font-semibold text-gray-400 transition-colors hover:text-white sm:flex"
              onClick={() => document.getElementById("ultimas-noticias")?.scrollIntoView({ behavior: "smooth" })}
            >
              Notícias
            </button>
            <Link href="/assuntos" className="hidden min-h-11 items-center px-3 text-xs font-semibold text-gray-400 transition-colors hover:text-white sm:flex">
              Assuntos
            </Link>
            <Link href="/em-alta" className="hidden min-h-11 items-center px-3 text-xs font-semibold text-gray-400 transition-colors hover:text-white lg:flex">
              Em alta
            </Link>
            <Link href="/minha-orange" className="hidden min-h-11 items-center px-3 text-xs font-semibold text-gray-400 transition-colors hover:text-white lg:flex">
              Minha Orange
            </Link>
            <Link href="/busca" className="hidden min-h-11 items-center px-3 text-xs font-semibold text-gray-400 transition-colors hover:text-white lg:flex">Buscar</Link>
            <Link
              href="/brickboard"
              data-home-event="brickboard"
              data-home-target="header"
              aria-label="Abrir Brickboard"
              className="mx-1 flex min-h-11 items-center gap-1.5 whitespace-nowrap border border-brand-orange bg-brand-orange/10 px-3 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="hidden sm:inline">Brickboard</span>
            </Link>
            <UserNav />
          </nav>
        </div>
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1">
            <label htmlFor="site-search-mobile" className="sr-only">Buscar notícias</label>
            <input
              id="site-search-mobile"
              name="q"
              type="search"
              defaultValue={qParam}
              key={`mobile-${qParam}`}
              placeholder="Buscar notícias"
              className="h-11 w-full border border-white/10 bg-white/[0.04] pl-10 pr-3 text-white outline-none placeholder:text-gray-500 focus:border-brand-orange/50 focus:bg-white/[0.06]"
            />
            <svg aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
          <Link href="/assuntos" className="flex min-h-11 shrink-0 items-center border border-white/10 px-3 text-xs font-bold text-gray-300 transition-colors hover:border-white/20 hover:text-white">
            Assuntos
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <HomeEngagementTracker />
        <h1 className="sr-only">Orange Brick — notícias de games, hardware e indústria</h1>
        <NewsFeed
          category={activeCategory}
          searchQuery={qParam}
          activeTag={activeTag}
          onSelectCategory={handleCategoryClick}
          homeHighlights={
            <>
              <SinceLastVisit />
              <CommunityPulse />
              <div data-home-event="radar" data-home-target="home">
                <ReleaseRadarStrip />
              </div>
              <PlatformBar />
            </>
          }
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
