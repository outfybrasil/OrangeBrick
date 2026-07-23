import { ReactionsError } from "./ReactionsError";
import { Icon } from "@/components/ui/Icon";
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
  viewCount?: number;
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
  viewCount,
}: ReactionBarProps) {
  const combinedFlop = flop + salty;

  return (
    <div>
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 border border-brand-orange-muted/20 bg-[#14161E]/80 backdrop-blur-md rounded-2xl flex-wrap shadow-lg">
        <button
          type="button"
          onClick={() => onToggle("hype")}
          disabled={disabled}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-subtitle font-bold rounded-xl transition-all cursor-pointer group ${
            activeReaction === "hype"
              ? "bg-brand-orange/20 text-brand-orange border border-brand-orange/50 shadow-[0_0_12px_rgba(255,94,0,0.25)]"
              : "text-gray-300 bg-card-slate/40 border border-brand-orange-muted/15 hover:text-brand-orange hover:bg-card-slate hover:border-brand-orange/40"
          }`}
          title="Empolgado com essa notícia! (Hype)"
        >
          <Icon name="hype" size={14} className={`transition-all ${activeReaction === "hype" ? "scale-110" : "group-hover:scale-125"}`} />
          <span>Hype</span>
          <span className="text-[10px] sm:text-[11px] font-bold tabular-nums opacity-90 bg-black/30 px-1.5 py-0.5 rounded-md">
            {hype}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onToggle("flop")}
          disabled={disabled}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-subtitle font-bold rounded-xl transition-all cursor-pointer group ${
            activeReaction === "flop" || activeReaction === "salty"
              ? "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
              : "text-gray-300 bg-card-slate/40 border border-brand-orange-muted/15 hover:text-red-400 hover:bg-card-slate hover:border-red-500/40"
          }`}
          title="Decepcionou / Não curti (Flop)"
        >
          <Icon name="flop" size={14} className={`transition-all ${activeReaction === "flop" ? "scale-110" : "group-hover:rotate-12"}`} />
          <span>Flop</span>
          <span className="text-[10px] sm:text-[11px] font-bold tabular-nums opacity-90 bg-black/30 px-1.5 py-0.5 rounded-md">
            {combinedFlop}
          </span>
        </button>

        <button
          type="button"
          onClick={onRepostClick}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-subtitle font-bold text-gray-300 bg-card-slate/40 border border-brand-orange-muted/15 hover:text-emerald-400 hover:bg-card-slate hover:border-emerald-500/40 rounded-xl transition-all cursor-pointer group"
          title="Republicar e comentar sobre isso no Brickboard"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-emerald-400 group-hover:rotate-180 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden xs:inline">Republicar</span>
          <span className="xs:hidden">Repost</span>
          {(shareCount ?? 0) > 0 && (
            <span className="text-[10px] sm:text-[11px] font-bold tabular-nums opacity-90 bg-black/30 px-1.5 py-0.5 rounded-md">
              {shareCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onCommentClick}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-subtitle font-bold text-gray-300 bg-card-slate/40 border border-brand-orange-muted/15 hover:text-white hover:bg-card-slate hover:border-brand-orange/40 rounded-xl transition-all cursor-pointer group"
          title="Ver e enviar respostas"
        >
          <Icon name="comment" size={14} className="text-gray-400 group-hover:text-brand-orange group-hover:scale-110 transition-all" />
          <span className="text-[10px] sm:text-[11px] font-bold tabular-nums opacity-90 bg-black/30 px-1.5 py-0.5 rounded-md">
            {commentCount ?? 0}
          </span>
        </button>

        {viewCount !== undefined && (
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-subtitle text-gray-400 ml-auto px-1.5 py-0.5">
            <Icon name="eye" size={13} className="text-gray-500" />
            <span className="font-semibold tabular-nums">{viewCount}</span>
          </div>
        )}
      </div>

      <ReactionsError message={error || ""} />
    </div>
  );
}
