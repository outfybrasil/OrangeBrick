"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils/time-ago";

interface PulsePost {
  id: string;
  author_name: string;
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
        .select("id, author_name, content, created_at")
        .or("is_pinned.is.null,is_pinned.eq.false")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching community posts:", error);
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
          console.error("Error fetching community comments:", commentsError);
        } else {
          for (const comment of (comments || []) as Array<{ post_id: string }>) {
            if (comment && comment.post_id) {
              commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1);
            }
          }
        }
      }

      setPosts(rows.map((post) => ({ ...post, comments_count: commentCounts.get(post.id) || 0 })));
    } catch (err) {
      console.error("Unexpected error in loadPosts:", err);
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
    <section aria-labelledby="community-pulse-title" className="border-y border-white/10 py-5 sm:py-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold text-brand-orange">Conversas recentes</p>
          <h2 id="community-pulse-title" className="font-heading text-xl font-black text-white sm:text-2xl">
            Agora no Brickboard
          </h2>
        </div>
        <Link
          href="/brickboard"
          className="min-h-11 shrink-0 content-center text-xs font-bold text-gray-300 transition-colors hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
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
              className="group flex min-h-36 flex-col justify-between bg-background-void p-4 transition-colors hover:bg-white/[0.035] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              <p className="line-clamp-3 text-sm leading-relaxed text-gray-200 group-hover:text-white">
                {post.content}
              </p>
              <div className="mt-4 flex items-end justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{post.author_name}</p>
                  <p className="mt-0.5 text-gray-500">{timeAgo(post.created_at)}</p>
                </div>
                <span className="shrink-0 text-gray-400">
                  {post.comments_count} {post.comments_count === 1 ? "resposta" : "respostas"}
                </span>
              </div>
            </Link>
          ) : (
            <div key={index} className="min-h-36 animate-pulse bg-background-void p-4">
              <div className="h-3 w-full bg-white/[0.06]" />
              <div className="mt-2 h-3 w-4/5 bg-white/[0.06]" />
              <div className="mt-16 h-3 w-2/5 bg-white/[0.06]" />
            </div>
          )
          )}
        </div>
      )}
    </section>
  );
}
