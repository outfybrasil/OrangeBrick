"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tag } from "@/components/ui/Tag";
import type { Post } from "@/lib/types/database";

interface NewsListProps {
  initialPosts: Post[];
  total: number;
  period: string;
  search: string;
}

export function NewsList({ initialPosts, total, period, search }: NewsListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length < total);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (period === "mes") params.set("periodo", "mes");
      if (search) params.set("q", search);
      const res = await fetch(`/api/news?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setPage((p) => p + 1);
      setHasMore(page + 1 < data.totalPages);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, period, search]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (posts.length === 0) {
    return <div className="py-20 text-center text-sm text-gray-400">Nenhuma matéria publicada neste período.</div>;
  }

  return (
    <>
      <div className="divide-y divide-white/10">
        {posts.map((post) => (
          <article key={post.id} className="grid gap-4 py-6 sm:grid-cols-[12rem_1fr] sm:items-center">
            <Link href={`/posts/${post.slug}`} className="relative aspect-video overflow-hidden bg-card-slate focus-visible:outline-2 focus-visible:outline-brand-orange">
              {post.image_url && <Image src={post.image_url} alt={post.image_alt || post.title} fill sizes="(max-width: 640px) 100vw, 12rem" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]" />}
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-3"><Tag category={post.category} /><time className="text-xs text-gray-500">{new Date(post.published_at || post.created_at).toLocaleDateString("pt-BR")}</time></div>
              <h2 className="mt-3 font-heading text-xl font-black uppercase leading-tight"><Link href={`/posts/${post.slug}`} className="transition-colors hover:text-brand-orange">{post.title}</Link></h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">{post.summary}</p>
            </div>
          </article>
        ))}
      </div>
      <div ref={sentinelRef} className="py-8 text-center">
        {isLoading && <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />}
        {!hasMore && posts.length > 0 && <p className="text-xs text-gray-500">Todas as matérias carregadas.</p>}
      </div>
    </>
  );
}
