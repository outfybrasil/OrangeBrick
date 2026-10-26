import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "BrickBoard — Gamer Community",
    template: "%s | BrickBoard | Orange Brick",
  },
  description: "Real-time gaming debates, Hype, Flop, and community discussions from Orange Brick.",
  alternates: {
    canonical: "/en/brickboard",
    languages: {
      "pt-BR": "/brickboard",
      "en-US": "/en/brickboard",
    },
  },
  openGraph: {
    title: "BrickBoard — Gamer Community | Orange Brick",
    description: "Real-time gaming debates, Hype, Flop, and gamer community discussions on Orange Brick.",
    url: "/en/brickboard",
    type: "website",
    locale: "en_US",
  },
};

export default function EnglishBrickboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
