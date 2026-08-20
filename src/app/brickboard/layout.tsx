import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Brickboard — Comunidade Gamer | Orange Brick",
    template: "%s | Brickboard — Orange Brick",
  },
  description: "Fórum, debates em tempo real e discussões gamer. Compartilhe opiniões, reaja a notícias e suba de nível na comunidade Orange Brick.",
  alternates: {
    canonical: "/brickboard",
  },
  openGraph: {
    title: "Brickboard — Comunidade Gamer | Orange Brick",
    description: "Fórum, debates e discussões gamer no Orange Brick.",
    url: "/brickboard",
    type: "website",
  },
};

export default function BrickboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
