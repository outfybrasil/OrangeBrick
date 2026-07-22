"use client";

import Link from "next/link";
import { PLATFORM_SLUGS, PLATFORMS_CONFIG, PlatformSlug } from "@/lib/types/platform";

interface PlatformBarProps {
  activePlatform?: PlatformSlug | null;
}

export function PlatformBar({ activePlatform }: PlatformBarProps) {
  return (
    <div className="w-full bg-card-slate/30 border border-brand-orange-muted/15 rounded-2xl p-2.5 sm:p-3 shadow-lg my-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <span className="text-[11px] sm:text-xs font-subtitle font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-orange shadow-[0_0_8px_#FF5E00]" />
          <span>Plataformas & Ecossistemas</span>
        </span>
        <span className="text-[10px] font-subtitle text-gray-500 hidden xs:inline">
          Filtre por console ou nicho
        </span>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
        {PLATFORM_SLUGS.map((slug) => {
          const config = PLATFORMS_CONFIG[slug];
          const isActive = activePlatform === slug;

          return (
            <Link
              key={slug}
              href={`/plataforma/${slug}`}
              className={`
                flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 font-subtitle text-xs font-bold uppercase tracking-wider cursor-pointer h-10
                ${
                  isActive
                    ? `${config.badgeBg} ${config.badgeText} ${config.borderColor} ${config.glowShadow} scale-[1.02]`
                    : "bg-card-slate/50 text-gray-300 border-gray-700/30 hover:border-gray-500/50 hover:bg-card-slate hover:text-white hover:scale-[1.01]"
                }
              `}
            >
              {config.iconUrl ? (
                <img
                  src={config.iconUrl}
                  alt={config.name}
                  style={{ maxHeight: "18px", maxWidth: "24px", width: "auto", height: "auto" }}
                  className="object-contain shrink-0 max-h-[18px] max-w-[24px]"
                />
              ) : (
                <span className="text-xs shrink-0">{config.icon}</span>
              )}
              <span className="truncate">{config.shortName}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
