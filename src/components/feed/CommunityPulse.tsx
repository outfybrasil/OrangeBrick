"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils/time-ago";

interface PulsePost {
  id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
  comments_count: number;
}

export function CommunityPulse() {
  const supabase = useMemo(() => createDataClient(), []);
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const pulseItems: Array<PulsePost | null> = isLoaded ? posts : [null, null, null];

  const loadPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, author_name, author_avatar, content, created_at")
        .or("is_pinned.is.null,is_pinned.eq.false")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        setHasError(true);
        setIsLoaded(true);
        return;
      }

      const rows = (data || []) as Array<Omit<PulsePost, "comments_count">>;
      const ids = rows.filter((post) => post && post.id).map((post) => post.id);
      const commentCounts = new Map<string, number>();

      if (ids.length > 0) {
        const { data: comments, error: commentsError } = await supabase
          .from("community_comments")
          .select("post_id")
          .in("post_id", ids);

        if (commentsError) {
          setHasError(false);
        } else {
          for (const comment of (comments || []) as Array<{ post_id: string }>) {
            if (comment && comment.post_id) {
              commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1);
            }
          }
        }
      }

      setPosts(rows.map((post) => ({ ...post, comments_count: commentCounts.get(post.id) || 0 })));
    } catch {
      setHasError(true);
    } finally {
      setIsLoaded(true);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPosts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPosts]);

  if (isLoaded && posts.length === 0 && !hasError) {
    return null;
  }

  return (
    <section aria-labelledby="community-pulse-title" className="border-y border-white/10 py-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.15em] text-brand-orange">Conversas recentes</p>
          <h2 id="community-pulse-title" className="font-heading text-lg font-black text-white">
            Agora no Brickboard
          </h2>
        </div>
        <Link
          href="/brickboard"
          className="shrink-0 text-xs font-bold text-gray-400 transition-colors hover:text-brand-orange"
        >
          Ver todas
        </Link>
      </div>

      {hasError ? (
        <div className="flex min-h-24 flex-col items-start justify-center gap-2 border border-white/10 px-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-300">Não foi possível carregar as conversas recentes.</p>
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              void loadPosts();
            }}
            className="min-h-11 text-xs font-bold text-brand-orange transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
          {pulseItems.map((post, index) =>
          post ? (
            <Link
              key={post.id}
              href={`/brickboard?post=${post.id}`}
              data-home-event="brickboard"
              data-home-target={post.id}
              className="group flex min-h-36 flex-col bg-background-void p-4 transition-colors hover:bg-white/[0.035]"
            >
              <div className="mb-3 flex items-center gap-2.5">
                {post.author_avatar ? (
                  <img loading="lazy" decoding="async"
                    src={post.author_avatar}
                    alt={post.author_name}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-xs font-bold text-brand-orange">
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{post.author_name}</p>
                  <p className="text-xs text-gray-500">{timeAgo(post.created_at)}</p>
                </div>
              </div>
              <p className="flex-1 line-clamp-3 text-sm leading-relaxed text-gray-300 group-hover:text-white">
                {post.content}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {post.comments_count} {post.comments_count === 1 ? "resposta" : "respostas"}
              </div>
            </Link>
          ) : (
            <div key={index} className="min-h-36 animate-pulse bg-background-void p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white/[0.06]" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-20 bg-white/[0.06]" />
                  <div className="h-2 w-12 bg-white/[0.04]" />
                </div>
              </div>
              <div className="h-3 w-full bg-white/[0.06]" />
              <div className="mt-2 h-3 w-4/5 bg-white/[0.06]" />
            </div>
          )
          )}
        </div>
      )}
    </section>
  );
}
