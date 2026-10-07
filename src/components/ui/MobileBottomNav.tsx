"use client";

import { usePathname } from "next/navigation";
import { GradientButtonGroup } from "@/components/ui/gradient-button-group";

export function MobileBottomNav() {
  const pathname = usePathname();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname === "/profile/setup" ||
    pathname.startsWith("/configuracoes")
  ) {
    return null;
  }

  const items = [
    {
      href: "/",
      label: "Início",
      active: pathname === "/",
      iconInactive: `${basePath}/icons/nav/home-inactive.png`,
      iconActive: `${basePath}/icons/nav/home-active.png`,
    },
    {
      href: "/noticias",
      label: "Notícias",
      active: pathname.startsWith("/noticias") || pathname.startsWith("/posts/"),
      iconInactive: `${basePath}/icons/nav/news-inactive.png`,
      iconActive: `${basePath}/icons/nav/news-active.png`,
    },
    {
      href: "/lancamentos",
      label: "Lançamentos",
      active: pathname.startsWith("/lancamentos") || pathname.startsWith("/games/"),
      iconInactive: `${basePath}/icons/nav/releases-inactive.png`,
      iconActive: `${basePath}/icons/nav/releases-active.png`,
    },
    {
      href: "/brickboard",
      label: "BrickBoard",
      active: pathname.startsWith("/brickboard"),
      iconInactive: `${basePath}/icons/nav/brickboard-inactive.png`,
      iconActive: `${basePath}/icons/nav/brickboard-active.png`,
    },
    {
      href: "/meu-brick",
      label: "Meu Brick",
      active: pathname.startsWith("/meu-brick") || pathname.startsWith("/profile/") || pathname.startsWith("/u/"),
      iconInactive: `${basePath}/icons/nav/profile-inactive.png`,
      iconActive: `${basePath}/icons/nav/profile-active.png`,
    },
  ];

  return (
    <>
      <div aria-hidden="true" className="h-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden watch-hidden" />
      <div
        className="mobile-overlay-sensitive fixed inset-x-0 bottom-0 z-40 px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.65rem,env(safe-area-inset-bottom))] lg:hidden watch-hidden"
      >
        <GradientButtonGroup
          ariaLabel="Navegação principal"
          items={items}
        />
      </div>
    </>
  );
}
