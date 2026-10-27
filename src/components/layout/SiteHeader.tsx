"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBox } from "@/components/ui/SearchBox";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { UserNav } from "@/components/auth/UserNav";
import { useAuth } from "@/lib/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getDictionary, type Locale } from "@/lib/i18n";

interface SiteHeaderProps {
  variant?: "full" | "strip";
  searchQuery?: string;
}

export function SiteHeader({ variant = "full", searchQuery = "" }: SiteHeaderProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const currentLocale: Locale = pathname.startsWith("/en") ? "en" : "pt";
  const dict = getDictionary(currentLocale);

  const homeHref = currentLocale === "en" ? "/en" : "/";
  const newsHref = currentLocale === "en" ? "/en/noticias" : "/noticias";
  const releasesHref = currentLocale === "en" ? "/en/lancamentos" : "/lancamentos";
  const communityHref = currentLocale === "en" ? "/en/brickboard" : "/brickboard";
  const myProfileHref = profile?.username ? `/u/${encodeURIComponent(profile.username)}` : "/meu-brick";

  const navLinks = [
    { href: homeHref, label: currentLocale === "en" ? "Home" : "Início" },
    { href: newsHref, label: dict.nav.news },
    { href: releasesHref, label: dict.nav.releases },
    { href: communityHref, label: dict.nav.community },
    { href: myProfileHref, label: profile?.username ? (currentLocale === "en" ? "Profile" : "Meu Perfil") : dict.nav.myAccount },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/" || href === "/en") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0e12]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl min-w-0 items-center justify-between gap-1.5 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <Link
          href={homeHref}
          className="group flex min-h-10 min-w-0 shrink items-center gap-2 sm:min-h-11 sm:shrink-0 sm:gap-2.5"
          aria-label={currentLocale === "en" ? "Go to Orange Brick home page" : "Ir para a página inicial do Orange Brick"}
        >
          <BrandLogo alt="Orange Brick" className="h-auto w-[clamp(5.5rem,28vw,9.5rem)] max-w-full transition-transform duration-300 group-hover:scale-105 sm:h-5 sm:w-auto" />
        </Link>

        {variant === "full" && (
          <div className="relative mx-4 hidden w-full max-w-xs flex-1 lg:block">
            <SearchBox key={`site-header-${searchQuery}`} initialQuery={searchQuery} compact />
          </div>
        )}

        <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5" aria-label={currentLocale === "en" ? "Main navigation" : "Navegação principal"}>
          <Link
            href={currentLocale === "en" ? "/en/busca" : "/busca"}
            aria-label={dict.common.search}
            className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-gray-300 transition-colors hover:text-white sm:min-h-11 sm:min-w-11 lg:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 sm:size-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path strokeLinecap="round" d="m16 16 5 5" />
            </svg>
          </Link>

          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`hidden min-h-11 items-center px-3 text-xs font-semibold transition-colors lg:flex ${active ? "text-brand-orange font-bold" : "text-gray-400 hover:text-white"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="flex shrink-0 items-center gap-1.5 border-l border-white/10 pl-1.5 sm:gap-2 sm:pl-2">
            <LanguageSwitcher currentLocale={currentLocale} />
            <UserNav />
          </div>
        </nav>
      </div>
    </header>
  );
}
