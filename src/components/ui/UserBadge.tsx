interface UserBadgeProps {
  nickname?: string | null;
  isOfficial?: boolean;
}

export function UserBadge({ isOfficial }: UserBadgeProps) {
  const isSiteOfficial = Boolean(isOfficial);

  if (!isSiteOfficial) return null;

  return (
    <span
      title="Conta Oficial do Portal Orange Brick (Verificada)"
      className="inline-flex shrink-0 cursor-default select-none items-center gap-1 rounded-lg border border-brand-orange/45 bg-brand-orange/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-orange"
    >
      <span className="flex h-3 w-3 items-center justify-center rounded-full bg-brand-orange text-[8px] font-extrabold leading-none text-black">
        ✓
      </span>
      <span className="text-[9px] text-white">Oficial</span>
    </span>
  );
}
