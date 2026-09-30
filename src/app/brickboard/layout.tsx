import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "BrickBoard — Comunidade Gamer",
    template: "%s | BrickBoard | Orange Brick",
  },
  description: "Debates em tempo real, Hype, Flop e discussões da comunidade gamer OrangeBrick.",
  alternates: {
    canonical: "/brickboard",
  },
  openGraph: {
    title: "BrickBoard — Comunidade Gamer | Orange Brick",
    description: "Debates em tempo real, Hype, Flop e discussões da comunidade gamer no OrangeBrick.",
    url: "/brickboard",
    type: "website",
  },
};

export default function BrickboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
