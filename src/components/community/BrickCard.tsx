"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CommunityPost, CommunityComment } from "@/lib/types/community";
import type { ReactionType } from "@/lib/types/database";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";

import { UserBadge } from "@/components/ui/UserBadge";
import { resolveAvatarUrl } from "@/lib/avatar";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { createDataClient } from "@/lib/supabase/client";

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

const reportReasons = [
  "Spam ou publicidade",
  "Assédio ou ataque pessoal",
  "Discurso de ódio",
  "Spoiler sem aviso",
  "Informação enganosa",
  "Outro conteúdo inadequado",
];

export function BrickCard({ post, onReaction, onDeletePost, onSharePost, onAddComment, onDeleteComment, onToggleCommentLike, getComments }: BrickCardProps) {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentPendingDelete, setCommentPendingDelete] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [reportedContent, setReportedContent] = useState<string[]>([]);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
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
        <Link href={`/profile/${encodeURIComponent(post.author_name)}`} className="flex items-center gap-3 min-w-0 group/author">
          <img
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
                <span className="border-b border-brand-orange/60 px-1 py-0.5 font-subtitle text-[9px] font-bold text-brand-orange sm:text-[10px]">
                  {post.platform_tag}
                </span>
              )}
              {post.is_pinned && (
                <span className="border-b border-yellow-400/60 px-1 py-0.5 font-subtitle text-[9px] font-bold text-yellow-300">
                  Fixo
                </span>
              )}
            </div>
            <span className="text-[10px] font-body text-gray-500 block">
              {new Date(post.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </Link>

        <div className="flex shrink-0 items-center">
          {!isPostOwner && user && (
            <button
              type="button"
              onClick={() => openReport("post", post.id)}
              disabled={reportedContent.includes(`post:${post.id}`)}
              className="min-h-11 px-3 text-[11px] font-semibold text-gray-500 hover:text-white disabled:text-emerald-300"
            >
              {reportedContent.includes(`post:${post.id}`) ? "Denunciado" : "Denunciar"}
            </button>
          )}
          {isPostOwner && onDeletePost && (
            <button
              onClick={() => setIsDeletePostOpen(true)}
              aria-label="Apagar este post"
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2.5 text-xs text-red-300/75 transition-all hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-200"
              title="Apagar este post"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden xs:inline">Apagar</span>
            </button>
          )}
        </div>
      </div>

      <p className="max-w-[72ch] whitespace-pre-line break-words font-body text-sm leading-7 text-gray-200 sm:text-[15px]">
        {post.content}
      </p>

      {post.media_url && (
        <div className="flex items-center justify-center overflow-hidden border-y border-white/10 bg-background-void/90">
          <img src={post.media_url} alt="Mídia do post" className="h-auto w-full object-contain" />
        </div>
      )}

      {post.attached_article && (
        <Link
          href={`/posts/${post.attached_article.slug}`}
          className="group/article block border-y border-white/10 bg-background-void/60 py-3 transition-colors hover:border-brand-orange/40 sm:py-3.5"
        >
          <div className="flex items-start gap-3">
            {post.attached_article.image_url && (
              <img
                src={post.attached_article.image_url}
                alt={post.attached_article.title}
                className="h-14 w-20 shrink-0 object-cover sm:h-16 sm:w-24"
              />
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-subtitle font-bold text-brand-orange uppercase tracking-wider">
                Matéria do Orange Brick
              </span>
              <h5 className="break-words font-subtitle text-xs font-bold leading-5 text-white transition-colors group-hover/article:text-brand-orange sm:text-sm">
                {post.attached_article.title}
              </h5>
              <p className="mt-1 break-words font-body text-[11px] leading-5 text-gray-400 sm:text-xs">
                {post.attached_article.summary}
              </p>
            </div>
          </div>
        </Link>
      )}

      {post.shared_post && (
        <div className="space-y-3 border-y border-emerald-500/25 bg-[#0D0F14]/70 py-3 sm:py-3.5">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="break-words text-[10px] font-subtitle font-bold uppercase tracking-wider text-emerald-400">
              Republicado de {post.shared_post.original_author_name}
            </span>
          </div>
          <div className="flex gap-2.5 items-start">
            <img
              src={resolveAvatarUrl(post.shared_post.original_author_avatar, post.shared_post.original_author_name, post.shared_post.original_is_official)}
              alt={post.shared_post.original_author_name}
              onError={(e) => { (e.target as HTMLImageElement).src = "/icons/default-avatar.png"; }}
              style={{ width: "28px", height: "28px", minWidth: "28px", minHeight: "28px", maxWidth: "28px", maxHeight: "28px", borderRadius: "9999px", objectFit: "cover" }}
              className="border border-emerald-500/30 shrink-0 mt-0.5 bg-[#08090C]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-subtitle font-bold text-white">
                  {post.shared_post.original_author_name}
                </span>
                <UserBadge nickname={post.shared_post.original_author_name} isOfficial={post.shared_post.original_is_official} />
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
                  <div className="flex items-start gap-2.5">
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
                      <h5 className="break-words font-subtitle text-[11px] font-bold leading-5 text-white transition-colors group-hover/article:text-brand-orange">
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
      {reportMessage && <p role="status" className="text-xs text-gray-400">{reportMessage}</p>}

      {isShareOpen && (
        <div className="pt-3 border-t border-brand-orange-muted/15 space-y-2.5">
          <p className="text-[11px] font-subtitle text-gray-400">
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
                      <Link href={`/profile/${encodeURIComponent(c.author_name)}`} className="shrink-0 group/cauthor">
                        <img
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
                            <Link href={`/profile/${encodeURIComponent(c.author_name)}`} className="truncate text-xs font-bold text-white transition-colors hover:text-brand-orange">
                              {c.author_name}
                            </Link>
                            <UserBadge nickname={c.author_name} isOfficial={c.is_official} />
                            <span className="text-[10px] text-gray-500">
                              {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!canDeleteComment && user && (
                              <button
                                type="button"
                                onClick={() => openReport("comment", c.id)}
                                disabled={reportedContent.includes(`comment:${c.id}`)}
                                className="min-h-9 px-2 text-[10px] font-semibold text-gray-500 hover:text-white disabled:text-emerald-300"
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
                            className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition-colors ${
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
                          {c.content}
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
    </article>
  );
}
