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
      <span className="flex h-3 w-3 items-center justify-center rounded-full bg-brand-orange text-black">
        <svg aria-hidden="true" viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m2.5 6 2.2 2.2 4.8-5" />
        </svg>
      </span>
      <span className="text-[9px] text-white">Oficial</span>
    </span>
  );
}
