interface UserBadgeProps {
  nickname: string;
  isOfficial?: boolean;
}

export function UserBadge({ nickname, isOfficial }: UserBadgeProps) {
  const lower = nickname.toLowerCase().trim();
  const isSiteOfficial =
    isOfficial ||
    lower === "orange brick" ||
    lower === "orangebrick" ||
    lower === "orange_brick" ||
    lower === "madumachado";

  if (!isSiteOfficial) return null;

  return (
    <span
      title="Conta Oficial do Portal Orange Brick"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase tracking-wider bg-brand-orange/20 text-brand-orange border border-brand-orange/40 shadow-[0_0_10px_rgba(255,94,0,0.35)] shrink-0 select-none"
    >
      <svg className="w-2.5 h-2.5 fill-brand-orange" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
      <span>OFICIAL</span>
    </span>
  );
}
