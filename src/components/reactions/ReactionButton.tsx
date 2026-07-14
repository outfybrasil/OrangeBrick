import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/Icon";
import type { ReactionType } from "@/lib/types/database";

interface ReactionButtonProps {
  type: ReactionType;
  icon: IconName;
  count: number;
  disabled?: boolean;
  variant?: "default" | "brick";
  onClick: () => void;
}

export function ReactionButton({ type, icon, count, disabled, variant = "default", onClick }: ReactionButtonProps) {
  const labels: Record<ReactionType, string> = {
    hype: "Hype",
    flop: "Flop",
    salty: "Salty",
    defendo: "Defendo",
    brick: "Brick",
  };

  const colors: Record<string, string> = {
    hype: "group-hover:text-brand-orange group-hover:border-brand-orange/40",
    flop: "group-hover:text-red-400 group-hover:border-red-400/40",
    salty: "group-hover:text-yellow-400 group-hover:border-yellow-400/40",
    defendo: "group-hover:text-accent-blue group-hover:border-accent-blue/40",
    brick: "group-hover:text-red-500 group-hover:border-red-500/40",
  };

  const isBrick = variant === "brick";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${labels[type]}: ${count}`}
      className={`
        group/btn flex items-center gap-1.5
        px-2 py-1 min-w-[48px]
        text-[11px] font-mono text-gray-500
        border border-transparent rounded-none
        transition-all duration-100
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${colors[type]}
        ${isBrick ? "border-dashed border-red-500/20 opacity-60 hover:opacity-100" : ""}
      `}
    >
      <Icon
        name={icon}
        size={14}
        className="transition-colors duration-100"
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
