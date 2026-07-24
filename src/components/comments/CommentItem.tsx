"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/utils/time-ago";
import type { CommentWithProfile } from "@/lib/hooks/useComments";

import { useAuth } from "@/lib/contexts/AuthContext";

import { UserBadge } from "@/components/ui/UserBadge";
import { resolveAvatarUrl } from "@/lib/avatar";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

interface CommentItemProps {
  comment: CommentWithProfile;
  onDelete?: (commentId: string) => void;
}

export function CommentItem({ comment, onDelete }: CommentItemProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const dialogRef = useModalDialog<HTMLDivElement>(
    showDeleteConfirmation,
    () => setShowDeleteConfirmation(false)
  );
  const isOwner = user && user.id === comment.user_id;

  const handleLike = () => {
    if (hasLiked) {
      setLikes((prev) => prev - 1);
      setHasLiked(false);
    } else {
      setLikes((prev) => prev + 1);
      setHasLiked(true);
    }
  };

  const confirmDelete = () => {
    setShowDeleteConfirmation(false);
    onDelete?.(comment.id);
  };

  return (
    <div className="group border-t border-white/[0.07] py-3 first:border-t-0">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-orange/30 bg-[#08090C]">
            <img
              src={resolveAvatarUrl(comment.author_avatar, comment.author_nickname)}
              alt={comment.author_nickname}
              style={{ width: "30px", height: "30px", minWidth: "30px", minHeight: "30px", maxWidth: "30px", maxHeight: "30px", borderRadius: "9999px", objectFit: "cover" }}
              className="shrink-0 bg-[#08090C]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = resolveAvatarUrl(null, comment.author_nickname);
              }}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate text-xs font-bold text-white transition-colors group-hover:text-brand-orange">
                {comment.author_nickname}
                </span>
                <UserBadge nickname={comment.author_nickname} />
                <span className="text-[10px] text-gray-500">{timeAgo(comment.created_at)}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {isOwner && onDelete && (
                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  aria-label="Apagar comentário"
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-red-300/60 transition-colors hover:bg-red-500/10 hover:text-red-200"
                  title="Apagar comentário"
                >
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                  </svg>
                </button>
              )}

              <button
                onClick={handleLike}
                className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition-colors ${
                  hasLiked
                    ? "bg-brand-orange/10 text-brand-orange"
                    : "text-gray-500 hover:bg-white/5 hover:text-white"
                }`}
                aria-label="Curtir comentário"
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={hasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                </svg>
                <span>{likes}</span>
              </button>
            </div>
          </div>

          <p className="mt-1.5 whitespace-pre-line break-words text-xs leading-relaxed text-gray-300 sm:text-sm">
            {comment.content}
          </p>
        </div>
      </div>

      {showDeleteConfirmation && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background-void/90 p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowDeleteConfirmation(false);
          }}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-comment-title-${comment.id}`}
            aria-describedby={`delete-comment-description-${comment.id}`}
            tabIndex={-1}
            className="w-full max-w-sm rounded-2xl border border-red-400/25 bg-[#191b21] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6"
          >
            <h3 id={`delete-comment-title-${comment.id}`} className="text-lg font-bold text-white">
              Apagar comentário?
            </h3>
            <p id={`delete-comment-description-${comment.id}`} className="mt-2 text-sm leading-6 text-[#b8bac2]">
              Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmation(false)}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[#d2d3d8] transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
