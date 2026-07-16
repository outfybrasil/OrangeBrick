import { ReactionButton } from "./ReactionButton";
import { ReactionsError } from "./ReactionsError";
import { Icon } from "@/components/ui/Icon";
import type { ReactionType, PostCategory } from "@/lib/types/database";

interface ReactionBarProps {
  hype: number;
  flop: number;
  salty: number;
  defendo: number;
  brick: number;
  category?: PostCategory;
  onToggle: (type: ReactionType) => void;
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
  defendo,
  brick,
  category,
  onToggle,
  disabled,
  error,
  commentCount,
  onCommentClick,
  viewCount,
}: ReactionBarProps) {
  const isControversial = (salty + flop) > hype * 1.5 && hype > 0;
  const brickLabel = category === "opinion" ? "Enterrar" : "Brick";

  return (
    <div>
      <div className="flex items-center gap-1 px-4 py-2 border-t border-brand-orange-muted/10 bg-black/10">
        <ReactionButton
          type="hype"
          icon="hype"
          count={hype}
          disabled={disabled}
          onClick={() => onToggle("hype")}
        />
        <ReactionButton
          type="flop"
          icon="flop"
          count={flop}
          disabled={disabled}
          onClick={() => onToggle("flop")}
        />
        <ReactionButton
          type="salty"
          icon="salty"
          count={salty}
          disabled={disabled}
          onClick={() => onToggle("salty")}
        />
        <ReactionButton
          type="defendo"
          icon="defendo"
          count={defendo}
          disabled={disabled}
          onClick={() => onToggle("defendo")}
        />

        {isControversial && (
          <ReactionButton
            type="brick"
            icon="brick"
            count={brick}
            disabled={disabled}
            variant="brick"
            onClick={() => onToggle("brick")}
          />
        )}

        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 mr-2">
          <Icon name="eye" size={14} />
          {viewCount !== undefined && (
            <span className="text-[10px] font-mono text-gray-500">{viewCount}</span>
          )}
        </div>

        <button
          type="button"
          aria-label="Comentários"
          onClick={onCommentClick}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-gray-500 border border-transparent rounded-none hover:text-gray-300 hover:border-gray-500/30 transition-all duration-100 group/btn"
        >
          <Icon name="comment" size={14} className="transition-colors duration-100" />
          {commentCount !== undefined && commentCount > 0 && (
            <span className="text-[10px] font-mono text-gray-500">{commentCount}</span>
          )}
        </button>
      </div>

      <ReactionsError message={error || ""} />
    </div>
  );
}
