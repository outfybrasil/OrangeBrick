import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Ranking da Temporada",
  description: "Os 100 leitores com mais XP da temporada no Brickboard. Publique, comente e reaja para subir na classificação.",
  alternates: {
    canonical: "/brickboard/ranking",
  },
};

export default function RankingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
