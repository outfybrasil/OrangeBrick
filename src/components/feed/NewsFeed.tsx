"use client";

import { useRef, useMemo } from "react";
import Link from "next/link";
import { NewsCard } from "@/components/card/NewsCard";
import { NewsFeedSkeleton } from "./NewsFeedSkeleton";
import { NewsFeedEmpty } from "./NewsFeedEmpty";
import { NewsSidebar } from "./NewsSidebar";
import { useInfiniteFeed } from "@/lib/hooks/useInfiniteFeed";
import { usePostStats } from "@/lib/hooks/usePostStats";
import type { PostCategory, PostStats } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";

interface NewsFeedProps {
  category: PostCategory | null;
  searchQuery?: string;
  activeTag?: string | null;
  onSelectCategory?: (category: PostCategory | null) => void;
}

const CATEGORIES: { label: string; value: PostCategory | null; hoverColor: string }[] = [
  { label: "Tudo", value: null, hoverColor: "hover:text-white" },
  { label: "Breaking", value: "breaking", hoverColor: "hover:text-red-400" },
  { label: "Reviews", value: "review", hoverColor: "hover:text-brand-orange" },
  { label: "Hardware", value: "hardware", hoverColor: "hover:text-blue-400" },
  { label: "Opinião", value: "opinion", hoverColor: "hover:text-yellow-400" },
  { label: "Indústria", value: "industry", hoverColor: "hover:text-purple-400" },
  { label: "Modding", value: "modding", hoverColor: "hover:text-green-400" },
];

const EMPTY_STATS: PostStats = {
  reactions: { hype: 0, flop: 0, salty: 0 },
  views: 0,
  comments: 0,
  userReaction: null,
};

