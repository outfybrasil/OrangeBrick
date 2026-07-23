"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { NewsCardHeader } from "./NewsCardHeader";
import { NewsCardMedia } from "./NewsCardMedia";
import { NewsCardSummary } from "./NewsCardSummary";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { CommentsDrawer } from "@/components/comments/CommentsDrawer";
import { ComposeBrickModal } from "@/components/community/ComposeBrickModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { BookmarkIcon, SocialLogo } from "@/components/ui/ContentActionIcons";
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
  const { addPost: addCommunityBrick } = useCommunityFeed({ load: false });
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(post.id);

  const { counts, isPending, error, toggleReaction, userReaction } = useReactions({
    postId: post.id,
    initial: stats.reactions,
    initialUserReaction: stats.userReaction,
  });

  const handleClick = () => {
    router.push(`/posts/${post.slug}`);
  };

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

  const handleShareSocial = (platform: "whatsapp" | "twitter" | "telegram", e: React.MouseEvent) => {
    e.stopPropagation();
    let url = "";
    if (platform === "whatsapp") {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    } else if (platform === "twitter") {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    } else if (platform === "telegram") {
      url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

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
        role="article"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`
          group bg-card-slate/85 border border-white/[0.08]
          rounded-xl overflow-hidden cursor-pointer
          transition-colors duration-200
          hover:border-white/[0.16] hover:bg-card-slate
          focus-visible:outline-2 focus-visible:outline-brand-orange
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
          {post.title}
        </h2>

        <NewsCardMedia src={post.image_url} alt={post.image_alt} category={post.category} />

        <NewsCardSummary summary={post.summary} author={post.author_name} tag={post.author_tag} />

        <div
          className="flex flex-col gap-2 border-t border-brand-orange-muted/10 px-3 py-2 text-xs text-gray-400 xs:flex-row xs:items-center xs:justify-between sm:px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] font-semibold text-gray-500">Compartilhar</span>
          <div className="grid w-full grid-cols-3 gap-1.5 xs:w-auto">
            <button
              onClick={(e) => handleShareSocial("whatsapp", e)}
              aria-label="Compartilhar no WhatsApp"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-2 text-[10px] font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/10 hover:text-[#50e383] xs:text-[11px]"
              title="Compartilhar no WhatsApp"
            >
              <SocialLogo network="whatsapp" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={(e) => handleShareSocial("telegram", e)}
              aria-label="Compartilhar no Telegram"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-2 text-[10px] font-semibold text-[#26A5E4] transition-colors hover:bg-[#26A5E4]/10 hover:text-[#62c3f2] xs:text-[11px]"
              title="Compartilhar no Telegram"
            >
              <SocialLogo network="telegram" />
              <span>Telegram</span>
            </button>
            <button
              onClick={(e) => handleShareSocial("twitter", e)}
              aria-label="Compartilhar no X"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-2 text-[10px] font-semibold text-gray-200 transition-colors hover:bg-white/[0.07] hover:text-white xs:text-[11px]"
              title="Compartilhar no X"
            >
              <SocialLogo network="x" />
              <span>X</span>
            </button>
          </div>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
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
