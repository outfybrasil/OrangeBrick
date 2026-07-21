"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface ReleaseItem {
  id: string;
  game: string;
  releaseDate: string;
  dayOfWeek: string;
  platforms: string[];
  image: string;
  badge: string;
  badgeColor: string;
  category: "week" | "upcoming";
  slug?: string;
}

const RELEASES_DATA: ReleaseItem[] = [
  {
    id: "halo-remake",
    game: "Halo: Campaign Evolved Remake",
    releaseDate: "28 de Julho",
    dayOfWeek: "Terça-feira",
    platforms: ["PS5", "XSX", "PC"],
    image: "https://tse1.mm.bing.net/th/id/OIP._lJ3B-EBlyzRd4O4PUICqAHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
    category: "week",
    slug: "halo-campaign-evolved-faltam-5-dias-o-que-esperar-do-remake",
  },
  {
    id: "wreckreation2",
    game: "Wreckreation 2",
    releaseDate: "Agosto de 2026",
    dayOfWeek: "Em Breve",
    platforms: ["PS5", "XSX", "PC"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCP_EHJWV8cL1TlEcIWRiOjHaD2iwXfUjz5XPcHBk_Gg&s=10",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
    category: "week",
    slug: "wreckreation-2-anunciado-criadores-burnout-ps5-xbox-pc",
  },
  {
    id: "witcher-expansion",
    game: "The Witcher 3: Songs of the Past",
    releaseDate: "25 de Agosto",
    dayOfWeek: "Gamescom 2026",
    platforms: ["PS5", "XSX", "PC"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSantGXWhGBacKuvbtuvPgF29D31JzaB1QzBMWnPkAJoA&s=10",
    badge: "🧩 DLC / Expansão",
    badgeColor: "bg-indigo-600 text-white border-indigo-500 shadow-lg font-bold",
    category: "upcoming",
    slug: "the-witcher-3-expansao-songs-of-the-past-anuncio-gamescom-2026",
  },
  {
    id: "starfield-dlc",
    game: "Starfield: Shattered Space",
    releaseDate: "06 de Outubro",
    dayOfWeek: "Terça-feira",
    platforms: ["XSX", "PC"],
    image: "https://th.bing.com/th/id/OSK.Nmyh32B7CgPBu89L_IZEV_yG7iCt8cGtAAX2v2Fo7dA?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3",
    badge: "🧩 DLC / Expansão",
    badgeColor: "bg-indigo-600 text-white border-indigo-500 shadow-lg font-bold",
    category: "upcoming",
  },
  {
    id: "cod-mw4",
    game: "Call of Duty: Modern Warfare 4",
    releaseDate: "23 de Outubro",
    dayOfWeek: "Sexta-feira",
    platforms: ["PS5", "XSX", "PC", "SWITCH 2"],
    image: "https://cdn.box.co.uk/magefan_blog/modern-warfare-4-main.jpg",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
    category: "upcoming",
    slug: "call-of-duty-modern-warfare-4-beta-nintendo-switch-2-data-outubro",
  },
  {
    id: "gta-6",
    game: "Grand Theft Auto VI",
    releaseDate: "Novembro de 2026",
    dayOfWeek: "Em Breve",
    platforms: ["PS5", "XSX"],
    image: "https://th.bing.com/th/id/OIP.CzMibmTT8C1XveJ-BJTOAQHaEK?w=328&h=184&c=7&r=0&o=7&dpr=1.1&pid=1.7&rm=3",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
    category: "upcoming",
  },
  {
    id: "wolverine",
    game: "Marvel's Wolverine",
    releaseDate: "Dezembro de 2026",
    dayOfWeek: "Em Breve",
    platforms: ["PS5"],
    image: "https://gameverse.com.ua/uploads/games/marvel-s-wolverine/qda4.jpg",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
    category: "upcoming",
  },
];

export function ReleaseRadarStrip() {
  const [filter, setFilter] = useState<"all" | "week" | "upcoming">("all");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredReleases = RELEASES_DATA.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -320 : 320;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section className="w-full mb-8 bg-card-slate/25 border border-brand-orange-muted/15 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER DO RADAR (ESTILO OPERA GX) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-brand-orange-muted/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange font-bold text-sm shadow-[0_0_10px_rgba(255,94,0,0.2)]">
            🗓️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-sm md:text-base font-bold text-white uppercase tracking-wider">
                Radar de Lançamentos
              </h2>
              <span className="text-[9px] font-mono text-brand-orange uppercase tracking-widest bg-brand-orange/10 border border-brand-orange/30 px-2 py-0.5 rounded">
                Opera GX Style
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              Próximos grandes jogos e novidades da semana na indústria
            </p>
          </div>
        </div>

        {/* FILTROS E CONTROLES DE NAVEGAÇÃO */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1 bg-background-void/80 p-1 rounded-xl border border-brand-orange-muted/15 font-mono text-[11px]">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filter === "all" ? "bg-brand-orange text-white font-bold" : "text-gray-400 hover:text-white"
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("week")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filter === "week" ? "bg-brand-orange text-white font-bold" : "text-gray-400 hover:text-white"
                }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setFilter("upcoming")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filter === "upcoming" ? "bg-brand-orange text-white font-bold" : "text-gray-400 hover:text-white"
                }`}
            >
              Em Breve
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScroll("left")}
              className="w-8 h-8 rounded-lg bg-card-slate border border-brand-orange-muted/20 hover:border-brand-orange/40 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Rolar para esquerda"
            >
              ‹
            </button>
            <button
              onClick={() => handleScroll("right")}
              className="w-8 h-8 rounded-lg bg-card-slate border border-brand-orange-muted/20 hover:border-brand-orange/40 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Rolar para direita"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* FAIXA HORIZONTAL DE CARDS (SCROLL STRIP) */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-4 overflow-x-auto scrollbar-none pb-2 pt-1"
      >
        {filteredReleases.map((item) => {
          const CardContent = (
            <div className="group relative w-64 md:w-72 shrink-0 rounded-xl overflow-hidden border border-brand-orange-muted/15 bg-card-slate/50 hover:bg-card-slate hover:border-brand-orange/40 hover:shadow-[0_0_20px_rgba(255,94,0,0.15)] transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-1">
              <div className="relative h-32 w-full overflow-hidden">
                <img
                  src={item.image}
                  alt={item.game}
                  className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card-slate via-card-slate/40 to-transparent" />

                <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 drop-shadow-md">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-brand-orange font-bold uppercase tracking-wider mb-1">
                    <span>{item.releaseDate}</span>
                    <span className="text-gray-400 font-normal">{item.dayOfWeek}</span>
                  </div>
                  <h3 className="font-mono text-xs md:text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-brand-orange transition-colors">
                    {item.game}
                  </h3>
                </div>

                <div className="pt-2 border-t border-brand-orange-muted/10 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {item.platforms.map((plat) => (
                      <span
                        key={plat}
                        className="text-[9px] font-mono font-bold uppercase text-gray-300 bg-background-void/80 border border-brand-orange-muted/15 px-1.5 py-0.5 rounded"
                      >
                        {plat}
                      </span>
                    ))}
                  </div>

                  <span className="text-[10px] font-mono text-brand-orange font-bold group-hover:translate-x-1 transition-transform">
                    {item.slug ? "Ver post →" : "Detalhes"}
                  </span>
                </div>
              </div>
            </div>
          );

          if (item.slug) {
            return (
              <Link key={item.id} href={`/posts/${item.slug}`}>
                {CardContent}
              </Link>
            );
          }

          return <div key={item.id}>{CardContent}</div>;
        })}
      </div>
    </section>
  );
}
