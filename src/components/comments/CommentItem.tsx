"use client";

import { timeAgo } from "@/lib/utils/time-ago";
import type { CommentWithProfile } from "@/lib/hooks/useComments";

interface CommentItemProps {
  comment: CommentWithProfile;
}

export function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="py-3 border-b border-brand-orange-muted/10 last:border-b-0">
      <div className="flex items-center gap-2 mb-1">
        {comment.author_avatar ? (
          <img src={comment.author_avatar} alt="" className="w-5 h-5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-5 h-5 bg-brand-orange-muted/30 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-mono text-brand-orange font-bold">
              {comment.author_nickname.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <span className="text-[11px] font-mono text-gray-300 font-semibold">
          {comment.author_nickname}
        </span>
        <span className="text-[10px] font-mono text-brand-orange-muted ml-auto">
          {timeAgo(comment.created_at)}
        </span>
      </div>
      <p className="text-sm font-sans text-gray-300 leading-relaxed pl-7">
        {comment.content}
      </p>
    </div>
  );
}
