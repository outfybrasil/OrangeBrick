import type { AchievementRarity } from "@/lib/types/progression";

export function levelFloor(level: number): number {
  return level <= 1 ? 0 : 100 * level * level;
}

export function levelCeiling(level: number): number {
  return Math.min(1_000_000, 100 * (level + 1) * (level + 1));
}

export function levelProgress(totalXp: number, level: number): number {
  const floor = levelFloor(level);
  const ceiling = levelCeiling(level);
  if (ceiling === floor) return 100;
  return Math.max(0, Math.min(100, ((totalXp - floor) / (ceiling - floor)) * 100));
}

export function formatXp(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function rarityLabel(rarity: AchievementRarity): string {
  return {
    common: "Comum",
    uncommon: "Incomum",
    rare: "Rara",
    epic: "Épica",
    legendary: "Lendária",
  }[rarity];
}

export function divisionLabel(division: string | null): string {
  if (!division) return "Sem divisão";
  return {
    brick: "Tijolo",
    copper: "Cobre",
    iron: "Ferro",
    steel: "Aço",
    orange: "Laranja",
    furnace: "Fornalha",
  }[division] || division;
}