export function NewsFeed({ category, searchQuery = "", activeTag = null, onSelectCategory }: NewsFeedProps) {
  const { posts: rawPosts, isLoading, isLoadingMore, hasMore, error, loadMore, refresh } =
    useInfiniteFeed(category);

  // Filter posts based on searchQuery or activeTag
  const posts = useMemo(() => {
    let result = rawPosts;
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
  }, [rawPosts, searchQuery, activeTag]);

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

  const isFiltering = Boolean(category || searchQuery || activeTag);

  const renderHeroSection = () => {
    if (isFiltering || rawPosts.length < 3) return null;

    const heroPost = rawPosts[0];
    const sidePosts = rawPosts.slice(1, 3);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <Link
          href={`/posts/${heroPost.slug}`}
          className="lg:col-span-2 group relative aspect-[16/10] w-full rounded-2xl overflow-hidden cursor-pointer border border-brand-orange-muted/15 hover:border-brand-orange/40 hover:shadow-[0_0_25px_rgba(255,94,0,0.15)] transition-all duration-300 hover:-translate-y-1"
        >
          {heroPost.image_url ? (
            <img
              src={heroPost.image_url}
              alt={heroPost.image_alt || ""}
              className="absolute inset-0 w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="absolute inset-0 bg-card-slate flex items-center justify-center">
              <span className="text-xs font-mono text-brand-orange-muted uppercase tracking-widest">Sem mídia</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-background-void/95 via-background-void/30 to-transparent z-10" />

          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-col justify-end gap-1 sm:gap-2 z-20">
            <div className="flex items-center gap-3">
              <Tag category={heroPost.category} />
              <Timer date={heroPost.published_at ?? ""} />
            </div>

            <h2 className="font-mono text-base sm:text-xl md:text-3xl font-bold text-white leading-tight group-hover:text-brand-orange transition-colors duration-300 line-clamp-2">
              {heroPost.title}
            </h2>

            <p className="hidden xs:block text-[11px] sm:text-xs text-gray-300 line-clamp-2 mt-0.5 sm:mt-1 font-sans">
              {heroPost.summary}
            </p>

            <div className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] font-mono text-gray-400">
              Por <span className="text-white font-semibold">{heroPost.author_name}</span>
            </div>
          </div>
        </Link>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-brand-orange-muted/10">
            <span className="w-1.5 h-4 bg-brand-orange rounded-full" />
            <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
              Últimos Destaques
            </h3>
          </div>

          {sidePosts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              className="flex-1 flex flex-col overflow-hidden bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl cursor-pointer hover:border-brand-orange/30 hover:bg-card-slate/60 transition-all duration-300 group hover:-translate-y-0.5"
            >
              {post.image_url && (
                <div className="relative h-20 xs:h-24 sm:h-28 w-full overflow-hidden flex-shrink-0">
                  <img
                    src={post.image_url}
                    alt={post.image_alt || ""}
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card-slate/80 to-transparent" />
                </div>
              )}
              <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Tag category={post.category} />
                    <Timer date={post.published_at ?? ""} />
                  </div>
                  <h4 className="font-mono text-[11px] sm:text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-brand-orange transition-colors duration-200">
                    {post.title}
                  </h4>
                </div>
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
    <div className="space-y-10">
      {renderHeroSection()}

      {/* SEÇÃO SUPERIOR: Feed (2 colunas) + Sidebar (1 coluna) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ESQUERDA: Primeiras 4 notícias + Filtro de Categorias */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-orange-muted/10">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-brand-orange rounded-full animate-pulse" />
              <h3 className="text-xs font-subtitle font-bold text-gray-300 uppercase tracking-wider">
                {category ? `Notícias em ${category}` : "Feed de Notícias"}
              </h3>
            </div>

            {onSelectCategory && (
              <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none font-subtitle text-[10px] sm:text-xs font-semibold py-0.5 -mx-1 sm:mx-0 px-1 sm:px-0">
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat.value;
                  return (
                    <button
                      key={cat.label}
                      onClick={() => onSelectCategory(cat.value)}
                      className={`
                        px-2 sm:px-2.5 py-1 rounded-lg border transition-all duration-200 cursor-pointer whitespace-nowrap text-[10px] sm:text-[11px]
                        ${
                          isActive
                            ? "bg-brand-orange/20 text-brand-orange border-brand-orange/40 font-bold shadow-[0_0_10px_rgba(255,94,0,0.15)]"
                            : `bg-card-slate/30 text-gray-400 border-brand-orange-muted/10 ${cat.hoverColor} hover:border-brand-orange-muted/30 hover:bg-card-slate/60`
                        }
                      `}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topPosts.map((post) => (
              <NewsCard
                key={`${post.id}:${JSON.stringify(stats[post.id] || EMPTY_STATS)}`}
                post={post}
                stats={stats[post.id] || EMPTY_STATS}
              />
            ))}
          </div>
        </div>

        {/* DIREITA: Sidebar com Widgets (1 coluna, Sticky) */}
        <div className="hidden lg:block sticky top-20">
          <NewsSidebar posts={rawPosts} stats={stats} />
        </div>
      </div>

      {/* SEÇÃO INFERIOR: Notificações seguintes ocupando a LARGURA TOTAL (3 colunas) */}
      {lowerPosts.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-brand-orange-muted/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lowerPosts.map((post, idx) => {
              const cardComponent = (
                <NewsCard
                  key={`${post.id}:${JSON.stringify(stats[post.id] || EMPTY_STATS)}`}
                  post={post}
                  stats={stats[post.id] || EMPTY_STATS}
                />
              );

              return cardComponent;
            })}
          </div>
        </div>
      )}

      {isLoadingMore && (
        <div className="py-8 flex justify-center">
          <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        </div>
      )}

      {hasMore && !isLoadingMore && (
        <div className="py-8 flex justify-center">
          <button
            onClick={loadMore}
            className="font-subtitle text-xs text-brand-orange border border-brand-orange/30 px-6 py-3 rounded-xl hover:bg-brand-orange/10 hover:border-brand-orange/50 transition-all duration-200 cursor-pointer font-bold tracking-wider uppercase shadow-md"
          >
            ← Carregar mais notícias →
          </button>
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />

      {!hasMore && posts.length > 0 && (
        <div className="py-8 text-center border-t border-brand-orange-muted/10 mt-8">
          <p className="text-xs font-subtitle text-brand-orange-muted/50 uppercase tracking-widest">
            — Você chegou ao fim do feed —
          </p>
        </div>
      )}
    </div>
  );
}
