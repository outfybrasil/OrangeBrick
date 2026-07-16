"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { NewsCard } from "@/components/card/NewsCard";
import { NewsFeedSkeleton } from "./NewsFeedSkeleton";
import { NewsFeedEmpty } from "./NewsFeedEmpty";
import { useInfiniteFeed } from "@/lib/hooks/useInfiniteFeed";
import type { ReactionType, PostCategory } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";

interface NewsFeedProps {
  category: PostCategory | null;
}

const EMPTY_REACTIONS: Record<ReactionType, number> = {
  hype: 0,
  flop: 0,
  salty: 0,
  defendo: 0,
  brick: 0,
};

export function NewsFeed({ category }: NewsFeedProps) {
  const router = useRouter();
  const { posts, isLoading, isLoadingMore, hasMore, error, loadMore, refresh } =
    useInfiniteFeed(category);

  const sentinelRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return <NewsFeedSkeleton />;
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-sm font-mono text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 text-sm font-mono text-brand-orange border border-brand-orange/30 hover:bg-brand-orange/10 transition-colors rounded-none"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return <NewsFeedEmpty onRefresh={refresh} />;
  }

  const renderHeroSection = () => {
    if (category || posts.length < 3) return null;

    const heroPost = posts[0];
    const sidePosts = posts.slice(1, 3);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div
          onClick={() => router.push(`/post?slug=${heroPost.slug}`)}
          onKeyDown={(e) => { if (e.key === "Enter") router.push(`/post?slug=${heroPost.slug}`); }}
          role="link"
          tabIndex={0}
          className="lg:col-span-2 group relative aspect-[16/10] w-full rounded-xl overflow-hidden cursor-pointer border border-brand-orange-muted/15 hover:border-brand-orange/40 hover:shadow-[0_0_25px_rgba(255,94,0,0.15)] transition-all duration-300 hover:-translate-y-1"
        >
          {heroPost.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
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
          
          <div className="absolute inset-0 bg-gradient-to-t from-background-void/95 via-background-void/20 to-transparent z-10" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end gap-2 z-20">
            <div className="flex items-center gap-3">
              <Tag category={heroPost.category} />
              <Timer date={heroPost.published_at ?? ""} />
            </div>
            
            <h2 className="font-mono text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight group-hover:text-brand-orange transition-colors duration-300 line-clamp-2">
              {heroPost.title}
            </h2>
            
            <p className="text-xs text-gray-300 line-clamp-2 mt-1 font-sans">
              {heroPost.summary}
            </p>
            
            <div className="mt-2 text-[10px] font-mono text-gray-400">
              Por <span className="text-white font-semibold">{heroPost.author_name}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-brand-orange-muted/10">
            <span className="w-1.5 h-4 bg-brand-orange rounded-full" />
            <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
              Últimas Notícias
            </h3>
          </div>
          
          {sidePosts.map((post) => (
            <div
              key={post.id}
               onClick={() => router.push(`/post?slug=${post.slug}`)}
               onKeyDown={(e) => { if (e.key === "Enter") router.push(`/post?slug=${post.slug}`); }}
              role="link"
              tabIndex={0}
              className="flex-1 flex flex-col overflow-hidden bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl cursor-pointer hover:border-brand-orange/30 hover:bg-card-slate/60 transition-all duration-300 group hover:-translate-y-0.5"
            >
              {post.image_url && (
                <div className="relative h-32 w-full overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image_url}
                    alt={post.image_alt || ""}
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card-slate/80 to-transparent" />
                </div>
              )}
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Tag category={post.category} />
                    <Timer date={post.published_at ?? ""} />
                  </div>
                  <h4 className="font-mono text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-brand-orange transition-colors duration-200">
                    {post.title}
                  </h4>
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-gray-500">
                  <span>Por {post.author_name}</span>
                  <span className="text-brand-orange group-hover:translate-x-1 transition-transform duration-200">Ler post →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const displayPosts = !category && posts.length >= 3 ? posts.slice(3) : posts;

  return (
    <div>
      {renderHeroSection()}

      {displayPosts.length > 0 && (
        <>
          {!category && posts.length >= 3 && (
            <div className="flex items-center gap-2 mb-6 pb-2 border-b border-brand-orange-muted/10">
              <span className="w-1.5 h-4 bg-brand-orange rounded-full animate-pulse" />
              <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                Mais Notícias
              </h3>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPosts.map((post) => (
              <NewsCard
                key={post.id}
                post={post}
                initialReactions={EMPTY_REACTIONS}
              />
            ))}
          </div>
        </>
      )}

      {isLoadingMore && (
        <div className="py-8 flex justify-center">
          <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        </div>
      )}

      {hasMore && !isLoadingMore && (
        <div className="py-10 flex justify-center">
          <button
            onClick={loadMore}
            className="font-mono text-xs text-brand-orange border border-brand-orange/30 px-6 py-3 rounded-lg hover:bg-brand-orange/10 hover:border-brand-orange/50 transition-all duration-200 cursor-pointer font-bold tracking-wider uppercase"
          >
            ← Carregar mais →
          </button>
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />

      {!hasMore && posts.length > 0 && (
        <div className="py-12 text-center border-t border-brand-orange-muted/10 mt-12">
          <p className="text-xs font-mono text-brand-orange-muted/50 uppercase tracking-widest">
            — Você chegou ao fim do feed —
          </p>
        </div>
      )}
    </div>
  );
}
