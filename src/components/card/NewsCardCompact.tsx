"use client";

import Link from "next/link";
import { EditorialImage as Image } from "@/components/ui/EditorialImage";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Timer } from "@/components/ui/Timer";
import { useReactions } from "@/lib/hooks/useReactions";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { CommentsDrawer } from "@/components/comments/CommentsDrawer";
import { AuthModal } from "@/components/auth/AuthModal";
import { HypeIcon } from "@/components/reactions/HypeIcon";
import { ReactionsError } from "@/components/reactions/ReactionsError";
import { getDictionary } from "@/lib/i18n";
import { CATEGORY_CONFIG, type Post, type PostStats, type ReactionType } from "@/lib/types/database";

interface NewsCardCompactProps {
  post: Post;
  stats: PostStats;
  headingLevel?: "h2" | "h3";
  onReactionChange?: (postId: string, counts: Record<ReactionType, number>, userReaction: ReactionType | null) => void;
}

export function NewsCardCompact({ post, stats, headingLevel = "h3", onReactionChange }: NewsCardCompactProps) {
  const pathname = usePathname();
  const isEn = pathname?.startsWith("/en");
  const dict = getDictionary(isEn ? "en" : "pt");
  const postTitle = (isEn && post.title_en) || post.title;
  const postHref = isEn ? `/en/posts/${post.slug_en || post.slug}` : `/posts/${post.slug}`;
  const categoryLabel = isEn ? dict.categories[post.category] : CATEGORY_CONFIG[post.category].label;
  const { user } = useAuth();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(post.id);

  const { counts, isPending, error, toggleReaction, userReaction } = useReactions({
    postId: post.id,
    initial: stats.reactions,
    initialUserReaction: stats.userReaction,
    onReactionChange: (newCounts, newUserReaction) => onReactionChange?.(post.id, newCounts, newUserReaction),
  });

  return (
    <>
      <article
        data-home-event="article"
        data-home-target={post.slug}
        className="group relative mb-3 grid grid-cols-1 overflow-hidden bg-[#111217] ring-1 ring-white/10 transition-colors duration-200 hover:ring-brand-orange/50 sm:min-h-[148px] sm:grid-cols-[200px_minmax(0,1fr)] md:grid-cols-[220px_minmax(0,1fr)]"
      >
        <Link href={postHref} aria-label={`${isEn ? "Read" : "Ler"} ${postTitle}`} className="relative block aspect-video overflow-hidden bg-background-void focus-visible:outline-2 focus-visible:outline-brand-orange sm:aspect-auto sm:h-full">
          {post.image_url ? (
            <Image
              src={post.image_url}
              alt={post.image_alt || postTitle}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 767px) 200px, 220px"
              className="object-cover object-center transition-transform duration-500 sm:group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-card-slate">
              <span className="text-xs text-gray-500">{isEn ? "No media" : "Sem mídia"}</span>
            </div>
          )}
          <span className="absolute bottom-0 left-0 z-20 rounded-tr-[18px] bg-brand-orange px-3 py-1.5 font-subtitle text-xs font-black uppercase tracking-[0.06em] text-black">
            {categoryLabel}
            <span aria-hidden="true" className="absolute -right-4 bottom-0 size-4 rounded-bl-[16px] shadow-[-5px_5px_0_4px_#FF5E00]" />
            <span aria-hidden="true" className="absolute -top-4 left-0 size-4 rounded-bl-[16px] shadow-[-5px_5px_0_4px_#FF5E00]" />
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:p-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Timer date={post.published_at ?? ""} />
              <span className="h-px min-w-5 flex-1 bg-white/10" aria-hidden="true" />
            </div>
            {headingLevel === "h2" ? (
              <h2 className="line-clamp-2 font-heading text-sm font-bold leading-snug sm:text-base">
                <Link href={postHref} className="text-white transition-colors hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange">{postTitle}</Link>
              </h2>
            ) : (
              <h3 className="line-clamp-2 font-heading text-sm font-bold leading-snug sm:text-base">
                <Link href={postHref} className="text-white transition-colors hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange">{postTitle}</Link>
              </h3>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleReaction("hype"); }}
              disabled={isPending}
              aria-pressed={userReaction === "hype"}
              className={`group/hype group flex min-h-11 items-center gap-1.5 px-2 font-bold transition-colors ${userReaction === "hype" ? "text-brand-orange" : "text-gray-400 hover:text-brand-orange"}`}
              aria-label={`Hype: ${counts.hype}`}
            >
              <HypeIcon count={counts.hype} active={userReaction === "hype"} size={14} />
              <span>Hype</span>
              <span className="tabular-nums">{counts.hype}</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!user) { setIsAuthModalOpen(true); return; } setIsCommentOpen(true); }}
              className="flex min-h-11 min-w-11 items-center justify-center gap-1 px-2 text-gray-400 transition-colors hover:text-white"
              aria-label={isEn ? `Open comments. ${stats.comments} comments` : `Abrir comentários. ${stats.comments} comentários`}
            >
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {stats.comments}
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleBookmark(post); }}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? (isEn ? "Remove from bookmarks" : "Remover matéria dos itens salvos") : (isEn ? "Save article" : "Salvar matéria")}
              className={`ml-auto flex min-h-11 items-center gap-1 px-2 font-bold transition-colors ${bookmarked ? "text-brand-orange" : "text-gray-400 hover:text-white"}`}
            >
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill={bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {bookmarked ? (isEn ? "Saved" : "Salvo") : (isEn ? "Save" : "Salvar")}
            </button>
          </div>
          <ReactionsError message={error || ""} />
        </div>
      </article>

      <CommentsDrawer postId={post.id} isOpen={isCommentOpen} onClose={() => setIsCommentOpen(false)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
