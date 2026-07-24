"use client";

import { CommentItem } from "./CommentItem";
import type { CommentWithProfile } from "@/lib/hooks/useComments";

interface CommentListProps {
  comments: CommentWithProfile[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onDelete?: (commentId: string) => void;
}

export function CommentList({ comments, isLoading, error, onRetry, onDelete }: CommentListProps) {
  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin mx-auto" />
      </div>
    );
  }
  if (error) {
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
  return (
    <div>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} onDelete={onDelete} />
      ))}
    </div>
  );
}
