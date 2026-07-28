import Link from "next/link";
import { divisionLabel, formatXp, levelProgress, rarityLabel } from "@/lib/progression";
import type { AchievementProgress, ProgressionSummary, SeasonSummary } from "@/lib/types/progression";

const rarityClasses = {
  common: "border-white/15 text-gray-300",
  uncommon: "border-emerald-400/35 text-emerald-200",
  rare: "border-sky-400/35 text-sky-200",
  epic: "border-violet-400/35 text-violet-200",
  legendary: "border-brand-orange/50 text-brand-orange",
};

export function LevelProgress({ progress, compact = false }: { progress: ProgressionSummary; compact?: boolean }) {
  const totalXp = progress.lifetime_xp ?? 0;
  const percent = levelProgress(totalXp, progress.level);

  return (
    <section className={compact ? "space-y-2" : "space-y-4"} aria-label={`Nível ${progress.level}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-brand-orange">Nível {progress.level}</p>
          {!compact && <p className="mt-1 font-heading text-2xl font-black text-white">{formatXp(totalXp)} XP</p>}
        </div>
        <p className="text-xs text-gray-400">{Math.round(percent)}%</p>
      </div>
      <div className="h-2 overflow-hidden bg-white/10" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <span className="block h-full bg-brand-orange transition-[width] duration-700 ease-out" style={{ width: `${percent}%` }} />
      </div>
      {!compact && (
        <p className="text-xs text-gray-400">
          {formatXp(Math.max(0, progress.next_level_xp - totalXp))} XP para o próximo nível
        </p>
      )}
    </section>
  );
}

export function SeasonStanding({ season }: { season: SeasonSummary | null }) {
  if (!season) {
    return <p className="text-sm leading-6 text-gray-400">Nenhuma temporada está ativa.</p>;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-gray-400">{season.name}</p>
          <h2 className="mt-1 font-heading text-xl font-black text-white">{divisionLabel(season.division)}</h2>
        </div>
        {season.rank && <span className="text-sm font-bold text-brand-orange">#{season.rank}</span>}
      </div>
      <p className="text-sm text-gray-300">{formatXp(season.eligible_xp || 0)} XP na temporada</p>
      {!season.is_qualified && (
        <p className="text-xs leading-5 text-gray-400">São necessários 100 XP em três dias diferentes para entrar no ranking.</p>
      )}
      <Link href="/brickboard/ranking" className="inline-flex min-h-11 items-center text-xs font-bold text-brand-orange hover:text-white">
        Ver ranking
      </Link>
    </section>
  );
}

export function AchievementMark({ achievement }: { achievement: AchievementProgress }) {
  const isUnlocked = Boolean(achievement.unlocked_at);
  const percent = Math.min(100, Math.round((achievement.progress / Math.max(achievement.target, 1)) * 100));

  return (
    <article className={`min-w-0 border-t pt-4 ${isUnlocked ? rarityClasses[achievement.rarity] : "border-white/10 text-gray-500"}`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center bg-white/5" aria-hidden="true">
        <span className="h-5 w-5 rotate-45 border-2 border-current" />
      </div>
      <h3 className="font-heading text-base font-bold text-white">{achievement.name}</h3>
      <p className="mt-1 text-xs leading-5 text-gray-400">{achievement.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
        <span>{isUnlocked ? rarityLabel(achievement.rarity) : `${achievement.progress} de ${achievement.target}`}</span>
        {!isUnlocked && <span>{percent}%</span>}
      </div>
    </article>
  );
}
