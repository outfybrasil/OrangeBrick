"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NewsCardHeader } from "./NewsCardHeader";
import { NewsCardMedia } from "./NewsCardMedia";
import { NewsCardSummary } from "./NewsCardSummary";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { CommentsDrawer } from "@/components/comments/CommentsDrawer";
import { useReactions } from "@/lib/hooks/useReactions";
import { usePostViews } from "@/lib/hooks/usePostViews";
import { useCommentCount } from "@/lib/hooks/useCommentCount";
import type { Post, ReactionType, PostCategory } from "@/lib/types/database";

interface NewsCardProps {
  post: Post;
  initialReactions: Record<ReactionType, number>;
}

const HOVER_BORDER_COLOR: Record<PostCategory, string> = {
  breaking: "hover:border-accent-blue/40 hover:shadow-[0_0_20px_rgba(0,163,255,0.12)]",
  hardware: "hover:border-brand-orange/40 hover:shadow-[0_0_20px_rgba(255,94,0,0.12)]",
  industry: "hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
  modding: "hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]",
  review: "hover:border-green-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.12)]",
  opinion: "hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(234,179,8,0.12)]",
};

export function NewsCard({ post, initialReactions }: NewsCardProps) {
  const router = useRouter();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const { counts, isPending, error, toggleReaction } = useReactions({
    postId: post.id,
    initial: initialReactions,
  });
  const { count: viewCount } = usePostViews({ postId: post.id });
  const commentCount = useCommentCount(post.id);

  const handleClick = () => {
    router.push(`/post?slug=${post.slug}`);
  };

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
          className="font-mono text-base md:text-lg font-bold text-white leading-snug px-4 h-[44px] md:h-[50px] mb-3 group-hover:text-brand-orange transition-colors duration-300"
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
            defendo={counts.defendo}
            brick={counts.brick}
            category={post.category}
            onToggle={toggleReaction}
            disabled={isPending}
            error={error}
            commentCount={commentCount}
            onCommentClick={() => setIsCommentOpen(true)}
            viewCount={viewCount}
          />
        </div>
      </article>

      <CommentsDrawer
        postId={post.id}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
      />
    </>
  );
}
