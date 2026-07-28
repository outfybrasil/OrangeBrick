"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { NewsCardHeader } from "./NewsCardHeader";
import { NewsCardMedia } from "./NewsCardMedia";
import { NewsCardSummary } from "./NewsCardSummary";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { CommentsDrawer } from "@/components/comments/CommentsDrawer";
import { ComposeBrickModal } from "@/components/community/ComposeBrickModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { BookmarkIcon } from "@/components/ui/ContentActionIcons";
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { useReactions } from "@/lib/hooks/useReactions";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { Post, PostStats } from "@/lib/types/database";

interface NewsCardProps {
  post: Post;
  stats: PostStats;
}

import { useBookmarks } from "@/lib/hooks/useBookmarks";

export function NewsCard({ post, stats }: NewsCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isBrickModalOpen, setIsBrickModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const { addPost: addCommunityBrick } = useCommunityFeed({ load: false });
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(post.id);

  const { counts, isPending, error, toggleReaction, userReaction } = useReactions({
    postId: post.id,
    initial: stats.reactions,
    initialUserReaction: stats.userReaction,
  });

  const handleCommentClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsCommentOpen(true);
  };

  const handleRepostClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsBrickModalOpen(true);
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/posts/${post.slug}` : `/posts/${post.slug}`;
  const shareText = `Confira no Orange Brick: "${post.title}"`;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: shareText, url: shareUrl });
      } catch {
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  };

  useEffect(() => {
    if (shareStatus === "idle") return;
    const timeoutId = window.setTimeout(() => setShareStatus("idle"), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [shareStatus]);

  const attachedArticle = useMemo(
    () => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      image_url: post.image_url || undefined,
      category: post.category,
    }),
    [post]
  );

  return (
    <>
      <article
        data-home-event="article"
        data-home-target={post.slug}
        className={`
          group bg-background-void border-b border-r border-white/10
          overflow-hidden
          transition-colors duration-200
          hover:bg-white/[0.025] hover:border-white/20
        `}
      >
        <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3 sm:px-4">
          <NewsCardHeader category={post.category} publishedAt={post.published_at ?? ""} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(post);
            }}
            aria-pressed={bookmarked}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors ${
              bookmarked
                ? "bg-brand-orange/10 text-brand-orange"
                : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
            }`}
            title={bookmarked ? "Remover das matérias salvas" : "Salvar matéria para ler depois"}
          >
            <BookmarkIcon filled={bookmarked} />
            <span>{bookmarked ? "Salvo" : "Salvar"}</span>
          </button>
        </div>

        <h2
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}
          className="mb-3 min-h-[40px] break-words px-3 font-heading text-base font-extrabold leading-snug tracking-tight text-white transition-colors duration-300 group-hover:text-brand-orange xs:min-h-[48px] xs:text-lg sm:px-4 md:min-h-[56px] md:text-xl"
        >
          <Link href={`/posts/${post.slug}`} className="focus-visible:outline-2 focus-visible:outline-brand-orange">{post.title}</Link>
        </h2>

        <NewsCardMedia src={post.image_url} alt={post.image_alt} category={post.category} />

        <NewsCardSummary summary={post.summary} author={post.author_name} tag={post.author_tag} />

        <div
        >
          <ReactionBar
            hype={counts.hype}
            flop={counts.flop}
            salty={counts.salty}
            onToggle={toggleReaction}
            activeReaction={userReaction}
            disabled={isPending}
            error={error}
            commentCount={stats.comments}
            onCommentClick={handleCommentClick}
            onRepostClick={handleRepostClick}
            viewCount={stats.views}
          />
          <div className="flex justify-end border-t border-white/[0.06] px-3 py-1 sm:px-4">
            <button
              type="button"
              onClick={handleShare}
              aria-live="polite"
              className="flex min-h-11 items-center gap-2 px-2 text-xs font-semibold text-gray-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
              </svg>
              {shareStatus === "copied"
                ? "Link copiado"
                : shareStatus === "error"
                  ? "Não foi possível copiar"
                  : "Compartilhar"}
            </button>
          </div>
        </div>
      </article>

      <CommentsDrawer
        postId={post.id}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
      />

      <ComposeBrickModal
        isOpen={isBrickModalOpen}
        onClose={() => setIsBrickModalOpen(false)}
        initialArticle={attachedArticle}
        onPublish={(content, platformTag, article, mediaUrl) => {
          addCommunityBrick(content, platformTag, article, mediaUrl);
          router.push("/brickboard");
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
