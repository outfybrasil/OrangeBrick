"use client";

import { useState } from "react";
import { ReactionsError } from "./ReactionsError";
import { ReactionIcon } from "./ReactionIcon";
import { Icon } from "@/components/ui/Icon";
import { REACTION_LABELS } from "@/lib/reactions-config";
import type { ReactionType } from "@/lib/types/database";

interface ReactionBarProps {
  hype: number;
  flop: number;
  salty: number;
  onToggle: (type: ReactionType) => void;
  activeReaction?: ReactionType | null;
  disabled?: boolean;
  error?: string | null;
  commentCount?: number;
  shareCount?: number;
  onCommentClick?: () => void;
  onRepostClick?: () => void;
  onShareClick?: () => void;
  viewCount?: number;
  hypePulse?: number;
}

export function ReactionBar({
  hype,
  flop,
  salty,
  onToggle,
  activeReaction,
  disabled,
  error,
  commentCount,
  shareCount,
  onCommentClick,
  onRepostClick,
  onShareClick,
  viewCount,
  hypePulse = 0,
}: ReactionBarProps) {
  const [copiedToast, setCopiedToast] = useState(false);
  const combinedFlop = flop + salty;

  const handleShare = async () => {
    if (onShareClick) {
      onShareClick();
      return;
    }
    if (typeof window !== "undefined") {
      const url = window.location.href;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "Orange Brick", url });
          return;
        } catch {
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      } catch {
        setCopiedToast(false);
      }
    }
  };

  const isHypeActive = activeReaction === "hype";
  const isFlopActive = activeReaction === "flop" || activeReaction === "salty";

  return (
    <div className="relative w-full">
      <div className="border-t border-white/[0.08] pt-2 sm:pt-2.5">
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
          <div className="grid grid-cols-5 w-full xs:w-auto xs:flex xs:items-center xs:gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onToggle("hype")}
              disabled={disabled}
              aria-pressed={isHypeActive}
              aria-label={`${REACTION_LABELS.hype.name}: ${hype} votos`}
              title={REACTION_LABELS.hype.title}
              className={`group relative flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border px-1.5 py-1 text-xs font-bold transition-all cursor-pointer xs:px-2.5 sm:gap-1.5 sm:px-3 active:scale-95 motion-reduce:transform-none ${
                isHypeActive
                  ? "border-brand-orange/50 bg-brand-orange/15 text-brand-orange shadow-[0_0_12px_rgba(255,94,0,0.2)]"
                  : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-brand-orange"
              }`}
            >
              {hypePulse > 0 && (
                <span key={hypePulse} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible motion-reduce:hidden">
                  <span className="hype-particle absolute left-[30%] top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <img src="/images/reactions/hype/level-4.png" alt="" width={14} height={18} className="h-4 w-3.5 object-contain drop-shadow-[0_0_6px_rgba(255,94,0,0.8)]" />
                  </span>
                  <span className="hype-particle hype-particle-delay absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <img src="/images/reactions/hype/level-5.png" alt="" width={16} height={20} className="h-4.5 w-4 object-contain drop-shadow-[0_0_8px_rgba(255,140,0,1)]" />
                  </span>
                  <span className="hype-particle hype-particle-late absolute left-[70%] top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <img src="/images/reactions/hype/level-3.png" alt="" width={14} height={18} className="h-4 w-3.5 object-contain drop-shadow-[0_0_6px_rgba(255,94,0,0.8)]" />
                  </span>
                </span>
              )}
              <ReactionIcon type="hype" count={hype} active={isHypeActive} size={19} />
              <span className="hidden xs:inline">{REACTION_LABELS.hype.name}</span>
              <span className="text-xs font-bold tabular-nums opacity-90">
                {hype}
              </span>
              {hype >= 100 && (
                <span className="hidden sm:inline-block rounded bg-brand-orange/20 px-1 py-0.2 text-[10px] font-black uppercase text-brand-orange tracking-wider">
                  {REACTION_LABELS.hype.level5Badge}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onToggle("flop")}
              disabled={disabled}
              aria-pressed={isFlopActive}
              aria-label={`${REACTION_LABELS.flop.name}: ${combinedFlop} votos`}
              title={REACTION_LABELS.flop.title}
              className={`group flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border px-1.5 py-1 text-xs font-bold transition-all cursor-pointer xs:px-2.5 sm:gap-1.5 sm:px-3 active:scale-95 motion-reduce:transform-none ${
                isFlopActive
                  ? "border-red-500/50 bg-red-500/15 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                  : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-red-400"
              }`}
            >
              <ReactionIcon
                type="flop"
                count={combinedFlop}
                active={isFlopActive}
                size={19}
              />
              <span className="hidden xs:inline">{REACTION_LABELS.flop.name}</span>
              <span className="text-xs font-bold tabular-nums opacity-90">
                {combinedFlop}
              </span>
            </button>

            <button
              type="button"
              onClick={onCommentClick}
              aria-label={`${REACTION_LABELS.comment.name}: ${commentCount ?? 0}`}
              title={REACTION_LABELS.comment.title}
              className="group flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-transparent px-1.5 py-1 text-xs font-bold text-gray-400 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-brand-orange xs:px-2.5 sm:gap-1.5 sm:px-3 active:scale-95 motion-reduce:transform-none"
            >
              <ReactionIcon type="comment" count={commentCount ?? 0} size={19} />
              <span className="hidden xs:inline">{REACTION_LABELS.comment.name}</span>
              <span className="text-xs font-bold tabular-nums opacity-90">
                {commentCount ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={onRepostClick}
              aria-label={`${REACTION_LABELS.repost.name}: ${shareCount ?? 0}`}
              title={REACTION_LABELS.repost.title}
              className="group flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-transparent px-1.5 py-1 text-xs font-bold text-gray-400 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-brand-orange xs:px-2.5 sm:gap-1.5 sm:px-3 active:scale-95 motion-reduce:transform-none"
            >
              <ReactionIcon type="repost" count={shareCount ?? 0} size={19} />
              <span className="hidden xs:inline">{REACTION_LABELS.repost.name}</span>
              <span className="text-xs font-bold tabular-nums opacity-90">
                {shareCount ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              aria-label={REACTION_LABELS.share.title}
              title={REACTION_LABELS.share.title}
              className="group flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-transparent px-1.5 py-1 text-xs font-bold text-gray-400 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-brand-orange xs:px-2.5 sm:gap-1.5 sm:px-3 active:scale-95 motion-reduce:transform-none"
            >
              <ReactionIcon type="share" size={19} active={copiedToast} />
              <span className="hidden xs:inline">{REACTION_LABELS.share.name}</span>
            </button>
          </div>

          {viewCount !== undefined && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-subtitle text-gray-400 px-2 py-1">
              <Icon name="eye" size={14} className="text-gray-500" />
              <span className="font-semibold tabular-nums">{viewCount}</span>
            </div>
          )}
        </div>
      </div>

      {copiedToast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute -top-9 right-2 z-20 flex items-center gap-1.5 rounded-lg border border-brand-orange/40 bg-[#16181F] px-2.5 py-1 text-xs font-bold text-brand-orange shadow-lg animate-fade-in"
        >
          <svg className="size-3.5 text-brand-orange" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Link copiado!</span>
        </div>
      )}

      <ReactionsError message={error || ""} />
    </div>
  );
}
