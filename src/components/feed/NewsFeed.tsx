"use client";

import { useRef, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { NewsCardCompact } from "@/components/card/NewsCardCompact";
import { NewsFeedSkeleton } from "./NewsFeedSkeleton";
import { NewsFeedEmpty } from "./NewsFeedEmpty";
import { NewsSidebar } from "./NewsSidebar";
import { useInfiniteFeed } from "@/lib/hooks/useInfiniteFeed";
import { usePostStats } from "@/lib/hooks/usePostStats";
import { CATEGORY_CONFIG, type PostCategory, type PostStats } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { PLATFORMS_CONFIG, PlatformSlug } from "@/lib/types/platform";
import { normalizeAuthorTag } from "@/lib/content-validation";

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

  // RENDERIZAÇÃO DO HERO (MATÉRIA DE DESTAQUE GRANDE + 2 LATERAIS)
  const renderHeroSection = () => {
    if (isFiltering || rawPosts.length < 3) return null;

    const heroPost = rawPosts[0];
    const sidePosts = rawPosts.slice(1, 3);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* HERO MATÉRIA PRINCIPAL GRANDE */}
        <Link
          href={`/posts/${heroPost.slug}`}
          data-home-event="article"
          data-home-target={heroPost.slug}
          className="lg:col-span-2 group relative aspect-[16/10] w-full overflow-hidden cursor-pointer border border-white/10 bg-background-void hover:border-brand-orange/40 transition-colors duration-300"
        >
          {heroPost.image_url ? (
            <img
              src={heroPost.image_url}
              alt={heroPost.image_alt || ""}
              className="absolute inset-0 h-full w-full object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="absolute inset-0 bg-card-slate flex items-center justify-center">
              <span className="text-xs font-mono text-brand-orange-muted uppercase tracking-widest">Sem mídia</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-col justify-end gap-1 sm:gap-2 z-20">
            <div className="flex items-center gap-3">
              <Tag category={heroPost.category} />
              <Timer date={heroPost.published_at ?? ""} />
            </div>

            <h2 className="font-heading text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-wider group-hover:text-brand-orange transition-colors duration-300 line-clamp-2">
              {heroPost.title}
            </h2>

            <p className="hidden xs:block text-[11px] sm:text-xs text-gray-200 line-clamp-2 mt-0.5 sm:mt-1 leading-relaxed font-body">
              {heroPost.summary}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] sm:mt-2 sm:text-xs">
              <span className="text-gray-400">Por</span>
              <strong className="font-bold text-white">{heroPost.author_name}</strong>
              {normalizeAuthorTag(heroPost.author_tag) && (
                <span className="text-brand-orange">{normalizeAuthorTag(heroPost.author_tag)}</span>
              )}
              <span className="ml-auto text-xs font-bold text-brand-orange">Ler matéria →</span>
            </div>
          </div>
        </Link>

        {/* SIDE POSTS DO HERO */}
        <div className="flex flex-col gap-4">
          {sidePosts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              data-home-event="article"
              data-home-target={post.slug}
              className="flex-1 flex flex-col overflow-hidden bg-background-void border border-white/10 hover:border-brand-orange/40 hover:bg-white/[0.025] transition-colors duration-300 group relative"
            >
              {post.image_url && (
                <div className="relative h-28 sm:h-32 w-full overflow-hidden flex-shrink-0 bg-[#08090C]">
                  <img
                    src={post.image_url}
                    alt={post.image_alt || ""}
                    className="h-full w-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                </div>
              )}
              <div className="p-3 flex flex-col justify-between flex-1 relative z-20">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Tag category={post.category} />
                  <Timer date={post.published_at ?? ""} />
                </div>
                <h4 className="font-heading text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-brand-orange transition-colors duration-200">
                  {post.title}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const displayPosts = !isFiltering && rawPosts.length >= 3 ? posts.slice(3) : posts;
  const topPosts = displayPosts.slice(0, 4);
  const lowerPosts = displayPosts.slice(4);

  return (
    <div className="min-w-0">
      {/* 2 colunas: feed principal + sidebar */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">

        {/* COLUNA PRINCIPAL */}
        <div className="min-w-0 space-y-6">
          {renderHeroSection()}

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
