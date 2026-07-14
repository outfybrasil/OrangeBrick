"use client";

import { timeAgo } from "@/lib/utils/time-ago";

interface CommentItemProps {
  content: string;
  userId: string;
  createdAt: string;
}

export function CommentItem({ content, userId, createdAt }: CommentItemProps) {
  return (
    <div className="py-3 border-b border-brand-orange-muted/10 last:border-b-0">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 bg-brand-orange-muted/30 rounded-none flex items-center justify-center">
          <span className="text-[10px] font-mono text-brand-orange font-bold">
            {userId.substring(0, 2)}
          </span>
        </div>
        <span className="text-[11px] font-mono text-gray-400">
          {userId.substring(0, 8)}...
        </span>
        <span className="text-[10px] font-mono text-brand-orange-muted">
          {timeAgo(createdAt)}
        </span>
      </div>
      <p className="text-sm font-sans text-gray-300 leading-relaxed pl-7">
        {content}
      </p>
    </div>
  );
}
