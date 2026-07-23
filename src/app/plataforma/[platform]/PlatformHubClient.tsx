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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 sm:flex-nowrap sm:gap-6 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Ir para a página inicial" className="group flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-xl sm:gap-3">
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

          {/* BARRA DE PESQUISA EXPANDIDA NO CENTRO */}
          <div className="order-3 w-full min-w-0 flex-none sm:order-none sm:mx-6 sm:flex-1 sm:max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <label htmlFor="platform-search" className="sr-only">
                Buscar matérias
              </label>
              <input
                id="platform-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar matérias..."
                className="min-h-11 w-full rounded-xl border border-brand-orange-muted/20 bg-background-void/90 px-3 pl-9 text-xs text-white shadow-inner outline-none transition-all focus:border-brand-orange/60 focus:ring-1 focus:ring-brand-orange/30 sm:pl-10 sm:text-sm"
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
          </div>

          {/* BOTÕES DE AÇÃO NA DIREITA */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              href="/brickboard"
              aria-label="Abrir Brickboard"
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-brand-orange/40 bg-brand-orange/15 px-3 text-xs font-bold uppercase tracking-wider text-brand-orange transition-colors hover:bg-brand-orange hover:text-white sm:px-3.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="hidden xs:inline">Brickboard</span>
            </Link>

            <UserNav />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.gradientFrom} to-card-slate/80 border ${config.borderColor} p-4 sm:rounded-3xl sm:p-8 shadow-2xl backdrop-blur-md`}>
          <div className="relative z-10 space-y-3">
            <div className="flex flex-col items-start gap-3 xs:flex-row xs:items-center xs:justify-between">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-700/50 bg-background-void/60 px-3 text-xs font-bold uppercase tracking-wider text-gray-300 transition-colors hover:border-white hover:text-white"
              >
                ← Todos os Conteúdos
              </Link>

              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider xs:text-xs ${config.badgeBg} ${config.badgeText}`}>
                Hub Oficial {config.shortName}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-3 pt-2 sm:gap-3.5">
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
              <h1 className="min-w-0 break-words font-heading text-[clamp(1.65rem,9vw,3rem)] font-black uppercase leading-tight tracking-tight text-white">
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
