"use client";

import Link from "next/link";
import { useState } from "react";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { useReactions } from "@/lib/hooks/useReactions";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { CommentsDrawer } from "@/components/comments/CommentsDrawer";
import { AuthModal } from "@/components/auth/AuthModal";
import { CATEGORY_CONFIG, type Post, type PostStats } from "@/lib/types/database";

interface NewsCardCompactProps {
  post: Post;
  stats: PostStats;
}

export function NewsCardCompact({ post, stats }: NewsCardCompactProps) {
  const { user } = useAuth();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(post.id);

  const { counts, isPending, toggleReaction, userReaction } = useReactions({
    postId: post.id,
    initial: stats.reactions,
    initialUserReaction: stats.userReaction,
  });

  return (
    <>
      <article
        data-home-event="article"
        data-home-target={post.slug}
        className="group relative mb-3 grid h-[148px] grid-cols-[130px_minmax(0,1fr)] overflow-hidden rounded-[20px] bg-[#111217] shadow-[0_12px_30px_rgba(0,0,0,0.24)] ring-1 ring-white/10 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(0,0,0,0.34)] xs:grid-cols-[150px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)] md:grid-cols-[220px_minmax(0,1fr)]"
      >
        <Link href={`/posts/${post.slug}`} aria-label={`Ler ${post.title}`} className="relative block h-full overflow-hidden bg-background-void focus-visible:outline-2 focus-visible:outline-brand-orange">
          {post.image_url ? (
            <>
              <img
                src={post.image_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-45 blur-xl"
                loading="lazy"
              />
              <img
                src={post.image_url}
                alt={post.image_alt || ""}
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-card-slate">
              <span className="text-xs text-gray-600">Sem mídia</span>
            </div>
          )}
          <span className="absolute bottom-0 left-0 z-20 rounded-tr-[18px] bg-brand-orange px-3 py-1.5 font-subtitle text-[11px] font-black uppercase tracking-[0.06em] text-black shadow-md">
            {CATEGORY_CONFIG[post.category].label}
            <span aria-hidden="true" className="absolute -right-4 bottom-0 size-4 rounded-bl-[16px] shadow-[-5px_5px_0_4px_#FF5E00]" />
            <span aria-hidden="true" className="absolute -top-4 left-0 size-4 rounded-bl-[16px] shadow-[-5px_5px_0_4px_#FF5E00]" />
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col justify-between p-2.5 sm:p-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Timer date={post.published_at ?? ""} />
              <span className="h-px min-w-5 flex-1 bg-white/10" aria-hidden="true" />
            </div>
            <h2 className="line-clamp-2 font-heading text-sm font-bold leading-snug sm:text-base">
              <Link href={`/posts/${post.slug}`} className="text-white transition-colors hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange">{post.title}</Link>
            </h2>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleReaction("hype"); }}
              disabled={isPending}
              className={`flex min-h-11 items-center gap-1 px-2 font-bold transition-colors ${userReaction === "hype" ? "text-brand-orange" : "text-gray-400 hover:text-brand-orange"}`}
              aria-label={`Marcar como hype. ${counts.hype} reações`}
            >
              Hype {counts.hype}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!user) { setIsAuthModalOpen(true); return; } setIsCommentOpen(true); }}
              className="flex min-h-11 items-center gap-1 px-2 text-gray-400 transition-colors hover:text-white"
              aria-label={`Abrir comentários. ${stats.comments} comentários`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {stats.comments}
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleBookmark(post); }}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? "Remover matéria dos itens salvos" : "Salvar matéria"}
              className={`ml-auto flex min-h-11 items-center gap-1 px-2 font-bold transition-colors ${bookmarked ? "text-brand-orange" : "text-gray-400 hover:text-white"}`}
            >
              <svg className="h-3.5 w-3.5" fill={bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {bookmarked ? "Salvo" : "Salvar"}
            </button>
          </div>
        </div>
      </article>

      <CommentsDrawer postId={post.id} isOpen={isCommentOpen} onClose={() => setIsCommentOpen(false)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
