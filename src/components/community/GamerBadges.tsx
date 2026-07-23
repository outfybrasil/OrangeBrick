"use client";

interface GamerBadgesProps {
  nickname: string;
  postCount?: number;
  reactionsCount?: number;
  commentsCount?: number;
  isOfficial?: boolean;
}

export function GamerBadges({ postCount = 0, reactionsCount = 0, commentsCount = 0, isOfficial = false }: GamerBadgesProps) {
  const badges = [];

  if (isOfficial) {
    badges.push({
      id: "official",
      label: "🏆 Portal Oficial",
      description: "Conta oficial verificada da equipe Orange Brick",
      color: "bg-brand-orange/20 text-brand-orange border-brand-orange/50 shadow-[0_0_12px_rgba(255,94,0,0.3)]",
    });
  }

  if (postCount >= 1 || isOfficial) {
    badges.push({
      id: "first_brick",
      label: "🧱 Construtor de Bricks",
      description: "Publicou seu primeiro Brick na comunidade",
      color: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    });
  }

  if (postCount >= 5 || isOfficial) {
    badges.push({
      id: "hype_master",
      label: "🔥 Mestre do Hype",
      description: "Criador de conteúdo ativo no Brickboard",
      color: "bg-red-500/20 text-red-400 border-red-500/40",
    });
  }

  if (commentsCount >= 3 || isOfficial) {
    badges.push({
      id: "debater",
      label: "💬 Debatedor nato",
      description: "Participou de múltiplos debates nos tópicos",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    });
  }

  if (reactionsCount >= 5 || isOfficial) {
    badges.push({
      id: "engaged",
      label: "⚡ Super Engajado",
      description: "Reagiu ativamente às notícias e takes do mercado",
      color: "bg-sky-500/20 text-sky-400 border-sky-500/40",
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={badge.description}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-subtitle font-bold border transition-all select-none ${badge.color}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
