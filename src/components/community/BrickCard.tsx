"use client";

import Link from "next/link";
import { useState } from "react";
import type { CommunityPost, CommunityComment } from "@/lib/types/community";
import type { ReactionType } from "@/lib/types/database";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";

import { UserBadge } from "@/components/ui/UserBadge";
import { resolveAvatarUrl } from "@/lib/avatar";

interface BrickCardProps {
  post: CommunityPost;
  onReaction: (postId: string, type: ReactionType) => void;
  onDeletePost?: (postId: string) => void;
  onSharePost: (post: CommunityPost, comment: string) => Promise<void>;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleCommentLike?: (commentId: string) => Promise<void>;
  getComments: (postId: string) => Promise<CommunityComment[]>;
}


export function BrickCard({ post, onReaction, onDeletePost, onSharePost, onAddComment, onDeleteComment, onToggleCommentLike, getComments }: BrickCardProps) {
  const { user, profile } = useAuth();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  const currentUserId = user?.id;
  const isPostOwner = !!(user && post.user_id && post.user_id === user.id);

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

  const handleShareClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsShareOpen(!isShareOpen);
    setShareText("");
  };

  const handleSubmitShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = shareText.trim();
    if (!trimmed) return;
    setIsSharing(true);
    await onSharePost(post, trimmed);
    setShareText("");
    setIsShareOpen(false);
    setIsSharing(false);
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

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const newHasLiked = !c.user_has_liked;
        const newCount = newHasLiked ? c.likes_count + 1 : Math.max(0, c.likes_count - 1);
        return { ...c, user_has_liked: newHasLiked, likes_count: newCount };
      })
    );
    if (onToggleCommentLike) {
      await onToggleCommentLike(commentId);
    }
  };

  const totalCommentCount = comments.length || post.comments_count || 0;
  const avatarSrc = resolveAvatarUrl(post.author_avatar, post.author_name);

  return (
    <article className="bg-card-slate/70 border border-brand-orange-muted/15 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg hover:border-brand-orange-muted/30 transition-all space-y-3 sm:space-y-4 relative group/card">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/profile/${encodeURIComponent(post.author_name)}`} className="flex items-center gap-3 min-w-0 group/author">
          <img
            src={avatarSrc}
            alt={post.author_name}
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"; }}
            style={{ width: "38px", height: "38px", minWidth: "38px", minHeight: "38px", maxWidth: "38px", maxHeight: "38px", borderRadius: "9999px", objectFit: "cover" }}
            className="border border-brand-orange/30 shrink-0 group-hover/author:scale-105 transition-transform bg-[#08090C]"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h4 className="font-subtitle text-xs font-bold text-white truncate group-hover/author:text-brand-orange transition-colors">
                {post.author_name}
              </h4>
              <UserBadge nickname={post.author_name} />
              {post.platform_tag && (
                <span className="text-[9px] sm:text-[10px] font-subtitle font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded border border-brand-orange/20">
                  {post.platform_tag}
                </span>
              )}
              {post.is_pinned && (
                <span className="text-[9px] font-subtitle font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                  Fixo
                </span>
              )}
            </div>
            <span className="text-[10px] font-body text-gray-500 block">
              {new Date(post.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </Link>

        {isPostOwner && onDeletePost && (
          <button
            onClick={() => onDeletePost(post.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-subtitle text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer shrink-0"
            title="Apagar este post"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden xs:inline">Apagar</span>
          </button>
        )}
      </div>

      <p className="text-xs sm:text-sm text-gray-200 font-body leading-relaxed whitespace-pre-line break-words">
        {post.content}
      </p>

      {post.media_url && (
        <div className="rounded-xl overflow-hidden border border-brand-orange-muted/15 bg-background-void/90 p-1 flex justify-center items-center">
          <img src={post.media_url} alt="Mídia do post" className="max-h-[500px] w-full object-contain rounded-lg" />
        </div>
      )}

      {post.attached_article && (
        <Link
          href={`/posts/${post.attached_article.slug}`}
          className="group/article block p-3 sm:p-3.5 rounded-xl bg-background-void/70 border border-brand-orange-muted/20 hover:border-brand-orange/40 transition-all"
        >
          <div className="flex gap-3 items-center">
            {post.attached_article.image_url && (
              <img
                src={post.attached_article.image_url}
                alt={post.attached_article.title}
                className="w-14 h-11 sm:w-16 sm:h-12 rounded-lg object-cover shrink-0 group-hover/article:scale-105 transition-transform"
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

      {post.shared_post && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-[#0D0F14]/80 border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[10px] font-subtitle font-bold text-emerald-400 uppercase tracking-wider truncate">
              Republicado de {post.shared_post.original_author_name}
            </span>
          </div>
          <div className="flex gap-2.5 items-start">
            <img
              src={resolveAvatarUrl(post.shared_post.original_author_avatar, post.shared_post.original_author_name)}
              alt={post.shared_post.original_author_name}
              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"; }}
              style={{ width: "28px", height: "28px", minWidth: "28px", minHeight: "28px", maxWidth: "28px", maxHeight: "28px", borderRadius: "9999px", objectFit: "cover" }}
              className="border border-emerald-500/30 shrink-0 mt-0.5 bg-[#08090C]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-subtitle font-bold text-white">
                  {post.shared_post.original_author_name}
                </span>
                <UserBadge nickname={post.shared_post.original_author_name} />
                {post.shared_post.original_platform_tag && (
                  <span className="text-[9px] font-subtitle font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded border border-brand-orange/20">
                    {post.shared_post.original_platform_tag}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-300 font-body leading-relaxed mt-1 whitespace-pre-line break-words">
                {post.shared_post.original_content}
              </p>

              {post.shared_post.original_attached_article && (
                <Link
                  href={`/posts/${post.shared_post.original_attached_article.slug}`}
                  className="group/article block p-2.5 mt-2 rounded-lg bg-background-void/90 border border-brand-orange-muted/20 hover:border-brand-orange/40 transition-all"
                >
                  <div className="flex gap-2.5 items-center">
                    {post.shared_post.original_attached_article.image_url && (
                      <img
                        src={post.shared_post.original_attached_article.image_url}
                        alt={post.shared_post.original_attached_article.title}
                        className="w-12 h-9 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-subtitle font-bold text-brand-orange uppercase tracking-wider block">
                        Matéria Citada
                      </span>
                      <h5 className="text-[11px] font-subtitle font-bold text-white line-clamp-1 group-hover/article:text-brand-orange transition-colors">
                        {post.shared_post.original_attached_article.title}
                      </h5>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pt-1">
        <ReactionBar
          hype={post.reactions.hype || 0}
          flop={(post.reactions.flop || 0) + (post.reactions.salty || 0)}
          salty={0}
          onToggle={(type) => onReaction(post.id, type)}
          activeReaction={post.user_reaction}
          commentCount={totalCommentCount}
          shareCount={post.shares_count}
          onCommentClick={handleCommentClick}
          onRepostClick={handleShareClick}
        />
      </div>

      {isShareOpen && (
        <div className="pt-3 border-t border-brand-orange-muted/15 space-y-2.5">
          <p className="text-[11px] font-subtitle text-gray-400">
            Adicione seu comentário ao republicar:
          </p>
          <form onSubmit={handleSubmitShare} className="flex gap-2">
            <input
              type="text"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              placeholder="Seu comentário sobre isso..."
              maxLength={280}
              className="flex-1 bg-[#0D0F14] border border-gray-800 focus:border-emerald-500 px-3.5 py-2 text-xs font-body text-white placeholder-gray-500 rounded-xl outline-none transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!shareText.trim() || isSharing}
              className="px-3.5 py-2 text-xs font-subtitle font-bold bg-emerald-600 text-white rounded-xl disabled:opacity-40 hover:bg-emerald-500 transition-all cursor-pointer shrink-0"
            >
              {isSharing ? "..." : "Republicar"}
            </button>
          </form>
        </div>
      )}

      {isCommentOpen && (
        <div className="pt-3 border-t border-brand-orange-muted/15 space-y-3">
          <div className="flex items-center justify-between text-xs font-subtitle text-gray-400">
            <span className="font-bold text-white">Respostas ({totalCommentCount})</span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
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
                  <div key={c.id} className="bg-[#0D0F14] border border-gray-800/80 rounded-xl p-3 text-xs space-y-2 shadow-inner group/comm">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/profile/${encodeURIComponent(c.author_name)}`} className="flex items-center gap-2 min-w-0 group/cauthor">
                        <img
                          src={resolveAvatarUrl(c.author_avatar, c.author_name)}
                          alt={c.author_name}
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"; }}
                          style={{ width: "26px", height: "26px", minWidth: "26px", minHeight: "26px", maxWidth: "26px", maxHeight: "26px", borderRadius: "9999px", objectFit: "cover" }}
                          className="border border-brand-orange/20 shrink-0 group-hover/cauthor:scale-105 transition-transform bg-[#08090C]"
                        />
                        <span className="font-heading font-bold text-white truncate group-hover/cauthor:text-brand-orange transition-colors">{c.author_name}</span>
                        <UserBadge nickname={c.author_name} />
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
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
                    <p className="text-gray-300 font-body leading-relaxed pl-8 break-words">{c.content}</p>
                    <div className="flex items-center justify-end pl-8 pt-1">
                      <button
                        type="button"
                        onClick={() => handleLikeComment(c.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-subtitle font-bold transition-all cursor-pointer ${
                          c.user_has_liked
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : "text-gray-400 hover:text-red-400 hover:bg-card-slate"
                        }`}
                      >
                        <span>{c.user_has_liked ? "❤️" : "🤍"}</span>
                        <span>{c.likes_count || 0}</span>
                      </button>
                    </div>
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
