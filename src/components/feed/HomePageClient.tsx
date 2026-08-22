"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { ReleaseRadarStrip } from "@/components/feed/ReleaseRadarStrip";
import { SinceLastVisit } from "@/components/feed/SinceLastVisit";
import { HomeEngagementTracker } from "@/components/feed/HomeEngagementTracker";
import { MultimediaSection } from "@/components/feed/MultimediaSection";
import { UserNav } from "@/components/auth/UserNav";
import { Footer } from "@/components/ui/Footer";
import type { Post, PostCategory } from "@/lib/types/database";

interface HomePageClientProps {
  initialPosts: Post[];
}

export function HomePageClient({ initialPosts }: HomePageClientProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") as PostCategory | null;
  const qParam = searchParams.get("q") || "";
  const tagParam = searchParams.get("tag") || null;

  const activeTag = tagParam;

  const validCategories: PostCategory[] = ["breaking", "review", "hardware", "opinion", "industry", "modding"];
  const activeCategory = categoryParam && validCategories.includes(categoryParam) ? categoryParam : null;
  const hasQueryFilters = Boolean(activeCategory || qParam || activeTag);

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
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0e12]/98 backdrop-blur-md">
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
                placeholder="Buscar no Orange Brick"
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
            <Link href="/em-alta" className="hidden min-h-11 items-center px-3 text-xs font-semibold text-gray-400 transition-colors hover:text-white lg:flex">
              Em alta
            </Link>
            <Link href="/busca" className="hidden min-h-11 items-center px-3 text-xs font-semibold text-gray-400 transition-colors hover:text-white lg:flex">Buscar</Link>
            <Link
              href="/brickboard"
              data-home-event="brickboard"
              data-home-target="header"
              aria-label="Abrir Brickboard"
              className="mx-1 hidden min-h-11 items-center gap-1.5 whitespace-nowrap border border-brand-orange bg-brand-orange/10 px-3 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white sm:flex"
            >
              <span className="font-mono text-sm font-black">#</span>
              <span>Brickboard</span>
            </Link>
            <UserNav />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <HomeEngagementTracker />
        <SinceLastVisit />

        <ReleaseRadarStrip />

        <NewsFeed
          category={activeCategory}
          activeTag={activeTag}
          searchQuery={qParam}
          onSelectCategory={handleCategoryClick}
          initialPosts={hasQueryFilters ? undefined : initialPosts}
        />

        <MultimediaSection />
      </main>

      <Footer />
    </>
  );
}