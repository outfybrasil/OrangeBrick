"use client";

interface TrendingTickerProps {
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

const TRENDING_TAGS = [
  { id: "halo", label: "🎮 Halo UE5 Remake" },
  { id: "switch2", label: "🕹️ Nintendo Switch 2" },
  { id: "psplus", label: "⚡ PS Plus de Julho" },
  { id: "witcher", label: "⚔️ Witcher 3 Expansão" },
  { id: "cod", label: "💣 Modern Warfare 4" },
  { id: "wreck", label: "🏎️ Wreckreation 2" },
  { id: "bethesda", label: "☢️ Fallout 5 & TES 6" },
];

export function TrendingTicker({ activeTag, onSelectTag }: TrendingTickerProps) {
  return (
    <div className="w-full bg-card-slate/30 border-y border-brand-orange-muted/10 py-2.5 px-4 mb-6">
      <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto scrollbar-none font-mono text-xs">
        <div className="flex items-center gap-1.5 shrink-0 text-brand-orange font-bold uppercase tracking-wider pr-2 border-r border-brand-orange-muted/20">
          <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
          <span>Em Alta</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {TRENDING_TAGS.map((tag) => {
            const isSelected = activeTag?.toLowerCase() === tag.id.toLowerCase();
            return (
              <button
                key={tag.id}
                onClick={() => onSelectTag(isSelected ? null : tag.id)}
                className={`
                  px-3 py-1 rounded-full border text-[11px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1
                  ${
                    isSelected
                      ? "bg-brand-orange text-white border-brand-orange shadow-[0_0_12px_rgba(255,94,0,0.3)] font-bold"
                      : "bg-card-slate/50 text-gray-300 border-brand-orange-muted/15 hover:border-brand-orange/40 hover:text-white hover:bg-card-slate"
                  }
                `}
              >
                {tag.label}
              </button>
            );
          })}
        </div>

        {activeTag && (
          <button
            onClick={() => onSelectTag(null)}
            className="text-[10px] text-gray-400 hover:text-white underline ml-auto shrink-0 cursor-pointer"
          >
            Limpar filtro
          </button>
        )}
      </div>
    </div>
  );
}
