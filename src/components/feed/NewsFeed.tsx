"use client";

import { useEffect, useMemo, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { NewsCardCompact } from "@/components/card/NewsCardCompact";
import { NewsFeedSkeleton } from "./NewsFeedSkeleton";
import { NewsFeedEmpty } from "./NewsFeedEmpty";
import { NewsSidebar } from "./NewsSidebar";
import { useInfiniteFeed } from "@/lib/hooks/useInfiniteFeed";
import { usePostStats } from "@/lib/hooks/usePostStats";
import { CATEGORY_CONFIG, type Post, type PostCategory, type PostStats } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { PLATFORMS_CONFIG, PlatformSlug } from "@/lib/types/platform";
import { normalizeAuthorTag } from "@/lib/content-validation";
import { BackToTop } from "@/components/ui/BackToTop";

interface NewsFeedProps {
  headingLevel?: "h1" | "h2";
  category: PostCategory | null;
  platformSlug?: PlatformSlug | null;
  searchQuery?: string;
  activeTag?: string | null;
  onSelectCategory?: (category: PostCategory | null) => void;
  onClearFilters?: () => void;
  homeHighlights?: ReactNode;
  initialPosts?: Post[];
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

export function NewsFeed({ headingLevel = "h2", category, platformSlug = null, searchQuery = "", activeTag = null, onSelectCategory, onClearFilters, homeHighlights, initialPosts }: NewsFeedProps) {
  const { posts: rawPosts, isLoading, isLoadingMore, hasMore, error, loadMore, refresh } =
    useInfiniteFeed(category, initialPosts);
  const hasRequestedFilters = Boolean(category || platformSlug || searchQuery || activeTag);
  const Heading = headingLevel;

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

    const queryTerm = searchQuery.trim().toLowerCase();
    if (queryTerm) {
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(queryTerm) ||
          post.summary.toLowerCase().includes(queryTerm) ||
          post.category.toLowerCase().includes(queryTerm)
      );
    }
    const tagTerm = activeTag?.trim().toLowerCase();
    if (tagTerm) {
      result = result.filter((post) =>
        `${post.title} ${post.summary} ${post.author_tag || ""}`.toLowerCase().includes(tagTerm)
      );
    }
    return result;
  }, [rawPosts, platformSlug, searchQuery, activeTag]);

  const rawPostIds = useMemo(() => rawPosts.map((post) => post.id), [rawPosts]);
  const stats = usePostStats(rawPostIds);

  useEffect(() => {
    const saved = sessionStorage.getItem("orange-feed-scroll");
    if (!saved) return;
    const value = Number(saved);
    sessionStorage.removeItem("orange-feed-scroll");
    if (!Number.isFinite(value)) return;
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: value, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [isLoading]);

  const rememberFeedPosition = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest("a");
    if (target?.getAttribute("href")?.startsWith("/posts/")) sessionStorage.setItem("orange-feed-scroll", String(window.scrollY));
  };

  const isFiltering = hasRequestedFilters;
  const heroPost = !isFiltering && posts.length >= 3 ? posts[0] : null;

  const sidePosts = useMemo(() => {
    if (!heroPost || posts.length < 3) return [];
    const candidates = posts.slice(1);
    const chosen: Post[] = [];
    const usedCategories = new Set<string>([heroPost.category]);

    for (const p of candidates) {
      if (chosen.length === 2) break;
      if (!usedCategories.has(p.category)) {
        chosen.push(p);
        usedCategories.add(p.category);
      }
    }
    for (const p of candidates) {
      if (chosen.length === 2) break;
      if (!chosen.some((c) => c.id === p.id)) {
        chosen.push(p);
      }
    }
    return chosen;
  }, [heroPost, posts]);

  const displayPosts = useMemo(() => {
    if (isFiltering || !heroPost) return posts;
    const heroId = heroPost.id;
    return posts.filter((p) => p.id !== heroId);
  }, [isFiltering, heroPost, posts]);

  const topPosts = !isFiltering ? displayPosts.slice(0, 8) : displayPosts.slice(0, 6);
  const lowerPosts = !isFiltering ? [] : displayPosts.slice(6);

  if (isLoading) {
    return <><NewsFeedSkeleton /><BackToTop /></>;
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
    return isFiltering ? (
      <NewsFeedEmpty
        title="Nenhuma matéria encontrada"
        description="Os filtros atuais não correspondem a nenhuma matéria. Limpe os filtros para voltar ao feed completo."
        actionLabel="Limpar filtros"
        onRefresh={onClearFilters}
      />
    ) : <NewsFeedEmpty onRefresh={refresh} />;
  }

  const renderHeroSection = () => {
    if (isFiltering || !heroPost || sidePosts.length < 2) return null;

    const isHeroToday = Boolean(
      heroPost.published_at &&
      new Date(heroPost.published_at).toDateString() === new Date().toDateString()
    );
    const heroBadge = isHeroToday ? "Matéria do dia" : "Em destaque";

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <Link
          href={`/posts/${heroPost.slug}`}
          data-home-event="article"
          data-home-target={heroPost.slug}
          className="lg:col-span-2 group relative aspect-[16/10] w-full overflow-hidden bg-background-void ring-1 ring-white/10 transition-colors duration-200 hover:ring-brand-orange/50 focus-visible:outline-2 focus-visible:outline-brand-orange"
        >
          {heroPost.image_url ? (
            <Image
              priority
              src={heroPost.image_url}
              alt={heroPost.image_alt || heroPost.title}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="absolute inset-0 h-full w-full object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="absolute inset-0 bg-card-slate flex items-center justify-center">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Sem mídia</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

          <div className="absolute left-0 top-0 z-30 rounded-br-[18px] bg-brand-orange px-4 py-2.5">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-black">{heroBadge}</span>
            <span aria-hidden="true" className="absolute -right-4 top-0 size-4 rounded-tl-[16px] shadow-[-5px_-5px_0_4px_#FF5E00]" />
            <span aria-hidden="true" className="absolute -bottom-4 left-0 size-4 rounded-tl-[16px] shadow-[-5px_-5px_0_4px_#FF5E00]" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-col justify-end gap-1 sm:gap-2 z-20">
            <div className="flex items-center gap-3">
              <Tag category={heroPost.category} />
              <Timer date={heroPost.published_at ?? ""} />
            </div>

            <h2 className="font-heading text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-wider group-hover:text-brand-orange transition-colors duration-300 line-clamp-2">
              {heroPost.title}
            </h2>

            <p className="mt-1 hidden text-sm leading-6 text-gray-200 xs:line-clamp-2">
              {heroPost.summary}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs">
              <span className="text-gray-300">Por</span>
              <strong className="font-bold text-white">{heroPost.author_name}</strong>
              {normalizeAuthorTag(heroPost.author_tag) && (
                <span className="text-brand-orange">{normalizeAuthorTag(heroPost.author_tag)}</span>
              )}
              <span className="ml-auto text-xs font-bold text-brand-orange">Ler matéria →</span>
            </div>
          </div>
        </Link>

        <div className="flex flex-col gap-4">
          {sidePosts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              data-home-event="article"
              data-home-target={post.slug}
              className="group relative flex flex-1 flex-col overflow-hidden bg-[#111217] ring-1 ring-white/10 transition-colors duration-200 hover:ring-brand-orange/50 focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              {post.image_url && (
                <div className="relative h-28 sm:h-32 w-full overflow-hidden flex-shrink-0 bg-[#08090C]">
                  <Image loading="lazy" decoding="async"
                    src={post.image_url}
                    alt={post.image_alt || post.title}
                    fill
                    sizes="(max-width: 1024px) 50vw, 22vw"
                    className="h-full w-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                  <span className="absolute bottom-0 left-0 z-20 rounded-tr-[18px] bg-brand-orange px-3 py-1.5 font-subtitle text-xs font-black uppercase tracking-[0.06em] text-black">
                    {CATEGORY_CONFIG[post.category]?.label || post.category}
                    <span aria-hidden="true" className="absolute -right-4 bottom-0 size-4 rounded-bl-[16px] shadow-[-5px_5px_0_4px_#FF5E00]" />
                    <span aria-hidden="true" className="absolute -top-4 left-0 size-4 rounded-bl-[16px] shadow-[-5px_5px_0_4px_#FF5E00]" />
                  </span>
                </div>
              )}
              <div className="p-3.5 flex flex-col justify-between flex-1 relative z-20">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    {!post.image_url && <Tag category={post.category} />}
                    <Timer date={post.published_at ?? ""} />
                  </div>
                  <h3 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-white transition-colors duration-200 group-hover:text-brand-orange">
                    {post.title}
                  </h3>
                  {post.summary && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">
                      {post.summary}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-0" onClickCapture={rememberFeedPosition}>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-6">
          <div id="ultimas-noticias" className="scroll-mt-16">
            <div className="mb-4 flex flex-col gap-3 border-b border-brand-orange/20 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 bg-brand-orange" />
                <Heading className="font-heading text-xl font-black text-white">
                  {category ? (
                    <>Notícias em <span className="text-brand-orange">{CATEGORY_CONFIG[category].label}</span></>
                  ) : (
                    <>Últimas <span className="text-brand-orange">notícias</span></>
                  )}
                </Heading>
              </div>

              {onSelectCategory && (
                <div role="group" aria-label="Filtrar por categoria" className="-mx-1 flex max-w-full items-center gap-1.5 overflow-x-auto px-1 py-1 text-xs font-semibold scrollbar-none sm:mx-0 sm:px-0">
                  {CATEGORIES.map((cat) => {
                    const isActive = category === cat.value;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onSelectCategory(cat.value)}
                        className={`min-h-8 shrink-0 rounded-md border px-3 py-1 text-xs transition-all cursor-pointer whitespace-nowrap ${
                          isActive
                            ? "border-brand-orange bg-brand-orange font-bold text-black shadow-sm"
                            : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-brand-orange/50 hover:text-white"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {renderHeroSection()}

            {isFiltering && (
              <div className="mb-4 flex flex-col gap-3 border-y border-white/10 py-3 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {posts.length} {posts.length === 1 ? "matéria encontrada" : "matérias encontradas"}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-gray-300">
                    {[category && CATEGORY_CONFIG[category].label, platformSlug && PLATFORMS_CONFIG[platformSlug].shortName, searchQuery && `Busca: “${searchQuery}”`, activeTag && `Assunto: ${activeTag}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {onClearFilters && (
                  <button type="button" onClick={onClearFilters} className="min-h-11 shrink-0 self-start border border-white/15 px-4 text-xs font-bold text-white transition-colors hover:border-brand-orange hover:text-brand-orange sm:self-auto">
                    Limpar filtros
                  </button>
                )}
              </div>
            )}

            <div className="space-y-0">
              {topPosts.map((post) => (
                <NewsCardCompact
                  key={post.id}
                  post={post}
                  stats={stats[post.id] || EMPTY_STATS}
                  headingLevel={headingLevel === "h1" ? "h2" : "h3"}
                />
              ))}
            </div>

            {!isFiltering && (
              <div className="mt-5 flex flex-col gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-gray-400">Acompanhe a cobertura completa, organizada por período.</p>
                <div className="grid grid-cols-2 bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange p-px sm:hidden">
                  <Link href="/noticias?periodo=mes" className="inline-flex min-h-12 items-center justify-center bg-brand-orange px-3 text-center text-xs font-black uppercase text-white transition-colors active:bg-[#d94f00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                    Notícias do mês
                  </Link>
                  <Link href="/noticias" className="inline-flex min-h-12 items-center justify-center bg-[#111217] px-3 text-center text-xs font-black uppercase text-white transition-colors active:bg-card-slate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                    Todas as notícias
                  </Link>
                </div>
                <div className="hidden gap-2 sm:flex">
                  <Link href="/noticias?periodo=mes" className="inline-flex min-h-11 items-center justify-center border border-brand-orange bg-brand-orange px-4 text-xs font-black uppercase text-white transition-colors hover:bg-[#d94f00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">Notícias do mês</Link>
                  <Link href="/noticias" className="inline-flex min-h-11 items-center justify-center border border-white/15 px-4 text-xs font-black uppercase text-white transition-colors hover:border-brand-orange hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">Todas as notícias</Link>
                </div>
              </div>
            )}
          </div>

          {!isFiltering && homeHighlights}

          {isFiltering && lowerPosts.length > 0 && (
            <div className="space-y-0 pt-0 border-t border-white/[0.06]">
              {lowerPosts.map((post) => (
                <NewsCardCompact
                  key={post.id}
                  post={post}
                  stats={stats[post.id] || EMPTY_STATS}
                  headingLevel={headingLevel === "h1" ? "h2" : "h3"}
                />
              ))}
            </div>
          )}

          {isFiltering && isLoadingMore && (
            <div className="py-8 flex justify-center">
              <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            </div>
          )}

          {isFiltering && hasMore && !isLoadingMore && (
            <div className="py-6 flex justify-center">
              <button
                onClick={loadMore}
                className="text-xs text-brand-orange border border-brand-orange/30 px-6 py-2.5 hover:bg-brand-orange/10 hover:border-brand-orange/50 transition-all cursor-pointer font-bold tracking-wider uppercase"
              >
                Carregar mais notícias
              </button>
            </div>
          )}

          {isFiltering && !hasMore && posts.length > 0 && (
            <div className="py-8 text-center border-t border-white/[0.06]">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Você chegou ao fim do feed</p>
            </div>
          )}
        </div>

        {/* SIDEBAR DIREITA */}
        <div className="hidden lg:block sticky top-16">
          <NewsSidebar posts={rawPosts} stats={stats} />
        </div>
      </div>
      <BackToTop />
    </div>
  );
}
