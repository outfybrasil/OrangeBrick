"use client";

import Link from "next/link";
import type { CommunityPost } from "@/lib/types/community";
import type { ReactionType } from "@/lib/types/database";
import { ReactionButton } from "@/components/reactions/ReactionButton";

interface BrickCardProps {
  post: CommunityPost;
  onReaction: (postId: string, type: ReactionType) => void;
}

export function BrickCard({ post, onReaction }: BrickCardProps) {
  return (
    <article className="bg-card-slate/60 border border-brand-orange-muted/15 rounded-2xl p-5 shadow-lg hover:border-brand-orange-muted/30 transition-all space-y-4">
      {/* CABEÇALHO DO BRICK */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={post.author_avatar}
            alt={post.author_name}
            className="w-10 h-10 rounded-full object-cover border border-brand-orange/30 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-subtitle text-xs font-bold text-white">
                {post.author_name}
              </h4>
              {post.platform_tag && (
                <span className="text-[10px] font-subtitle font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
                  {post.platform_tag}
                </span>
              )}
              {post.is_pinned && (
                <span className="text-[9px] font-subtitle font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                  Fixo
                </span>
              )}
            </div>
            <span className="text-[10px] font-body text-gray-500">
              {new Date(post.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* CONTEÚDO DO BRICK */}
      <p className="text-xs sm:text-sm text-gray-200 font-body leading-relaxed whitespace-pre-line">
        {post.content}
      </p>

      {/* MÍDIA/IMAGEM DO BRICK */}
      {post.media_url && (
        <div className="rounded-xl overflow-hidden border border-brand-orange-muted/10 max-h-80">
          <img src={post.media_url} alt="Mídia do post" className="w-full h-full object-cover" />
        </div>
      )}

      {/* MATÉRIA DO PORTAL ANEXADA */}
      {post.attached_article && (
        <Link
          href={`/posts/${post.attached_article.slug}`}
          className="group/article block p-3.5 rounded-xl bg-background-void/70 border border-brand-orange-muted/20 hover:border-brand-orange/40 transition-all"
        >
          <div className="flex gap-3 items-center">
            {post.attached_article.image_url && (
              <img
                src={post.attached_article.image_url}
                alt={post.attached_article.title}
                className="w-16 h-12 rounded-lg object-cover shrink-0 group-hover/article:scale-105 transition-transform"
              />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-subtitle font-bold text-brand-orange uppercase tracking-wider">
                Matéria do Orange Brick
              </span>
              <h5 className="text-xs font-subtitle font-bold text-white line-clamp-1 group-hover/article:text-brand-orange transition-colors">
                {post.attached_article.title}
              </h5>
              <p className="text-[11px] text-gray-400 font-body line-clamp-1 mt-0.5">
                {post.attached_article.summary}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* REAÇÕES & COMENTÁRIOS */}
      <div className="flex items-center justify-between pt-3 border-t border-brand-orange-muted/10">
        <div className="flex items-center gap-2">
          <ReactionButton
            type="hype"
            icon="hype"
            count={post.reactions.hype || 0}
            active={post.user_reaction === "hype"}
            onClick={() => onReaction(post.id, "hype")}
          />
          <ReactionButton
            type="flop"
            icon="flop"
            count={post.reactions.flop || 0}
            active={post.user_reaction === "flop"}
            onClick={() => onReaction(post.id, "flop")}
          />
          <ReactionButton
            type="salty"
            icon="salty"
            count={post.reactions.salty || 0}
            active={post.user_reaction === "salty"}
            onClick={() => onReaction(post.id, "salty")}
          />
        </div>

        <div className="flex items-center gap-1 text-[11px] font-subtitle text-gray-400">
          <span>{post.comments_count} comentários</span>
        </div>
      </div>
    </article>
  );
}
