"use client";

import Link from "next/link";
import { useState } from "react";
import type { CommunityPost, CommunityComment } from "@/lib/types/community";
import type { ReactionType } from "@/lib/types/database";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";

import { UserBadge } from "@/components/ui/UserBadge";

interface BrickCardProps {
  post: CommunityPost;
  onReaction: (postId: string, type: ReactionType) => void;
  onDeletePost?: (postId: string) => void;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  getComments: (postId: string) => Promise<CommunityComment[]>;
}

export function BrickCard({ post, onReaction, onDeletePost, onAddComment, onDeleteComment, getComments }: BrickCardProps) {
  const { user, profile } = useAuth();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  const currentUserId = user?.id;
  const isPostOwner = !!(user && post.user_id && post.user_id === user.id);

  const currentUserName =
    profile?.nickname ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Leitor Orange Brick";

  const handleCommentClick = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (isCommentOpen) {
      setIsCommentOpen(false);
      return;
    }
    setIsCommentOpen(true);
    if (comments.length === 0) {
      setIsCommentsLoading(true);
      try {
        const fetched = await getComments(post.id);
        setComments(fetched);
      } finally {
        setIsCommentsLoading(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    await onAddComment(post.id, trimmed);
    setCommentText("");

    const fetched = await getComments(post.id);
    setComments(fetched);
  };

  const handleDeleteComment = async (commentId: string) => {
    await onDeleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const totalCommentCount = comments.length || post.comments_count || 0;

  return (
    <article className="bg-card-slate/60 border border-brand-orange-muted/15 rounded-2xl p-5 shadow-lg hover:border-brand-orange-muted/30 transition-all space-y-4 relative group/card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={post.author_avatar}
            alt={post.author_name}
            className="w-10 h-10 rounded-full object-cover border border-brand-orange/30 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-subtitle text-xs font-bold text-white">
                {post.author_name}
              </h4>
              <UserBadge nickname={post.author_name} />
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

        {isPostOwner && onDeletePost && (
          <button
            onClick={() => onDeletePost(post.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-subtitle text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
            title="Apagar este post"
          >
            <span>🗑️</span>
            <span className="hidden xs:inline">Apagar</span>
          </button>
        )}
      </div>

      <p className="text-xs sm:text-sm text-gray-200 font-body leading-relaxed whitespace-pre-line">
        {post.content}
      </p>

      {post.media_url && (
        <div className="rounded-xl overflow-hidden border border-brand-orange-muted/10 max-h-80">
          <img src={post.media_url} alt="Mídia do post" className="w-full h-full object-cover" />
        </div>
      )}

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

      <div className="pt-2">
        <ReactionBar
          hype={post.reactions.hype || 0}
          flop={(post.reactions.flop || 0) + (post.reactions.salty || 0)}
          salty={0}
          onToggle={(type) => onReaction(post.id, type)}
          activeReaction={post.user_reaction}
          commentCount={totalCommentCount}
          onCommentClick={handleCommentClick}
          onRepostClick={handleCommentClick}
        />
      </div>

      {isCommentOpen && (
        <div className="pt-4 border-t border-brand-orange-muted/15 space-y-3">
          <div className="flex items-center justify-between text-xs font-subtitle text-gray-400">
            <span className="font-bold text-white">Respostas ({totalCommentCount})</span>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {isCommentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-500 font-subtitle py-2 italic text-center">
                Seja o primeiro a responder a esse Brick!
              </p>
            ) : (
              comments.map((c) => {
                const canDeleteComment = isPostOwner || c.user_id === currentUserId;
                return (
                  <div key={c.id} className="bg-[#0D0F14] border border-gray-800/80 rounded-xl p-3 text-xs space-y-1 shadow-inner group/comm">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-white">{c.author_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-subtitle text-gray-500">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {canDeleteComment && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-gray-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer text-[11px]"
                            title="Apagar resposta"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 font-body leading-relaxed">{c.content}</p>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva sua resposta..."
              maxLength={280}
              className="flex-1 bg-[#0D0F14] border border-gray-800 focus:border-brand-orange px-3.5 py-2 text-xs font-body text-white placeholder-gray-500 rounded-xl outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="px-4 py-2 text-xs font-subtitle font-bold bg-brand-orange text-white rounded-xl disabled:opacity-40 hover:bg-brand-orange/90 transition-all cursor-pointer shrink-0"
            >
              Responder
            </button>
          </form>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </article>
  );
}
