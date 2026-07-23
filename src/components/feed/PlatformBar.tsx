"use client";

import Link from "next/link";
import { PLATFORM_SLUGS, PLATFORMS_CONFIG, PlatformSlug } from "@/lib/types/platform";

interface PlatformBarProps {
  activePlatform?: PlatformSlug | null;
}

export function PlatformBar({ activePlatform }: PlatformBarProps) {
  return (
    <section aria-labelledby="platform-index-title" className="my-6 w-full min-w-0 border-y border-white/10">
      <div className="flex items-end justify-between gap-4 py-3">
        <div>
          <h2 id="platform-index-title" className="font-heading text-sm font-extrabold text-white sm:text-base">
            Plataformas & ecossistemas
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-500">Escolha uma cobertura</p>
        </div>
        <span className="hidden text-[10px] font-semibold text-gray-600 sm:inline">Navegue por plataforma</span>
      </div>

      <nav aria-label="Cobertura por plataforma" className="-mx-3 flex overflow-x-auto border-t border-white/10 px-3 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
        {PLATFORM_SLUGS.map((slug) => {
          const config = PLATFORMS_CONFIG[slug];
          const isActive = activePlatform === slug;

          return (
            <Link
              key={slug}
              href={`/plataforma/${slug}`}
              aria-current={isActive ? "page" : undefined}
              style={isActive ? { boxShadow: `inset 0 -2px ${config.themeColor}` } : undefined}
              className={`group flex min-h-16 min-w-[160px] items-center gap-3 border-r border-white/[0.08] px-4 transition-colors last:border-r-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange sm:min-w-0 ${
                isActive ? "bg-white/[0.06] text-white" : "text-gray-400 hover:bg-white/[0.035] hover:text-white"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                {config.iconUrl ? (
                  <img
                    src={config.iconUrl}
                    alt=""
                    style={{ maxHeight: "20px", maxWidth: "28px", width: "auto", height: "auto" }}
                    className="max-h-5 max-w-7 object-contain opacity-80 transition-opacity group-hover:opacity-100"
                  />
                ) : (
                  <span className="text-[10px] font-black tracking-[-0.02em]" style={{ color: config.themeColor }}>
                    {config.shortName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-extrabold">{config.shortName}</span>
                <span className="mt-0.5 block whitespace-nowrap text-[9px] font-semibold uppercase text-gray-600 transition-colors group-hover:text-gray-500">
                  Ver cobertura
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
