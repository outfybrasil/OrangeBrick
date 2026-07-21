"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { TrendingTicker } from "@/components/feed/TrendingTicker";
import { ReleaseRadarStrip } from "@/components/feed/ReleaseRadarStrip";
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
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/10 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center cursor-pointer group gap-4" onClick={() => handleCategoryClick(null)}>
              <Image
                src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
                alt="Orange Brick Logo Icon"
                width={128}
                height={64}
                className="h-10 sm:h-14 w-auto object-contain transform group-hover:scale-[1.05] transition-transform duration-300"
              />
              <span className="text-base sm:text-xl md:text-2xl font-mono font-black text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors duration-300">
                Orange<span className="text-brand-orange">_</span>Brick
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar notícias..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3.5 py-1.5 pl-9 outline-none focus:border-brand-orange/50 transition-colors font-mono text-xs"
              />
              <svg
                className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>

            <nav className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none font-mono text-xs font-semibold w-full sm:w-auto">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.value;
                return (
                  <button
                    key={cat.label}
                    onClick={() => handleCategoryClick(cat.value)}
                    className={`
                      px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer whitespace-nowrap
                      ${
                        isActive
                          ? "bg-brand-orange/15 text-brand-orange border-brand-orange/30 shadow-[0_0_10px_rgba(255,94,0,0.1)]"
                          : `bg-transparent text-gray-400 border-transparent ${cat.hoverColor} hover:border-brand-orange-muted/20 hover:bg-card-slate/30`
                      }
                    `}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <TrendingTicker activeTag={activeTag} onSelectTag={handleTagSelect} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="sr-only">Orange Brick — notícias de games, hardware e indústria</h1>
        <ReleaseRadarStrip />
        <NewsFeed category={activeCategory} searchQuery={searchQuery} activeTag={activeTag} />
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
