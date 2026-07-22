import { ReactionButton } from "./ReactionButton";
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
  onCommentClick?: () => void;
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
  onCommentClick,
  viewCount,
}: ReactionBarProps) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-brand-orange-muted/10 bg-black/20 flex-wrap">
        <ReactionButton
          type="hype"
          icon="hype"
          count={hype}
          disabled={disabled}
          active={activeReaction === "hype"}
          onClick={() => onToggle("hype")}
        />
        <ReactionButton
          type="flop"
          icon="flop"
          count={flop}
          disabled={disabled}
          active={activeReaction === "flop"}
          onClick={() => onToggle("flop")}
        />
        <ReactionButton
          type="salty"
          icon="salty"
          count={salty}
          disabled={disabled}
          active={activeReaction === "salty"}
          onClick={() => onToggle("salty")}
        />

        <div className="flex-1 min-w-[8px]" />

        <div className="flex items-center gap-3 text-xs font-subtitle text-gray-400">
          {viewCount !== undefined && (
            <div className="flex items-center gap-1 text-[11px] font-subtitle text-gray-400 bg-card-slate/30 px-2 py-1 rounded-lg border border-brand-orange-muted/10">
              <Icon name="eye" size={13} className="text-gray-400" />
              <span className="font-semibold">{viewCount}</span>
            </div>
          )}

          <button
            type="button"
            aria-label="Comentários"
            onClick={onCommentClick}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-subtitle text-gray-300 bg-card-slate/40 border border-brand-orange-muted/15 rounded-lg hover:text-white hover:border-brand-orange/40 hover:bg-card-slate transition-all duration-200 cursor-pointer group/btn"
          >
            <Icon name="comment" size={13} className="text-brand-orange group-hover/btn:scale-110 transition-transform" />
            <span className="font-semibold">{commentCount ?? 0}</span>
          </button>
        </div>
      </div>

      <ReactionsError message={error || ""} />
    </div>
  );
}
