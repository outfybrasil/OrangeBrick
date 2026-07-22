export type PlatformSlug = "playstation" | "xbox" | "nintendo" | "indies" | "pc";

export interface PlatformConfig {
  slug: PlatformSlug;
  name: string;
  shortName: string;
  icon: string;
  iconUrl?: string;
  tagKeywords: string[];
  themeColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  glowShadow: string;
  gradientFrom: string;
  description: string;
}

export const PLATFORMS_CONFIG: Record<PlatformSlug, PlatformConfig> = {
  playstation: {
    slug: "playstation",
    name: "PlayStation",
    shortName: "PlayStation",
    icon: "🔵",
    iconUrl: "/logos/playstation-logo.png",
    tagKeywords: ["playstation", "ps5", "ps4", "sony", "dual sense", "playstation 5"],
    themeColor: "#0070D1",
    borderColor: "border-blue-500/40",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-400 border-blue-500/30",
    glowShadow: "shadow-[0_0_25px_rgba(0,112,209,0.25)]",
    gradientFrom: "from-blue-600/20",
    description: "Tudo sobre PlayStation 5, exclusividades da Sony, anúncios e rumores.",
  },
  xbox: {
    slug: "xbox",
    name: "Xbox",
    shortName: "Xbox",
    icon: "🟢",
    iconUrl: "/logos/xbox-logo.png",
    tagKeywords: ["xbox", "series x", "series s", "game pass", "microsoft"],
    themeColor: "#107C41",
    borderColor: "border-emerald-500/40",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-400 border-emerald-500/30",
    glowShadow: "shadow-[0_0_25px_rgba(16,124,65,0.25)]",
    gradientFrom: "from-emerald-600/20",
    description: "As principais novidades do ecossistema Xbox, Game Pass e estúdios Microsoft.",
  },
  nintendo: {
    slug: "nintendo",
    name: "Nintendo",
    shortName: "Nintendo",
    icon: "🔴",
    iconUrl: "/logos/nintendo-logo.png",
    tagKeywords: ["nintendo", "switch", "mario", "zelda", "switch 2", "pokemon"],
    themeColor: "#E60012",
    borderColor: "border-red-500/40",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-400 border-red-500/30",
    glowShadow: "shadow-[0_0_25px_rgba(230,0,18,0.25)]",
    gradientFrom: "from-red-600/20",
    description: "Lançamentos, Nintendo Direct, Switch 2 e franquias históricas da Nintendo.",
  },
  indies: {
    slug: "indies",
    name: "Indies",
    shortName: "Indies",
    icon: "👾",
    tagKeywords: ["indie", "indies", "independente", "roguelike", "metroidvania"],
    themeColor: "#9333EA",
    borderColor: "border-purple-500/40",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-400 border-purple-500/30",
    glowShadow: "shadow-[0_0_25px_rgba(147,51,234,0.25)]",
    gradientFrom: "from-purple-600/20",
    description: "Gemas escondidas, jogos independentes e produções criativas de estúdios indie.",
  },
  pc: {
    slug: "pc",
    name: "PC Gaming",
    shortName: "PC",
    icon: "💻",
    iconUrl: "/logos/pc-logo.png",
    tagKeywords: ["pc", "steam", "gpu", "nvidia", "amd", "epic games"],
    themeColor: "#00A3FF",
    borderColor: "border-cyan-500/40",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-400 border-cyan-500/30",
    glowShadow: "shadow-[0_0_25px_rgba(0,163,255,0.25)]",
    gradientFrom: "from-cyan-600/20",
    description: "Notícias sobre PC Gaming, Steam, ofertas, GPUs e mods para computador.",
  },
};

export const PLATFORM_SLUGS: PlatformSlug[] = ["playstation", "xbox", "nintendo", "indies", "pc"];
