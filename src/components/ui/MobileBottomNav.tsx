"use client";

import { usePathname } from "next/navigation";
import { GradientButtonGroup } from "@/components/ui/gradient-button-group";
import { useAuth } from "@/lib/contexts/AuthContext";

const items = [
  {
    href: "/",
    label: "Início",
    active: (pathname: string) => pathname === "/",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-6h6v6" />,
  },
  {
    href: "/noticias",
    label: "Notícias",
    active: (pathname: string) => pathname.startsWith("/noticias") || pathname.startsWith("/posts/"),
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 11h16M4 16h10" />,
  },
  {
    href: "/lancamentos",
    label: "Lançamentos",
    active: (pathname: string) => pathname.startsWith("/lancamentos"),
    icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M4 10h16M5 6h14a1 1 0 0 1 1 1v13H4V7a1 1 0 0 1 1-1Z" /><path strokeLinecap="round" strokeLinejoin="round" d="m10.5 14.5 1.5 1.5 2.5-2.5" /></>,
  },
  {
    href: "/brickboard",
    label: "Brickboard",
    active: (pathname: string) => pathname.startsWith("/brickboard"),
    icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM4 10h16M9 5v5M15 10v5M9 15v4" /></>,
  },
  {
    href: "/minha-orange",
    label: "Meu Brick",
    active: (pathname: string) => pathname.startsWith("/minha-orange") || (pathname.startsWith("/profile/") && pathname !== "/profile/setup"),
    icon: <><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 21a7 7 0 0 1 14 0" /></>,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const myBrickHref = profile?.username ? `/profile/${encodeURIComponent(profile.username)}` : "/minha-orange";

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname === "/profile/setup" ||
    pathname.startsWith("/configuracoes")
  ) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="h-[calc(5.5rem+env(safe-area-inset-bottom))] sm:hidden watch-hidden" />
      <div
        className="mobile-overlay-sensitive fixed inset-x-0 bottom-0 z-40 px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:hidden watch-hidden"
      >
        <GradientButtonGroup
          ariaLabel="Navegação principal"
          items={items.map((item) => ({
            href: item.label === "Meu Brick" ? myBrickHref : item.href,
            label: item.label,
            active: item.active(pathname),
            icon: (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={item.active(pathname) ? 2.2 : 1.7}>
                {item.icon}
              </svg>
            ),
          }))}
        />
      </div>
    </>
  );
}
