import { Metadata } from "next";
import { ReleasesPageClient } from "./ReleasesPageClient";

export const metadata: Metadata = {
  title: "Calendário de Lançamentos de Jogos 2026 — Orange Brick",
  description: "Agenda completa de lançamentos de jogos para PlayStation 5, Xbox Series X/S, Nintendo Switch, Switch 2 e PC em 2026.",
  openGraph: {
    title: "Calendário de Lançamentos de Jogos 2026 — Orange Brick",
    description: "Agenda completa de lançamentos de jogos em 2026 organizados por mês e plataforma.",
  },
};

export default function LancamentosPage() {
  return <ReleasesPageClient />;
}
