"use client";

import { CommentItem } from "./CommentItem";
import type { CommentWithProfile } from "@/lib/hooks/useComments";

interface CommentListProps {
  comments: CommentWithProfile[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onLike: (commentId: string) => Promise<void>;
  onReply?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function CommentList({ comments, isLoading, error, onRetry, onLike, onReply, onDelete, hasMore = false, isLoadingMore = false, onLoadMore }: CommentListProps) {
  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin mx-auto" />
      </div>
    );
  }
  if (error && comments.length === 0) {
    return (
      <div className="py-4 text-center space-y-2">
        <p className="text-xs font-subtitle text-red-400">{error}</p>
        <button onClick={onRetry} className="text-xs font-subtitle text-brand-orange hover:underline cursor-pointer">
          Tentar novamente
        </button>
      </div>
    );
  }
  if (comments.length === 0) {
    return (
      <div className="border-t border-white/[0.07] py-6 text-center">
        <p className="text-xs font-subtitle text-gray-500">
          Nenhum comentário ainda. Seja o primeiro a compartilhar sua visão!
        </p>
      </div>
    );
  }
  const repliesByParent = new Map<string, CommentWithProfile[]>();
  for (const comment of comments) {
    if (!comment.parent_id) continue;
    const replies = repliesByParent.get(comment.parent_id) || [];
    replies.push(comment);
    repliesByParent.set(comment.parent_id, replies);
  }
  const threadedComments = comments
    .filter((comment) => !comment.parent_id)
    .flatMap((comment) => [comment, ...(repliesByParent.get(comment.id) || [])]);

  return (
    <div className="space-y-1">
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-y border-red-400/20 py-3 text-xs text-red-300"><span>{error}</span><button type="button" onClick={onRetry} className="min-h-11 px-3 font-bold text-brand-orange">Tentar novamente</button></div>}
      {threadedComments.map((comment) => (
        <div key={comment.id} className={`content-visibility-auto ${comment.parent_id ? "ml-5 border-l border-brand-orange/20 pl-3" : ""}`}>
          <CommentItem comment={comment} onLike={onLike} onReply={onReply} onDelete={onDelete} />
        </div>
      ))}
      {hasMore && <button type="button" disabled={isLoadingMore} onClick={onLoadMore} className="mt-4 min-h-11 w-full border border-white/15 text-sm font-bold text-brand-orange disabled:opacity-50">{isLoadingMore ? "Carregando comentários…" : "Ver mais comentários"}</button>}
    </div>
  );
}
