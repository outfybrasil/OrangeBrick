import { ReactionIcon } from "@/components/reactions/ReactionIcon";

interface ProfileStatsProps {
  bricksCount: number;
  hypesCount: number;
  gamesCount: number;
}

export function ProfileStats({ bricksCount, hypesCount, gamesCount }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-3 divide-x divide-white/10 rounded-sm border border-white/10 bg-[#111217] py-3 text-center sm:py-4">
      <div className="px-2 sm:px-4">
        <span className="block font-heading text-xl font-black text-white sm:text-2xl">
          {bricksCount}
        </span>
        <span className="mt-0.5 block text-[10px] font-black uppercase tracking-widest text-gray-400 sm:text-xs">
          Bricks
        </span>
      </div>

      <div className="px-2 sm:px-4">
        <span className="inline-flex items-center justify-center gap-1.5 font-heading text-xl font-black text-brand-orange sm:text-2xl">
          <ReactionIcon type="hype" count={hypesCount} size={16} />
          <span>{hypesCount}</span>
        </span>
        <span className="mt-0.5 block text-[10px] font-black uppercase tracking-widest text-gray-400 sm:text-xs">
          Hypes
        </span>
      </div>

      <div className="px-2 sm:px-4">
        <span className="block font-heading text-xl font-black text-white sm:text-2xl">
          {gamesCount}
        </span>
        <span className="mt-0.5 block text-[10px] font-black uppercase tracking-widest text-gray-400 sm:text-xs">
          Jogos
        </span>
      </div>
    </div>
  );
}
