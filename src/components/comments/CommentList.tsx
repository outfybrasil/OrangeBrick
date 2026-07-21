"use client";

import { CommentItem } from "./CommentItem";
import type { Comment } from "@/lib/types/database";

interface CommentListProps {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function CommentList({ comments, isLoading, error, onRetry }: CommentListProps) {
  if (isLoading) {
    return <div className="py-4 text-center"><div className="w-4 h-4 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin mx-auto" /></div>;
  }
  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs font-mono text-red-400">{error}</p>
        <button onClick={onRetry} className="mt-2 text-xs font-mono text-brand-orange hover:underline">Tentar novamente</button>
      </div>
    );
  }
  if (comments.length === 0) {
    return <div className="py-6 text-center"><p className="text-xs font-mono text-brand-orange-muted">Nenhum comentário ainda. Seja o primeiro!</p></div>;
  }
  return (
    <div className="divide-y divide-brand-orange-muted/10">
      {comments.map((comment) => (
        <CommentItem key={comment.id} content={comment.content} userId={comment.user_id} createdAt={comment.created_at} />
      ))}
    </div>
  );
}
