"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";

const items = [
  {
    href: "/",
    label: "Início",
    active: (pathname: string) => pathname === "/",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-6h6v6" />,
  },
  {
    href: "/lancamentos",
    label: "Radar",
    active: (pathname: string) => pathname.startsWith("/lancamentos"),
    icon: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M12 2v2M22 12h-2M12 22v-2M2 12h2" /></>,
  },
  {
    href: "/brickboard",
    label: "Brickboard",
    active: (pathname: string) => pathname.startsWith("/brickboard"),
    icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM4 10h16M9 5v5M15 10v5M9 15v4" /></>,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname === "/profile/setup" ||
    pathname.startsWith("/configuracoes")
  ) {
    return null;
  }

  const profileHref = user
    ? `/profile/${encodeURIComponent(profile?.username || profile?.nickname || user.email?.split("@")[0] || user.id)}`
    : "/profile/setup";
  const navigationItems = [
    ...items,
    {
      href: profileHref,
      label: user ? "Perfil" : "Entrar",
      active: (currentPath: string) => currentPath.startsWith("/profile/"),
      icon: <><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 21a7 7 0 0 1 14 0" /></>,
    },
  ];

  return (
    <>
      <div aria-hidden="true" className="h-[calc(4.75rem+env(safe-area-inset-bottom))] sm:hidden" />
      <nav
        aria-label="Navegação principal"
        className="mobile-overlay-sensitive fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#111218]/95 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {navigationItems.map((item) => {
            const isActive = item.active(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition-colors active:bg-white/[0.06] ${
                  isActive ? "text-brand-orange" : "text-[#a7a9b2]"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.7}>
                  {item.icon}
                </svg>
                <span className="max-w-full truncate">{item.label}</span>
                {isActive && <span aria-hidden="true" className="absolute top-0 h-0.5 w-6 bg-brand-orange" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
