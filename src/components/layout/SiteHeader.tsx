"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBox } from "@/components/ui/SearchBox";
import { BrandLogo } from "@/components/ui/BrandLogo";
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
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0e12]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-h-11 shrink-0 items-center gap-2.5"
          aria-label="Ir para a página inicial do Orange Brick"
        >
          <BrandLogo alt="Orange Brick" className="h-auto w-[min(44vw,10rem)] transition-transform duration-300 group-hover:scale-105 sm:h-5 sm:w-auto" />
        </Link>

        {variant === "full" && (
          <div className="relative mx-4 hidden w-full max-w-xs flex-1 lg:block"><SearchBox key={`site-header-${searchQuery}`} initialQuery={searchQuery} compact /></div>
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
