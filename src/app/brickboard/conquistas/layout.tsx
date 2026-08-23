import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Conquistas",
  description: "Todas as conquistas do Brickboard: marque sua história na comunidade com contribuições reais — sem atalho, compra ou sorteio.",
  alternates: {
    canonical: "/brickboard/conquistas",
  },
};

export default function AchievementsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
