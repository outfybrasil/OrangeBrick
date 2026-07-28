"use client";

import { useRef, useMemo, type ReactNode } from "react";
import { NewsCardCompact } from "@/components/card/NewsCardCompact";
import { NewsFeedSkeleton } from "./NewsFeedSkeleton";
import { NewsFeedEmpty } from "./NewsFeedEmpty";
import { NewsSidebar } from "./NewsSidebar";
import { useInfiniteFeed } from "@/lib/hooks/useInfiniteFeed";
import { usePostStats } from "@/lib/hooks/usePostStats";
import { CATEGORY_CONFIG, type PostCategory, type PostStats } from "@/lib/types/database";
import { PLATFORMS_CONFIG, PlatformSlug } from "@/lib/types/platform";

interface NewsFeedProps {
  category: PostCategory | null;
  platformSlug?: PlatformSlug | null;
  searchQuery?: string;
  activeTag?: string | null;
  onSelectCategory?: (category: PostCategory | null) => void;
  homeHighlights?: ReactNode;
}

const CATEGORIES: { label: string; value: PostCategory | null }[] = [
  { label: "Tudo", value: null },
  ...(["breaking", "review", "hardware", "opinion", "industry", "modding"] as PostCategory[]).map((value) => ({
    label: CATEGORY_CONFIG[value].label,
    value,
  })),
];

const EMPTY_STATS: PostStats = {
  reactions: { hype: 0, flop: 0, salty: 0 },
  views: 0,
  comments: 0,
  userReaction: null,
};

export function NewsFeed({ category, platformSlug = null, searchQuery = "", activeTag = null, onSelectCategory, homeHighlights }: NewsFeedProps) {
  const { posts: rawPosts, isLoading, isLoadingMore, hasMore, error, loadMore, refresh } =
    useInfiniteFeed(category);

  const posts = useMemo(() => {
    let result = rawPosts;

    if (platformSlug && platformSlug in PLATFORMS_CONFIG) {
      const keywords = PLATFORMS_CONFIG[platformSlug].tagKeywords;
      result = result.filter((post) => {
        const titleLower = post.title.toLowerCase();
        const summaryLower = post.summary.toLowerCase();
        const catLower = post.category.toLowerCase();
        const tagLower = (post.author_tag || "").toLowerCase();
        const fullText = `${titleLower} ${summaryLower} ${catLower} ${tagLower}`;

        if (platformSlug === "playstation") {
          if (titleLower.includes("xbox") || titleLower.includes("halo") || titleLower.includes("nintendo")) {
            return false;
          }
        } else if (platformSlug === "xbox") {
          if (titleLower.includes("playstation") || titleLower.includes("nintendo")) {
            return false;
          }
        } else if (platformSlug === "nintendo") {
          if (titleLower.includes("playstation") || titleLower.includes("xbox")) {
            return false;
          }
        }

        return keywords.some((kw) => fullText.includes(kw.toLowerCase()));
      });
    }

    const term = (searchQuery || activeTag || "").trim().toLowerCase();
    if (term) {
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(term) ||
          post.summary.toLowerCase().includes(term) ||
          post.category.toLowerCase().includes(term)
      );
    }
    return result;
  }, [rawPosts, platformSlug, searchQuery, activeTag]);

  const stats = usePostStats(rawPosts.map((post) => post.id));
  const sentinelRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return <NewsFeedSkeleton />;
  }

  if (error && rawPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-sm font-mono text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 text-sm font-mono text-brand-orange border border-brand-orange/30 hover:bg-brand-orange/10 transition-colors rounded-none cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return <NewsFeedEmpty onRefresh={refresh} />;
  }

  const isFiltering = Boolean(category || platformSlug || searchQuery || activeTag);

  const displayPosts = posts;
  const topPosts = displayPosts.slice(0, 4);
  const lowerPosts = displayPosts.slice(4);

  return (
    <div className="min-w-0">
      {/* 2 colunas: feed principal + sidebar */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">

        {/* COLUNA PRINCIPAL */}
        <div className="min-w-0 space-y-6">
          <div id="ultimas-noticias" className="scroll-mt-16">
            <div className="mb-4 flex flex-col gap-2 border-b border-brand-orange/20 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 bg-brand-orange" />
                <h2 className="font-heading text-xl font-black text-white">
                  {category ? (
                    <>Notícias em <span className="text-brand-orange">{CATEGORY_CONFIG[category].label}</span></>
                  ) : (
                    <>Últimas <span className="text-brand-orange">notícias</span></>
                  )}
                </h2>
              </div>

              {onSelectCategory && (
                <nav className="-mx-1 flex max-w-full items-center overflow-x-auto px-1 text-xs font-semibold scrollbar-none sm:mx-0 sm:px-0">
                  {CATEGORIES.map((cat) => {
                    const isActive = category === cat.value;
                    return (
                      <button
                        key={cat.label}
                        onClick={() => onSelectCategory(cat.value)}
                        className={`relative min-h-11 shrink-0 border-b border-white/10 px-3 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          isActive ? "text-white" : "text-gray-500 hover:text-gray-200"
                        }`}
                      >
                        {cat.label}
                        {isActive && <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-0.5 bg-brand-orange" />}
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>

            <div className="space-y-0">
              {topPosts.map((post) => (
                <NewsCardCompact
                  key={post.id}
                  post={post}
                  stats={stats[post.id] || EMPTY_STATS}
                />
              ))}
            </div>
          </div>

          {!isFiltering && homeHighlights}

          {lowerPosts.length > 0 && (
            <div className="space-y-0 pt-0 border-t border-white/[0.06]">
              {lowerPosts.map((post) => (
                <NewsCardCompact
                  key={post.id}
                  post={post}
                  stats={stats[post.id] || EMPTY_STATS}
                />
              ))}
            </div>
          )}

          {isLoadingMore && (
            <div className="py-8 flex justify-center">
              <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            </div>
          )}

          {hasMore && !isLoadingMore && (
            <div className="py-6 flex justify-center">
              <button
                onClick={loadMore}
                className="text-xs text-brand-orange border border-brand-orange/30 px-6 py-2.5 hover:bg-brand-orange/10 hover:border-brand-orange/50 transition-all cursor-pointer font-bold tracking-wider uppercase"
              >
                Carregar mais notícias
              </button>
            </div>
          )}

          <div ref={sentinelRef} className="h-1" />

          {!hasMore && posts.length > 0 && (
            <div className="py-8 text-center border-t border-white/[0.06]">
              <p className="text-xs text-gray-600 uppercase tracking-widest">— Você chegou ao fim do feed —</p>
            </div>
          )}
        </div>

        {/* SIDEBAR DIREITA */}
        <div className="hidden lg:block sticky top-16">
          <NewsSidebar posts={rawPosts} stats={stats} />
        </div>
      </div>
    </div>
  );
}
