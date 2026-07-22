"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { TrendingTicker } from "@/components/feed/TrendingTicker";
import { ReleaseRadarStrip } from "@/components/feed/ReleaseRadarStrip";
import { UserNav } from "@/components/auth/UserNav";
import { Footer } from "@/components/ui/Footer";
import type { PostCategory } from "@/lib/types/database";

const CATEGORIES: { value: PostCategory | null; label: string; hoverColor: string }[] = [
  { value: null, label: "Tudo", hoverColor: "hover:text-brand-orange" },
  { value: "breaking", label: "Breaking", hoverColor: "hover:text-accent-blue" },
  { value: "review", label: "Reviews", hoverColor: "hover:text-green-400" },
  { value: "hardware", label: "Hardware", hoverColor: "hover:text-brand-orange" },
  { value: "opinion", label: "Opinião", hoverColor: "hover:text-yellow-400" },
  { value: "industry", label: "Indústria", hoverColor: "hover:text-gray-300" },
  { value: "modding", label: "Modding", hoverColor: "hover:text-purple-400" },
];

function HomeContent() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") as PostCategory | null;
  const qParam = searchParams.get("q") || "";
  const tagParam = searchParams.get("tag") || null;

  const [searchQuery, setSearchQuery] = useState(qParam);
  const [activeTag, setActiveTag] = useState<string | null>(tagParam);

  const validCategories: PostCategory[] = ["breaking", "review", "hardware", "opinion", "industry", "modding"];
  const activeCategory = categoryParam && validCategories.includes(categoryParam) ? categoryParam : null;

  useEffect(() => {
    setSearchQuery(qParam);
    setActiveTag(tagParam);
  }, [qParam, tagParam]);

  const handleCategoryClick = (catValue: PostCategory | null) => {
    const params = new URLSearchParams();
    if (catValue) params.set("category", catValue);
    if (searchQuery) params.set("q", searchQuery);
    if (activeTag) params.set("tag", activeTag);
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  };

  const handleTagSelect = (tag: string | null) => {
    setActiveTag(tag);
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (searchQuery) params.set("q", searchQuery);
    if (tag) params.set("tag", tag);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center cursor-pointer group gap-2 sm:gap-3 shrink-0 min-w-0" onClick={() => handleCategoryClick(null)}>
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              className="h-8 sm:h-9 w-auto max-h-9 object-contain transform group-hover:scale-[1.05] transition-transform duration-300 shrink-0"
            />
            <span className="hidden sm:inline text-xl sm:text-2xl font-heading font-extrabold text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors duration-300 shrink-0 whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-[140px] sm:max-w-xs lg:max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 pl-8 sm:pl-10 outline-none focus:border-brand-orange/50 transition-colors font-body text-xs sm:text-sm shadow-inner"
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

            <Link
              href="/brickboard"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-orange/15 border border-brand-orange/40 hover:bg-brand-orange hover:text-white text-brand-orange font-subtitle text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(255,94,0,0.15)] whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Brickboard</span>
            </Link>

            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="sr-only">Orange Brick — notícias de games, hardware e indústria</h1>
        <ReleaseRadarStrip />
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
