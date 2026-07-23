interface UserBadgeProps {
  nickname?: string | null;
  isOfficial?: boolean;
}

export function UserBadge({ nickname, isOfficial }: UserBadgeProps) {
  const lower = (nickname || "").toLowerCase().trim();
  const isSiteOfficial =
    Boolean(isOfficial) ||
    lower === "orange brick" ||
    lower === "orangebrick" ||
    lower === "orange_brick";

  if (!isSiteOfficial) return null;

  return (
    <span
      title="Conta Oficial do Portal Orange Brick (Verificada)"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-heading font-black uppercase tracking-wider bg-gradient-to-r from-brand-orange/20 to-sky-500/20 text-brand-orange border border-brand-orange/40 shadow-[0_0_12px_rgba(255,94,0,0.35)] shrink-0 select-none cursor-default"
    >
      <span className="flex items-center justify-center w-3 h-3 rounded-full bg-brand-orange text-black font-extrabold text-[8px] leading-none">
        ✓
      </span>
      <span className="text-white text-[9px]">OFICIAL</span>
    </span>
  );
}
