"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserNav } from "@/components/auth/UserNav";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/noticias", label: "Notícias" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/brickboard", label: "BrickBoard" },
  { href: "/meu-brick", label: "Meu Brick" },
];

interface SiteHeaderProps {
  variant?: "full" | "strip";
  searchQuery?: string;
}

export function SiteHeader({ variant = "full", searchQuery = "" }: SiteHeaderProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

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
          <span className="hidden whitespace-nowrap text-base font-heading font-extrabold uppercase tracking-[0.1em] text-white transition-colors group-hover:text-brand-orange min-[360px]:inline sm:text-lg sm:tracking-widest">
            Orange<span className="text-brand-orange">_</span>Brick
          </span>
        </Link>

        {variant === "full" && (
          <form action="/busca" method="get" role="search" className="relative mx-4 hidden w-full max-w-xs flex-1 lg:block">
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

        <nav className="ml-auto flex shrink-0 items-center gap-1" aria-label="Navegação principal">
          <Link
            href="/busca"
            aria-label="Buscar no Orange Brick"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-300 transition-colors hover:text-white lg:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path strokeLinecap="round" d="m16 16 5 5" />
            </svg>
          </Link>

          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`hidden min-h-11 items-center px-3 text-xs font-semibold transition-colors lg:flex ${
                  active ? "text-brand-orange font-bold" : "text-gray-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="ml-1 pl-1 border-l border-white/10 flex items-center">
            <UserNav />
          </div>
        </nav>
      </div>
    </header>
  );
}
