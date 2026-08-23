"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import type { CommunityPost, CommunityComment } from "@/lib/types/community";
import type { ReactionType } from "@/lib/types/database";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";

import { UserBadge } from "@/components/ui/UserBadge";
import { resolveAvatarUrl } from "@/lib/avatar";
import { SpoilerText } from "@/components/community/SpoilerText";
import { timeAgo } from "@/lib/utils/time-ago";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { createDataClient } from "@/lib/supabase/client";

interface BrickCardProps {
  post: CommunityPost;
  onReaction: (postId: string, type: ReactionType) => void;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (postId: string, newContent: string) => Promise<void> | void;
  onSharePost: (post: CommunityPost, comment: string) => Promise<void>;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleCommentLike?: (commentId: string) => Promise<void>;
  getComments: (postId: string) => Promise<CommunityComment[]>;
  isFollowingAuthor?: boolean;
  onToggleFollowAuthor?: () => void;
}

const reportReasons = [
  "Spam ou publicidade",
  "Assédio ou ataque pessoal",
  "Discurso de ódio",
  "Spoiler sem aviso",
  "Informação enganosa",
  "Outro conteúdo inadequado",
];

export function BrickCard({ post, onReaction, onDeletePost, onEditPost, onSharePost, onAddComment, onDeleteComment, onToggleCommentLike, getComments, isFollowingAuthor = false, onToggleFollowAuthor }: BrickCardProps) {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [hypePulse, setHypePulse] = useState(0);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentPendingDelete, setCommentPendingDelete] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [reportedContent, setReportedContent] = useState<string[]>([]);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState("");
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [isReporting, setIsReporting] = useState(false);
  const reportDialogRef = useModalDialog<HTMLDivElement>(
    reportTarget !== null,
    () => setReportTarget(null)
  );
  const deleteDialogRef = useModalDialog<HTMLDivElement>(
    commentPendingDelete !== null,
    () => setCommentPendingDelete(null)
  );

  const [isDeletePostOpen, setIsDeletePostOpen] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const deletePostDialogRef = useModalDialog<HTMLDivElement>(
    isDeletePostOpen,
    () => setIsDeletePostOpen(false)
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editDialogRef = useModalDialog<HTMLDivElement>(
    isEditOpen,
    () => setIsEditOpen(false)
  );

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const currentUserId = user?.id;
  const isPostOwner = !!(user && post.user_id && post.user_id === user.id);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onEditPost) return;
    const trimmed = editContent.trim();
    if (!trimmed || trimmed.length > 280) return;
    setIsSavingEdit(true);
    try {
      await onEditPost(post.id, trimmed);
      setIsEditOpen(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleReaction = (type: ReactionType) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (type === "hype" && post.user_reaction !== "hype") setHypePulse((value) => value + 1);
    onReaction(post.id, type);
  };

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

  const handleQuickShare = async () => {
    const url = `${window.location.origin}/brickboard?post=${encodeURIComponent(post.id)}`;
    if (navigator.share) {
      await navigator.share({ title: "Orange Brick", text: post.content.slice(0, 160), url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setShareNotice("Link copiado para a área de transferência!");
    window.setTimeout(() => setShareNotice(""), 3000);
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
    setIsDeletingComment(true);
    try {
      await onDeleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentPendingDelete(null);
    } finally {
      setIsDeletingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!onDeletePost) return;
    setIsDeletingPost(true);
    try {
      await onDeletePost(post.id);
      setIsDeletePostOpen(false);
    } finally {
      setIsDeletingPost(false);
    }
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

  const openReport = (contentType: "post" | "comment", contentId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setReportMessage(null);
    setReportReason(reportReasons[0]);
    setReportTarget({ type: contentType, id: contentId });
  };

  const handleReport = async () => {
    if (!user || !reportTarget) return;
    setIsReporting(true);
    const reportKey = `${reportTarget.type}:${reportTarget.id}`;
    const { error } = await supabase.rpc("report_community_content", {
      target_type: reportTarget.type,
      target_id: reportTarget.id,
      target_reason: reportReason,
    });
    if (error) {
      setReportMessage(error.message.includes("duplicate") ? "Você já denunciou este conteúdo." : "Não foi possível enviar a denúncia. Tente novamente.");
      setIsReporting(false);
      return;
    }
    setReportedContent((current) => [...current, reportKey]);
    setReportMessage("Denúncia enviada para análise.");
    setReportTarget(null);
    setIsReporting(false);
  };

  const totalCommentCount = comments.length || post.comments_count || 0;
  const avatarSrc = resolveAvatarUrl(post.author_avatar, post.author_name, post.is_official);

  return (
    <article className="group/card relative space-y-4 border-b border-white/10 bg-card-slate/20 px-1 pb-6 pt-2 transition-colors hover:bg-white/[0.025] sm:px-5 sm:pb-7 sm:pt-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/profile/${encodeURIComponent(post.author_username || post.author_name)}`} className="flex items-center gap-3 min-w-0 group/author">
          <img loading="lazy" decoding="async"
            src={avatarSrc}
            alt={post.author_name}
            onError={(e) => { (e.target as HTMLImageElement).src = resolveAvatarUrl(null, post.author_name, post.is_official); }}
            style={{ width: "38px", height: "38px", minWidth: "38px", minHeight: "38px", maxWidth: "38px", maxHeight: "38px", borderRadius: "9999px", objectFit: "cover" }}
            className="shrink-0 border border-white/15 bg-[#08090C] transition-colors group-hover/author:border-brand-orange/60"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h4 className="font-subtitle text-xs font-bold text-white truncate group-hover/author:text-brand-orange transition-colors">
                {post.author_name}
              </h4>
              <UserBadge nickname={post.author_name} isOfficial={post.is_official} />
              {post.platform_tag && (
                <span className="border-b border-brand-orange/60 px-1 py-0.5 font-subtitle text-xs font-bold text-brand-orange">
                  {post.platform_tag}
                </span>
              )}
              {post.is_pinned && (
                <span className="border-b border-yellow-400/60 px-1 py-0.5 font-subtitle text-xs font-bold text-yellow-300">
                  Fixo
                </span>
              )}
            </div>
            <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString("pt-BR")} className="text-xs font-body text-gray-500 block">
              {timeAgo(post.created_at)}
            </time>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          {onToggleFollowAuthor && !isPostOwner && (
            <button
              type="button"
              onClick={onToggleFollowAuthor}
              aria-pressed={isFollowingAuthor}
              title={isFollowingAuthor ? "Deixar de seguir autor" : "Seguir autor"}
              className={`grid size-8 place-items-center border transition-colors ${
                isFollowingAuthor
                  ? "border-brand-orange/50 bg-brand-orange/10 text-brand-orange"
                  : "border-white/10 text-gray-500 hover:border-white/25 hover:text-white"
              }`}
            >
              {isFollowingAuthor ? (
                <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                </svg>
              )}
              <span className="sr-only">{isFollowingAuthor ? "Deixar de seguir autor" : "Seguir autor"}</span>
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Mais opções"
              aria-expanded={isMenuOpen}
              className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-9 z-30 min-w-[190px] rounded-xl border border-white/15 bg-[#14161D] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              >
                {isPostOwner ? (
                  <>
                    {onEditPost && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEditContent(post.content);
                          setIsEditOpen(true);
                          setIsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <svg className="size-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar publicação
                      </button>
                    )}
                    {onDeletePost && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsDeletePostOpen(true);
                          setIsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                      >
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Excluir publicação
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        openReport("post", post.id);
                        setIsMenuOpen(false);
                      }}
                      disabled={reportedContent.includes(`post:${post.id}`)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white disabled:text-emerald-400"
                    >
                      <svg className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      {reportedContent.includes(`post:${post.id}`) ? "Denúncia enviada" : "Denunciar publicação"}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        void handleQuickShare();
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <svg className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Copiar link do post
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="max-w-[72ch] whitespace-pre-line break-words font-body text-sm leading-7 text-gray-200 sm:text-base">
        <SpoilerText>{post.content}</SpoilerText>
      </p>

      {post.media_url && !post.attached_article && (
        <div className="relative mt-2.5 max-w-[390px] overflow-hidden rounded-xl border border-white/10 bg-background-void/90 flex items-center justify-center">
          <img loading="lazy" decoding="async" src={post.media_url} alt="Mídia do post" className="h-auto max-h-[260px] w-full object-contain" />
        </div>
      )}

      {post.attached_article && (
        <Link
          href={`/posts/${post.attached_article.slug}`}
          className="group/article mt-2.5 block max-w-[390px] overflow-hidden rounded-xl border border-white/10 bg-[#0E1015] transition-all hover:border-brand-orange/50 hover:bg-[#12151C]"
        >
          {post.attached_article.image_url && (
            <div className="relative aspect-video w-full overflow-hidden border-b border-white/10 bg-black/60">
              <img
                loading="lazy"
                decoding="async"
                src={post.attached_article.image_url}
                alt={post.attached_article.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover/article:scale-[1.02]"
              />
            </div>
          )}
          <div className="p-2.5 sm:p-3">
            <span className="text-[10px] font-subtitle font-bold text-brand-orange uppercase tracking-wider block mb-0.5">
              Orange Brick
            </span>
            <h5 className="break-words font-subtitle text-xs sm:text-sm font-bold leading-snug text-white transition-colors group-hover/article:text-brand-orange line-clamp-2">
              {post.attached_article.title}
            </h5>
          </div>
        </Link>
      )}

      {post.shared_post && (
        <div className="space-y-3 border-y border-emerald-500/25 bg-[#0D0F14]/70 py-3 sm:py-3.5">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="break-words text-xs font-subtitle font-bold uppercase tracking-wider text-emerald-400">
              Republicado de {post.shared_post.original_author_name}
            </span>
          </div>
          <div className="flex gap-2.5 items-start">
            <img loading="lazy" decoding="async"
              src={resolveAvatarUrl(post.shared_post.original_author_avatar, post.shared_post.original_author_name, post.shared_post.original_is_official)}
              alt={post.shared_post.original_author_name}
              onError={(e) => { (e.target as HTMLImageElement).src = "/icons/default-avatar.png"; }}
              style={{ width: "28px", height: "28px", minWidth: "28px", minHeight: "28px", maxWidth: "28px", maxHeight: "28px", borderRadius: "9999px", objectFit: "cover" }}
              className="border border-emerald-500/30 shrink-0 mt-0.5 bg-[#08090C]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-subtitle font-bold text-white">
                  {post.shared_post.original_author_name}
                </span>
                <UserBadge nickname={post.shared_post.original_author_name} isOfficial={post.shared_post.original_is_official} />
                {post.shared_post.original_platform_tag && (
                  <span className="text-xs font-subtitle font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded border border-brand-orange/20">
                    {post.shared_post.original_platform_tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300 font-body leading-relaxed mt-1 whitespace-pre-line break-words">
                {post.shared_post.original_content}
              </p>

              {post.shared_post.original_attached_article && (
                <Link
                  href={`/posts/${post.shared_post.original_attached_article.slug}`}
                  className="group/article mt-2.5 grid grid-cols-[85px_minmax(0,1fr)] sm:grid-cols-[130px_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/10 bg-background-void/80 hover:border-brand-orange/40 transition-all"
                >
                  {post.shared_post.original_attached_article.image_url && (
                    <div className="relative h-full min-h-[75px] w-full overflow-hidden border-r border-white/10">
                      <img loading="lazy" decoding="async"
                        src={post.shared_post.original_attached_article.image_url}
                        alt={post.shared_post.original_attached_article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/article:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex flex-col justify-center p-2.5 min-w-0">
                    <span className="text-[10px] font-subtitle font-bold text-brand-orange uppercase tracking-wider block mb-0.5">
                      Matéria Citada
                    </span>
                    <h5 className="break-words font-subtitle text-xs font-bold leading-5 text-white transition-colors group-hover/article:text-brand-orange line-clamp-2">
                      {post.shared_post.original_attached_article.title}
                    </h5>
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
          onToggle={handleReaction}
          hypePulse={hypePulse}
          activeReaction={post.user_reaction}
          commentCount={totalCommentCount}
          shareCount={post.shares_count}
          onCommentClick={handleCommentClick}
          onRepostClick={handleShareClick}
          onShareClick={() => void handleQuickShare()}
        />
      </div>
      {reportMessage && <p role="status" className="text-xs text-gray-400">{reportMessage}</p>}
      {shareNotice && <p role="status" className="pt-2 text-xs font-semibold text-brand-orange">{shareNotice}</p>}

      {isShareOpen && (
        <div className="pt-3 border-t border-brand-orange-muted/15 space-y-2.5">
          <p className="text-xs font-subtitle text-gray-400">
            Adicione seu comentário ao republicar:
          </p>
          <form onSubmit={handleSubmitShare} className="flex flex-col gap-2 xs:flex-row">
            <input
              type="text"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              placeholder="Seu comentário sobre isso..."
              maxLength={280}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-800 bg-[#0D0F14] px-3.5 text-xs text-white outline-none transition-colors placeholder:text-gray-500 focus:border-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!shareText.trim() || isSharing}
              className="min-h-11 shrink-0 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
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

          <div>
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
                  <div key={c.id} className="group/comm border-t border-white/[0.07] py-3 first:border-t-0">
                    <div className="flex items-start gap-2.5">
                      <Link href={`/profile/${encodeURIComponent(c.author_username || c.author_name)}`} className="shrink-0 group/cauthor">
                        <img loading="lazy" decoding="async"
                          src={resolveAvatarUrl(c.author_avatar, c.author_name, c.is_official)}
                          alt={c.author_name}
                          onError={(e) => { (e.target as HTMLImageElement).src = "/icons/default-avatar.png"; }}
                          style={{ width: "30px", height: "30px", minWidth: "30px", minHeight: "30px", maxWidth: "30px", maxHeight: "30px", borderRadius: "9999px", objectFit: "cover" }}
                          className="border border-brand-orange/20 shrink-0 group-hover/cauthor:scale-105 transition-transform bg-[#08090C]"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <Link href={`/profile/${encodeURIComponent(c.author_username || c.author_name)}`} className="truncate text-xs font-bold text-white transition-colors hover:text-brand-orange">
                              {c.author_name}
                            </Link>
                            <UserBadge nickname={c.author_name} isOfficial={c.is_official} />
                            <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString("pt-BR")} className="text-xs text-gray-500">
                              {timeAgo(c.created_at)}
                            </time>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!canDeleteComment && user && (
                              <button
                                type="button"
                                onClick={() => openReport("comment", c.id)}
                                disabled={reportedContent.includes(`comment:${c.id}`)}
                                className="min-h-9 px-2 text-xs font-semibold text-gray-500 hover:text-white disabled:text-emerald-300"
                              >
                                {reportedContent.includes(`comment:${c.id}`) ? "Enviado" : "Denunciar"}
                              </button>
                            )}
                            {canDeleteComment && (
                              <button
                                onClick={() => setCommentPendingDelete(c.id)}
                                aria-label="Apagar resposta"
                                className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-red-300/60 transition-colors hover:bg-red-500/10 hover:text-red-200"
                                title="Apagar resposta"
                              >
                                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                                </svg>
                              </button>
                            )}
                          <button
                            type="button"
                            onClick={() => handleLikeComment(c.id)}
                            className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${
                              c.user_has_liked
                                ? "bg-brand-orange/10 text-brand-orange"
                                : "text-gray-500 hover:bg-white/5 hover:text-white"
                            }`}
                            aria-label="Curtir resposta"
                          >
                            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={c.user_has_liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                            </svg>
                            <span>{c.likes_count || 0}</span>
                          </button>
                          </div>
                        </div>
                        <p className="mt-1.5 whitespace-pre-line break-words text-xs leading-relaxed text-gray-300">
                          <SpoilerText>{c.content}</SpoilerText>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex flex-col gap-2 pt-1 xs:flex-row">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva sua resposta..."
              maxLength={280}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-800 bg-[#0D0F14] px-3.5 text-xs text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-orange"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="min-h-11 shrink-0 rounded-xl bg-brand-orange px-4 text-xs font-bold text-white transition-colors hover:bg-brand-orange/90 disabled:opacity-40"
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

      {reportTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background-void/90 p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isReporting) setReportTarget(null);
          }}
        >
          <div
            ref={reportDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`report-title-${reportTarget.id}`}
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#191b21] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6"
          >
            <h3 id={`report-title-${reportTarget.id}`} className="text-lg font-bold text-white">Por que você está denunciando?</h3>
            <p className="mt-2 text-sm leading-6 text-[#b8bac2]">A denúncia vai para a moderação. O autor não verá quem enviou.</p>
            <fieldset className="mt-5 space-y-2">
              <legend className="sr-only">Motivo da denúncia</legend>
              {reportReasons.map((reason) => (
                <label key={reason} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3 text-sm text-gray-200 transition-colors hover:border-brand-orange/40">
                  <input
                    type="radio"
                    name={`report-reason-${reportTarget.id}`}
                    value={reason}
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                    className="accent-brand-orange"
                  />
                  {reason}
                </label>
              ))}
            </fieldset>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setReportTarget(null)} disabled={isReporting} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[#d2d3d8] hover:bg-white/5 hover:text-white disabled:opacity-50">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleReport()} disabled={isReporting} className="min-h-11 rounded-xl bg-brand-orange px-4 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50">
                {isReporting ? "Enviando…" : "Enviar denúncia"}
              </button>
            </div>
          </div>
        </div>
      )}

      {commentPendingDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background-void/90 p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeletingComment) setCommentPendingDelete(null);
          }}
        >
          <div
            ref={deleteDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-brick-comment-title-${commentPendingDelete}`}
            aria-describedby={`delete-brick-comment-description-${commentPendingDelete}`}
            tabIndex={-1}
            className="w-full max-w-sm rounded-2xl border border-red-400/25 bg-[#191b21] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6"
          >
            <h3 id={`delete-brick-comment-title-${commentPendingDelete}`} className="text-lg font-bold text-white">
              Apagar comentário?
            </h3>
            <p id={`delete-brick-comment-description-${commentPendingDelete}`} className="mt-2 text-sm leading-6 text-[#b8bac2]">
              Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCommentPendingDelete(null)}
                disabled={isDeletingComment}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[#d2d3d8] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteComment(commentPendingDelete)}
                disabled={isDeletingComment}
                className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingComment ? "Apagando…" : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isDeletePostOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background-void/90 p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeletingPost) setIsDeletePostOpen(false);
          }}
        >
          <div
            ref={deletePostDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-brick-post-title-${post.id}`}
            aria-describedby={`delete-brick-post-description-${post.id}`}
            tabIndex={-1}
            className="w-full max-w-sm rounded-2xl border border-red-400/25 bg-[#191b21] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6"
          >
            <h3 id={`delete-brick-post-title-${post.id}`} className="text-lg font-bold text-white">
              Apagar publicação?
            </h3>
            <p id={`delete-brick-post-description-${post.id}`} className="mt-2 text-sm leading-6 text-[#b8bac2]">
              Esta ação não pode ser desfeita e removerá a publicação permanentemente.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsDeletePostOpen(false)}
                disabled={isDeletingPost}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[#d2d3d8] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={isDeletingPost}
                className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingPost ? "Apagando…" : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background-void/90 p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingEdit) setIsEditOpen(false);
          }}
        >
          <div
            ref={editDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-brick-post-title-${post.id}`}
            tabIndex={-1}
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#14161D] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.8)] sm:p-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 id={`edit-brick-post-title-${post.id}`} className="font-subtitle text-base font-bold text-white">
                Editar Brick
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                disabled={isSavingEdit}
                aria-label="Fechar modal de edição"
                className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div className="relative">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="O que está acontecendo no mundo dos games?"
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0B0C10] p-3.5 font-body text-sm text-white placeholder:text-gray-500 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  autoFocus
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-body">Texto limitado a 280 caracteres</span>
                  <span
                    className={`font-subtitle font-bold ${
                      editContent.length > 260
                        ? editContent.length > 280
                          ? "text-red-400"
                          : "text-yellow-400"
                        : "text-gray-400"
                    }`}
                  >
                    {280 - editContent.length}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSavingEdit}
                  className="min-h-10 rounded-xl px-4 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || editContent.trim().length === 0 || editContent.length > 280 || editContent.trim() === post.content.trim()}
                  className="min-h-10 rounded-xl bg-brand-orange px-5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSavingEdit ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
