"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/utils/time-ago";
import type { CommentWithProfile } from "@/lib/hooks/useComments";

import { useAuth } from "@/lib/contexts/AuthContext";

import { UserBadge } from "@/components/ui/UserBadge";
import { resolveAvatarUrl } from "@/lib/avatar";

interface CommentItemProps {
  comment: CommentWithProfile;
  onDelete?: (commentId: string) => void;
}

export function CommentItem({ comment, onDelete }: CommentItemProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
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

  return (
    <div className="bg-[#15171F] border border-gray-800/80 hover:border-brand-orange/30 rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-300 space-y-3 group">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-brand-orange to-amber-500 p-[1.5px] shadow-md shrink-0 flex items-center justify-center">
            <img
              src={resolveAvatarUrl(comment.author_avatar, comment.author_nickname)}
              alt={comment.author_nickname}
              style={{ width: "36px", height: "36px", minWidth: "36px", minHeight: "36px", maxWidth: "36px", maxHeight: "36px", borderRadius: "9999px", objectFit: "cover" }}
              className="shrink-0 bg-[#08090C]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";
              }}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-bold text-sm text-white group-hover:text-brand-orange transition-colors truncate">
                {comment.author_nickname}
              </span>
              <UserBadge nickname={comment.author_nickname} />
            </div>
            <span className="text-[10px] font-subtitle text-gray-500 block">
              {timeAgo(comment.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              aria-label="Apagar comentário"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xs text-red-300/70 transition-colors hover:bg-red-500/15 hover:text-red-200"
              title="Apagar comentário"
            >
              🗑️
            </button>
          )}

          <button
            onClick={handleLike}
            className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-all cursor-pointer ${
              hasLiked
                ? "bg-brand-orange/20 text-brand-orange border-brand-orange/50 shadow-[0_0_10px_rgba(255,94,0,0.2)]"
                : "bg-[#0E1015] text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white"
            }`}
            aria-label="Curtir comentário"
          >
            <span>🔥</span>
            <span>{likes}</span>
          </button>
        </div>
      </div>

      <div className="bg-[#0D0F14] border border-gray-800/60 rounded-xl p-3.5 sm:p-4 text-sm font-body text-gray-200 leading-relaxed shadow-inner">
        {comment.content}
      </div>
    </div>
  );
}
