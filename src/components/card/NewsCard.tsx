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
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { useReactions } from "@/lib/hooks/useReactions";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { Post, PostCategory, PostStats } from "@/lib/types/database";

interface NewsCardProps {
  post: Post;
  stats: PostStats;
}

const HOVER_BORDER_COLOR: Record<PostCategory, string> = {
  breaking: "hover:border-accent-blue/40 hover:shadow-[0_0_20px_rgba(0,163,255,0.12)]",
  hardware: "hover:border-brand-orange/40 hover:shadow-[0_0_20px_rgba(255,94,0,0.12)]",
  industry: "hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
  modding: "hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]",
  review: "hover:border-green-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.12)]",
  opinion: "hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(234,179,8,0.12)]",
};

export function NewsCard({ post, stats }: NewsCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isBrickModalOpen, setIsBrickModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { addPost: addCommunityBrick } = useCommunityFeed();

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
          group bg-card-slate/85 border border-brand-orange-muted/10
          rounded-xl overflow-hidden cursor-pointer
          transition-all duration-300 ease-out
          hover:-translate-y-1 hover:scale-[1.005]
          focus-visible:outline-2 focus-visible:outline-brand-orange
          ${HOVER_BORDER_COLOR[post.category]}
        `}
      >
        <NewsCardHeader category={post.category} publishedAt={post.published_at ?? ""} />

        <h2 
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}
          className="font-heading text-base xs:text-lg md:text-xl font-extrabold text-white leading-snug px-4 min-h-[40px] xs:min-h-[48px] md:min-h-[56px] mb-3 group-hover:text-brand-orange transition-colors duration-300 tracking-tight"
        >
          {post.title}
        </h2>

        <NewsCardMedia src={post.image_url} alt={post.image_alt} category={post.category} />

        <NewsCardSummary summary={post.summary} author={post.author_name} tag={post.author_tag} />

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
