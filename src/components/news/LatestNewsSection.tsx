"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { NewsCategoryNav } from "./NewsCategoryNav";
import type { Post, PostCategory } from "@/lib/types/database";

interface LatestNewsSectionProps {
  initialPosts: Post[];
  initialTotal: number;
}

export function LatestNewsSection({ initialPosts, initialTotal }: LatestNewsSectionProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | null>(null);
  const [page, setPage] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialPosts.length < initialTotal);

  const fetchCategoryPosts = useCallback(async (cat: PostCategory | null) => {
    setSelectedCategory(cat);
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1" });
      if (cat) params.set("category", cat);
      const res = await fetch(`/api/news?${params.toString()}`);
      if (!res.ok) throw new Error("Não foi possível carregar as matérias.");
      const data = await res.json();
      setPosts(data.posts || []);
      setPage(2);
      setHasMore(data.page < data.totalPages);
    } catch {
      setError("Erro ao carregar matérias desta categoria. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (selectedCategory) params.set("category", selectedCategory);
      const res = await fetch(`/api/news?${params.toString()}`);
      if (!res.ok) throw new Error("Não foi possível carregar mais matérias.");
      const data = await res.json();
      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setPage((p) => p + 1);
      setHasMore(page < data.totalPages);
    } catch {
      setError("Não foi possível carregar mais matérias. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, page, selectedCategory]);

  return (
    <section aria-labelledby="latest-news-heading" className="my-12">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">
            Feed Cronológico
          </span>
          <h2 id="latest-news-heading" className="mt-1 font-heading text-2xl font-black uppercase text-white sm:text-3xl">
            Últimas Notícias
          </h2>
        </div>
      </div>

      <div className="mt-6">
        <NewsCategoryNav
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => void fetchCategoryPosts(cat)}
        />
      </div>

      {isLoading && posts.length === 0 ? (
        <div className="mt-8 divide-y divide-white/10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="grid animate-pulse gap-4 py-6 sm:grid-cols-[14rem_1fr] sm:items-center">
              <div className="aspect-video w-full rounded-sm bg-card-slate" />
              <div className="space-y-3">
                <div className="h-4 w-24 rounded bg-card-slate" />
                <div className="h-6 w-3/4 rounded bg-card-slate" />
                <div className="h-4 w-full rounded bg-card-slate" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="my-12 rounded-sm border border-white/10 bg-[#111217] p-8 text-center text-sm text-gray-400">
          Nenhuma matéria encontrada nesta categoria.
        </div>
      ) : (
        <div className="mt-6 divide-y divide-white/10">
          {posts.map((post) => {
            const postDate = post.published_at || post.created_at;
            return (
              <article
                key={post.id}
                className="group grid gap-4 py-6 sm:grid-cols-[14rem_1fr] sm:items-center"
              >
                <Link
                  href={`/posts/${post.slug}`}
                  className="relative aspect-video w-full overflow-hidden rounded-sm bg-background-void focus-visible:outline-2 focus-visible:outline-brand-orange"
                  aria-label={`Ler notícia: ${post.title}`}
                >
                  {post.image_url ? (
                    <Image
                      src={post.image_url}
                      alt={post.image_alt || post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 224px"
                      className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-card-slate text-xs font-bold uppercase tracking-wider text-gray-500">
                      Orange Brick
                    </div>
                  )}
                </Link>

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Tag category={post.category} />
                    <span className="text-xs text-gray-500">•</span>
                    <Timer date={postDate} />
                  </div>

                  <h3 className="mt-2.5 font-heading text-lg font-black uppercase leading-snug tracking-tight text-white transition-colors duration-200 group-hover:text-brand-orange sm:text-xl">
                    <Link href={`/posts/${post.slug}`} className="focus-visible:outline-none">
                      {post.title}
                    </Link>
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-400">
                    {post.summary}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center justify-center gap-4 text-center">
        {error && (
          <div role="alert" className="space-y-2 text-sm text-red-400">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadMore()}
              className="inline-flex min-h-11 items-center rounded-sm border border-brand-orange px-4 text-xs font-bold uppercase text-brand-orange transition-colors hover:bg-brand-orange/10"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {hasMore && !isLoading && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="inline-flex min-h-12 items-center justify-center rounded-sm border border-brand-orange/40 bg-[#16171D] px-8 text-xs font-black uppercase tracking-wider text-brand-orange transition-all hover:border-brand-orange hover:bg-brand-orange hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            Carregar mais notícias
          </button>
        )}

        {isLoading && posts.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
            <span>Carregando matérias...</span>
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Todas as matérias desta seção foram carregadas.
          </p>
        )}
      </div>
    </section>
  );
}
