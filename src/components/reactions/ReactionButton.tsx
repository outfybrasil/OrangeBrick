import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/Icon";
import type { ReactionType } from "@/lib/types/database";

interface ReactionButtonProps {
  type: ReactionType;
  icon: IconName;
  count: number;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
}

export function ReactionButton({ type, icon, count, disabled, active, onClick }: ReactionButtonProps) {
  const labels: Record<ReactionType, string> = {
    hype: "Hype",
    flop: "Flop",
    salty: "Salty",
  };

  const activeColors: Record<string, string> = {
    hype: "text-brand-orange border-brand-orange/40 bg-brand-orange/10",
    flop: "text-red-400 border-red-400/40 bg-red-400/10",
    salty: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  };

  const hoverColors: Record<string, string> = {
    hype: "group-hover:text-brand-orange group-hover:border-brand-orange/40",
    flop: "group-hover:text-red-400 group-hover:border-red-400/40",
    salty: "group-hover:text-yellow-400 group-hover:border-yellow-400/40",
  };

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
        border rounded-none
        transition-all duration-100
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${active ? activeColors[type] : `border-transparent ${hoverColors[type]}`}
      `}
    >
      <Icon
        name={icon}
        size={14}
        className={`transition-colors duration-100 ${active ? "scale-110" : ""}`}
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
