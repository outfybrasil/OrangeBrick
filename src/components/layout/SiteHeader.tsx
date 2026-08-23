"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserNav } from "@/components/auth/UserNav";

const NAV_LINKS = [
  { href: "/noticias", label: "Notícias" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/em-alta", label: "Em alta" },
];

interface SiteHeaderProps {
  variant?: "full" | "strip";
  searchQuery?: string;
}

export function SiteHeader({ variant = "full", searchQuery = "" }: SiteHeaderProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0e12]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-h-11 shrink-0 items-center gap-2.5"
          aria-label="Ir para a página inicial do Orange Brick"
        >
          <img
            src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
            alt=""
            style={{ maxHeight: "32px", maxWidth: "42px", width: "auto", height: "auto" }}
            className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="hidden whitespace-nowrap text-lg font-heading font-extrabold uppercase tracking-widest text-white transition-colors group-hover:text-brand-orange sm:inline">
            Orange<span className="text-brand-orange">_</span>Brick
          </span>
        </Link>

        {variant === "full" && (
          <form action="/busca" method="get" role="search" className="relative mx-4 hidden w-full max-w-xs flex-1 md:block">
            <label htmlFor="site-search" className="sr-only">Buscar notícias</label>
            <input
              id="site-search"
              name="q"
              type="search"
              data-site-search-input
              defaultValue={searchQuery}
              key={`site-header-${searchQuery}`}
              aria-label="Buscar notícias (atalho / ou Ctrl+K)"
              placeholder="Buscar no Orange Brick   /"
              className="h-9 w-full border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs text-white outline-none transition-all placeholder:text-gray-500 focus:border-brand-orange/40 focus:bg-white/[0.06]"
            />
            <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
        )}

        <nav className="ml-auto flex shrink-0 items-center gap-0.5" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={`hidden min-h-11 items-center px-3 text-xs font-semibold transition-colors lg:flex ${
                pathname === link.href ? "text-brand-orange" : "text-gray-400 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/brickboard"
            aria-current={pathname.startsWith("/brickboard") ? "page" : undefined}
            className="mx-1 hidden min-h-11 items-center gap-1.5 whitespace-nowrap border border-brand-orange bg-brand-orange/10 px-3 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white sm:flex"
          >
            <span className="font-mono text-sm font-black">#</span>
            <span>Brickboard</span>
          </Link>
          <UserNav />
        </nav>
      </div>
    </header>
  );
}
