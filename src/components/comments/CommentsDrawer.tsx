"use client";

import { useEffect, useCallback, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";
import { useComments } from "@/lib/hooks/useComments";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

interface CommentsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsDrawer({ postId, isOpen, onClose }: CommentsDrawerProps) {
  const { comments, isLoading, error, addComment, toggleCommentLike, fetchComments } = useComments(postId);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);
  const replyTarget = comments.find((comment) => comment.id === replyToCommentId) || null;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen) queueMicrotask(() => void fetchComments());
  }, [fetchComments, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Comentários"
        tabIndex={-1}
        className="
          fixed bottom-0 left-0 right-0 z-50 max-h-[92dvh]
          md:bottom-auto md:top-0 md:right-0 md:left-auto
          md:w-[420px] md:h-full md:max-h-none
          bg-card-slate border-t md:border-l border-brand-orange-muted/20
          animate-slide-up md:animate-slide-in-right
          flex flex-col
        "
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-orange-muted/10">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Comentários
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <CommentList comments={comments} isLoading={isLoading} error={error} onRetry={() => void fetchComments()} onLike={toggleCommentLike} onReply={setReplyToCommentId} />
        </div>

        <div className="px-4 py-3 border-t border-brand-orange-muted/10">
          {replyTarget && (
            <div role="status" className="mb-3 flex items-center justify-between gap-3 border border-brand-orange/20 bg-brand-orange/[0.06] px-3 py-2 text-xs text-gray-300">
              <span>Respondendo a <strong className="text-white">{replyTarget.author_nickname}</strong></span>
              <button type="button" onClick={() => setReplyToCommentId(null)} className="min-h-9 px-2 font-bold text-brand-orange hover:text-white">Cancelar</button>
            </div>
          )}
          <CommentForm
            placeholder={replyTarget ? `Resposta para ${replyTarget.author_nickname}...` : undefined}
            onSubmit={async (content) => {
              await addComment(content, replyToCommentId);
              setReplyToCommentId(null);
            }}
          />
        </div>
      </div>
    </>
  );
}
