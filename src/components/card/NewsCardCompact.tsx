"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { useReactions } from "@/lib/hooks/useReactions";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { CommentsDrawer } from "@/components/comments/CommentsDrawer";
import { AuthModal } from "@/components/auth/AuthModal";
import type { Post, PostStats } from "@/lib/types/database";

interface NewsCardCompactProps {
  post: Post;
  stats: PostStats;
}

export function NewsCardCompact({ post, stats }: NewsCardCompactProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(post.id);

  const { counts, isPending, toggleReaction, userReaction } = useReactions({
    postId: post.id,
    initial: stats.reactions,
    initialUserReaction: stats.userReaction,
  });

  useEffect(() => {
    if (shareStatus === "idle") return;
    const id = window.setTimeout(() => setShareStatus("idle"), 2500);
    return () => window.clearTimeout(id);
  }, [shareStatus]);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/posts/${post.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url }); } catch {}
      return;
    }
    try { await navigator.clipboard.writeText(url); setShareStatus("copied"); } catch {}
  };

  return (
    <>
      <article
        data-home-event="article"
        data-home-target={post.slug}
        role="article"
        tabIndex={0}
        onClick={() => router.push(`/posts/${post.slug}`)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/posts/${post.slug}`); } }}
        className="group flex gap-0 bg-background-void border border-white/[0.08] cursor-pointer transition-colors hover:bg-white/[0.025] hover:border-white/15 focus-visible:outline-2 focus-visible:outline-brand-orange overflow-hidden"
      >
        {/* THUMBNAIL */}
        <div className="relative w-[160px] shrink-0 self-stretch overflow-hidden bg-[#08090C]">
          {post.image_url ? (
            <>
              <img src={post.image_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover blur-md opacity-30" />
              <img src={post.image_url} alt={post.image_alt || ""} className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-card-slate">
              <span className="text-xs text-gray-600">Sem mídia</span>
            </div>
          )}
        </div>

        {/* CONTEÚDO */}
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Tag category={post.category} />
              <Timer date={post.published_at ?? ""} />
            </div>
            <h2 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-white transition-colors group-hover:text-brand-orange sm:text-base">
              {post.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400 hidden sm:block">
              {post.summary}
            </p>
          </div>

          {/* ACTION BAR */}
          <div
            className="mt-2 flex items-center gap-3 text-[11px]"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleReaction("hype"); }}
              disabled={isPending}
              className={`flex items-center gap-1 font-bold transition-colors ${userReaction === "hype" ? "text-brand-orange" : "text-gray-500 hover:text-brand-orange"}`}
              aria-label="Hype"
            >
              🔥 {counts.hype}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!user) { setIsAuthModalOpen(true); return; } setIsCommentOpen(true); }}
              className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors"
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
              className={`ml-auto flex items-center gap-1 font-bold transition-colors ${bookmarked ? "text-brand-orange" : "text-gray-500 hover:text-white"}`}
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
