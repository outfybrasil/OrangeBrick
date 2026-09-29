import { ReactionsError } from "./ReactionsError";
import { ReactionIcon } from "./ReactionIcon";
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
  const combinedFlop = flop + salty;

  return (
    <div>
      <div className={`grid min-w-0 ${onShareClick ? "grid-cols-5" : "grid-cols-4"} border border-brand-orange-muted/20 bg-[#14161E]/90 px-1.5 py-1.5 sm:flex sm:items-center sm:gap-2 sm:px-4`}>
        <button
          type="button"
          onClick={() => onToggle("hype")}
          disabled={disabled}
          className={`group/hype group relative flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition-all cursor-pointer sm:gap-1.5 sm:px-3 sm:text-xs ${
            activeReaction === "hype"
              ? "bg-brand-orange/20 text-brand-orange border border-brand-orange/50 shadow-[0_0_12px_rgba(255,94,0,0.25)]"
              : "text-gray-400 border border-transparent hover:text-brand-orange hover:bg-card-slate/50"
          }`}
          title="Empolgado com essa notícia! (Hype)"
        >
          {hypePulse > 0 && (
            <span key={hypePulse} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible motion-reduce:hidden">
              <span className="hype-particle absolute left-[30%] top-1/2 -translate-x-1/2 -translate-y-1/2">
                <img src="/images/reactions/hype/level-4.png" alt="" width={14} height={18} className="h-4.5 w-3.5 object-contain drop-shadow-[0_0_6px_rgba(255,94,0,0.8)]" />
              </span>
              <span className="hype-particle hype-particle-delay absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <img src="/images/reactions/hype/level-5.png" alt="" width={16} height={20} className="h-5 w-4 object-contain drop-shadow-[0_0_8px_rgba(255,140,0,1)]" />
              </span>
              <span className="hype-particle hype-particle-late absolute left-[70%] top-1/2 -translate-x-1/2 -translate-y-1/2">
                <img src="/images/reactions/hype/level-3.png" alt="" width={14} height={18} className="h-4.5 w-3.5 object-contain drop-shadow-[0_0_6px_rgba(255,94,0,0.8)]" />
              </span>
            </span>
          )}
          <ReactionIcon type="hype" count={hype} active={activeReaction === "hype"} size={17} />
          <span className="hidden sm:inline">Hype</span>
          <span className="text-xs sm:text-xs font-bold tabular-nums opacity-90">
            {hype}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onToggle("flop")}
          disabled={disabled}
          className={`group flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition-all cursor-pointer sm:gap-1.5 sm:px-3 sm:text-xs ${
            activeReaction === "flop" || activeReaction === "salty"
              ? "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
              : "text-gray-400 border border-transparent hover:text-red-400 hover:bg-card-slate/50"
          }`}
          title="Decepcionou / Não curti (Flop)"
        >
          <ReactionIcon
            type="flop"
            count={combinedFlop}
            active={activeReaction === "flop" || activeReaction === "salty"}
            size={17}
          />
          <span className="hidden sm:inline">Flop</span>
          <span className="text-xs sm:text-xs font-bold tabular-nums opacity-90">
            {combinedFlop}
          </span>
        </button>

        <button
          type="button"
          onClick={onCommentClick}
          className="group flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-transparent px-1 text-xs font-bold text-gray-400 transition-all hover:bg-card-slate/50 hover:text-brand-orange sm:gap-1.5 sm:px-3 sm:text-xs"
          title="Ver e enviar respostas"
        >
          <ReactionIcon type="comment" count={commentCount ?? 0} size={17} />
          <span className="hidden sm:inline">Respostas</span>
          <span className="text-xs sm:text-xs font-bold tabular-nums opacity-90">
            {commentCount ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={onRepostClick}
          className="group flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-transparent px-1 text-xs font-bold text-gray-400 transition-all hover:bg-card-slate/50 hover:text-brand-orange sm:gap-1.5 sm:px-3 sm:text-xs"
          title="Republicar e comentar sobre isso no Brickboard"
        >
          <ReactionIcon type="repost" count={shareCount ?? 0} size={17} />
          <span className="hidden sm:inline">Republicar</span>
          <span className="text-xs sm:text-xs font-bold tabular-nums opacity-90">
            {shareCount ?? 0}
          </span>
        </button>

        {onShareClick && (
          <button
            type="button"
            onClick={onShareClick}
            className="group flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-transparent px-1 text-xs font-bold text-gray-400 transition-all hover:bg-card-slate/50 hover:text-brand-orange sm:gap-1.5 sm:px-3 sm:text-xs"
            title="Compartilhar link"
          >
            <ReactionIcon type="share" size={17} />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
        )}

        {viewCount !== undefined && (
          <div className="hidden sm:flex items-center gap-1 text-xs sm:text-xs font-subtitle text-gray-400 ml-auto px-1.5 py-0.5">
            <Icon name="eye" size={13} className="text-gray-500" />
            <span className="font-semibold tabular-nums">{viewCount}</span>
          </div>
        )}
      </div>

      <ReactionsError message={error || ""} />
    </div>
  );
}
