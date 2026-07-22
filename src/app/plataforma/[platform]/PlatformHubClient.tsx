"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlatformConfig } from "@/lib/types/platform";
import { PlatformBar } from "@/components/feed/PlatformBar";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { UserNav } from "@/components/auth/UserNav";
import { Footer } from "@/components/ui/Footer";

interface PlatformHubClientProps {
  config: PlatformConfig;
}

export function PlatformHubClient({ config }: PlatformHubClientProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background-void text-white font-body">
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/10 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="flex items-center cursor-pointer group gap-2 sm:gap-3 shrink-0 min-w-0">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              style={{ maxHeight: "36px", maxWidth: "48px", width: "auto", height: "auto" }}
              className="h-8 sm:h-9 w-auto object-contain transform group-hover:scale-[1.05] transition-transform duration-300 shrink-0"
            />
            <span className="hidden sm:inline text-xl sm:text-2xl font-heading font-extrabold text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors duration-300 shrink-0 whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-[140px] sm:max-w-xs lg:max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 pl-8 sm:pl-10 outline-none focus:border-brand-orange/50 transition-colors font-body text-xs sm:text-sm shadow-inner"
              />
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>

            <Link
              href="/brickboard"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-orange/15 border border-brand-orange/40 hover:bg-brand-orange hover:text-white text-brand-orange font-subtitle text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(255,94,0,0.15)] whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Brickboard</span>
            </Link>

            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${config.gradientFrom} to-card-slate/80 border ${config.borderColor} p-6 sm:p-8 shadow-2xl backdrop-blur-md`}>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background-void/60 border border-gray-700/50 hover:border-white text-gray-300 hover:text-white font-subtitle text-xs font-bold uppercase tracking-wider transition-colors"
              >
                ← Todos os Conteúdos
              </Link>

              <span className={`px-3 py-1 rounded-full text-xs font-subtitle font-bold uppercase tracking-wider border ${config.badgeBg} ${config.badgeText}`}>
                Hub Oficial {config.shortName}
              </span>
            </div>

            <div className="flex items-center gap-3.5 pt-2">
              {config.iconUrl ? (
                <img
                  src={config.iconUrl}
                  alt={config.name}
                  style={{ maxHeight: "36px", maxWidth: "48px", width: "auto", height: "auto" }}
                  className="object-contain max-h-9 max-w-12 shrink-0"
                />
              ) : (
                <span className="text-3xl sm:text-4xl">{config.icon}</span>
              )}
              <h1 className="font-heading text-3xl sm:text-5xl font-black text-white uppercase tracking-wider">
                {config.name}
              </h1>
            </div>

            <p className="text-sm sm:text-base text-gray-300 font-subtitle max-w-2xl leading-relaxed">
              {config.description}
            </p>
          </div>
        </div>

        <PlatformBar activePlatform={config.slug} />

        <NewsFeed category={null} platformSlug={config.slug} />
      </main>

      <Footer />
    </div>
  );
}
