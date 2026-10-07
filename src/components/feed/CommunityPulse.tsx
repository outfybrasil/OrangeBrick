"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils/time-ago";
import { resolveAvatarUrl } from "@/lib/avatar";

interface PulsePost {
  id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
  comments_count: number | null;
}

export function CommunityPulse() {
  const supabase = useMemo(() => createDataClient(), []);
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

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
          setPosts(rows.map((post) => ({ ...post, comments_count: null })));
          return;
        }
        for (const comment of (comments || []) as Array<{ post_id: string }>) {
          if (comment && comment.post_id) {
            commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1);
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
    <section aria-labelledby="community-pulse-title" className="border-y border-white/10 py-6 my-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.15em] text-brand-orange">Comunidade Gamer</p>
          <h2 id="community-pulse-title" className="font-heading text-xl font-black text-white sm:text-2xl">
            A conversa continua no BrickBoard
          </h2>
        </div>
        <Link
          href="/brickboard"
          className="shrink-0 text-xs font-bold text-brand-orange transition-colors hover:text-white flex items-center gap-1"
        >
          <span>Ir para o BrickBoard</span>
          <span aria-hidden="true">→</span>
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
      ) : isLoaded && posts.length > 0 ? (
        <div className="space-y-3">
          <Link
            href={`/brickboard?post=${posts[0].id}`}
            data-home-event="brickboard"
            data-home-target={posts[0].id}
            className="group block rounded-lg border border-white/10 bg-gradient-to-r from-[#191912] via-[#101618] to-[#0e1215] p-5 sm:p-6 transition-all duration-200 hover:border-brand-orange/40 hover:shadow-[0_4px_24px_rgba(255,94,0,0.06)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="flex -space-x-3 shrink-0">
                  {posts.slice(0, 3).map((p, idx) => (
                    p.author_avatar ? (
                      <img
                        key={p.id}
                        src={resolveAvatarUrl(p.author_avatar, p.author_name)}
                        alt={p.author_name}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-[#101618]"
                        style={{ zIndex: 3 - idx }}
                      />
                    ) : (
                      <div
                        key={p.id}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/20 text-xs font-black text-brand-orange ring-2 ring-[#101618]"
                        style={{ zIndex: 3 - idx }}
                      >
                        {p.author_name.charAt(0).toUpperCase()}
                      </div>
                    )
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 font-heading text-base sm:text-lg font-bold text-white transition-colors group-hover:text-brand-orange">
                    {posts[0].content}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                    Iniciado por <strong className="text-gray-300 font-semibold">{posts[0].author_name}</strong> · {posts[0].comments_count === null ? "respostas indisponíveis" : `${posts[0].comments_count} ${posts[0].comments_count === 1 ? "resposta" : "respostas"}`}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-orange shrink-0 self-end sm:self-center transition-transform group-hover:translate-x-1">
                <span>Entrar na conversa</span>
                <span aria-hidden="true">→</span>
              </div>
            </div>
          </Link>

          {posts.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {posts.slice(1, 3).map((post) => (
                <Link
                  key={post.id}
                  href={`/brickboard?post=${post.id}`}
                  data-home-event="brickboard"
                  data-home-target={post.id}
                  className="group flex flex-col justify-between rounded-lg border border-white/10 bg-[#111217] p-4 transition-colors hover:border-brand-orange/40 hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    {post.author_avatar ? (
                      <img
                        src={resolveAvatarUrl(post.author_avatar, post.author_name)}
                        alt={post.author_name}
                        referrerPolicy="no-referrer"
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange/20 text-xs font-bold text-brand-orange">
                        {post.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-xs font-bold text-gray-300">{post.author_name}</span>
                    <span className="text-[11px] text-gray-500">· {timeAgo(post.created_at)}</span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-gray-300 group-hover:text-white">
                    {post.content}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{post.comments_count === null ? "Respostas indisponíveis" : `${post.comments_count} ${post.comments_count === 1 ? "resposta" : "respostas"}`}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-24 animate-pulse rounded-lg bg-white/[0.04] p-5" />
      )}
    </section>
  );
}
