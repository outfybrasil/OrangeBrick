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
  const meta: Record<ReactionType, { label: string; tooltip: string; activeStyle: string; hoverIcon: string }> = {
    hype: {
      label: "Hype",
      tooltip: "🔥 Empolgado!",
      activeStyle: "bg-brand-orange/20 text-brand-orange border-brand-orange/50 shadow-[0_0_12px_rgba(255,94,0,0.25)] font-bold",
      hoverIcon: "group-hover/btn:scale-125 group-hover/btn:-translate-y-0.5 text-brand-orange transition-transform duration-200",
    },
    flop: {
      label: "Flop",
      tooltip: "📉 Decepcionou!",
      activeStyle: "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)] font-bold",
      hoverIcon: "group-hover/btn:rotate-12 group-hover/btn:translate-y-0.5 text-red-400 transition-transform duration-200",
    },
    salty: {
      label: "Rage",
      tooltip: "🤬 Rage / Indignado!",
      activeStyle: "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)] font-bold",
      hoverIcon: "group-hover/btn:scale-125 group-hover/btn:rotate-12 text-rose-400 transition-transform duration-200",
    },
  };

  const currentMeta = meta[type];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={currentMeta.tooltip}
      aria-label={`${currentMeta.label} (${currentMeta.tooltip}): ${count}`}
      className={`
        group/btn relative flex items-center gap-1.5
        px-2.5 py-1 rounded-lg text-xs font-subtitle font-medium
        border transition-all duration-200 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95 select-none
        ${
          active
            ? currentMeta.activeStyle
            : "bg-card-slate/40 text-gray-300 border-brand-orange-muted/15 hover:bg-card-slate hover:border-brand-orange/30 hover:text-white"
        }
      `}
    >
      <Icon
        name={icon}
        size={14}
        className={`transition-all duration-200 ${active ? "scale-110" : currentMeta.hoverIcon}`}
      />
      <span className="text-[11px] font-semibold tracking-tight">{currentMeta.label}</span>
      <span className="text-[11px] font-bold tabular-nums opacity-80 bg-black/20 px-1.5 py-0.5 rounded-md">
        {count}
      </span>
    </button>
  );
}
