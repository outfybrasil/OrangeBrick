export type ProfileActiveTab = "bricks" | "replies" | "games" | "reposts" | "saved";

interface ProfileTabsProps {
  activeTab: ProfileActiveTab;
  onChangeTab: (tab: ProfileActiveTab) => void;
  isOwner: boolean;
  bricksCount?: number;
  repliesCount?: number;
  gamesCount?: number;
}

export function ProfileTabs({
  activeTab,
  onChangeTab,
  isOwner,
  bricksCount,
  repliesCount,
  gamesCount,
}: ProfileTabsProps) {
  const tabs: Array<{ id: ProfileActiveTab; label: string; count?: number }> = [
    { id: "bricks", label: "Bricks", count: bricksCount },
    { id: "replies", label: "Respostas", count: repliesCount },
    { id: "games", label: "Jogos", count: gamesCount },
    { id: "reposts", label: "Republicações" },
  ];

  if (isOwner) {
    tabs.push({ id: "saved", label: "Salvos" });
  }

  return (
    <div className="w-full border-b border-white/10">
      <div className="flex gap-2 overflow-x-auto pb-px scrollbar-none touch-pan-x">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              aria-selected={isActive}
              role="tab"
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all focus-visible:outline-none ${
                isActive
                  ? "border-brand-orange text-white text-shadow-sm"
                  : "border-transparent text-gray-400 hover:border-white/20 hover:text-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive ? "bg-brand-orange text-white" : "bg-white/10 text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
