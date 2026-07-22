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
    id: "everquest-legends",
    game: "EverQuest Legends",
    releaseDate: "28 de Julho",
    dayOfWeek: "Terça-feira",
    platforms: ["PC"],
    image: "https://images.rpgsite.net/image/da49c9a1/167025/original/EverQuest-Legends_Logo.jpg",
    badge: "🎮 RPG",
    badgeColor: "bg-blue-600 text-white border-blue-500 shadow-lg font-bold",
    category: "week",
  },
  {
    id: "mistfall-hunter",
    game: "Mistfall Hunter",
    releaseDate: "29 de Julho",
    dayOfWeek: "Quarta-feira",
    platforms: ["PS5", "XSX", "PC"],
    image: "data:image/jpeg;base64,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",
    badge: "🎮 Ação",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-bold",
    category: "week",
  },
  {
    id: "kusan-city-of-wolves",
    game: "Kusan: City of Wolves",
    releaseDate: "30 de Julho",
    dayOfWeek: "Quinta-feira",
    platforms: ["PS5", "XSX", "SWITCH", "PC"],
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1714510/fe155e6064ff30c4998d3195f9d758a50f02fa60/capsule_616x353_alt_assets_1.jpg?t=1784555669",
    badge: "🌱 Indie",
    badgeColor: "bg-emerald-600 text-white border-emerald-500 shadow-lg font-bold",
    category: "week",
  },
  {
    id: "wolverine",
    game: "Marvel's Wolverine",
    releaseDate: "15 de Setembro",
    dayOfWeek: "Terça-feira",
    platforms: ["PS5"],
    image: "https://gameverse.com.ua/uploads/games/marvel-s-wolverine/qda4.jpg",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
    category: "upcoming",
  },
  {
    id: "starfield-dlc",
    game: "Starfield: Shattered Space",
    releaseDate: "30 de Setembro",
    dayOfWeek: "Segunda-feira",
    platforms: ["XSX", "PC"],
    image: "https://th.bing.com/th/id/OSK.Nmyh32B7CgPBu89L_IZEV_yG7iCt8cGtAAX2v2Fo7dA?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3",
    badge: "🧩 DLC / Expansão",
    badgeColor: "bg-indigo-600 text-white border-indigo-500 shadow-lg font-bold",
    category: "upcoming",
  },
  {
    id: "gears-eday",
    game: "Gears of War: E-Day",
    releaseDate: "06 de Outubro",
    dayOfWeek: "Terça-feira",
    platforms: ["XSX", "PC"],
    image: "https://www.notebookcheck.info/fileadmin/Notebooks/News/_nc5/Gears-of-War-E-Day-Gamescom.jpg",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
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
    releaseDate: "19 de Novembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PS5", "XSX"],
    image: "https://th.bing.com/th/id/OIP.CzMibmTT8C1XveJ-BJTOAQHaEK?w=328&h=184&c=7&r=0&o=7&dpr=1.1&pid=1.7&rm=3",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
    category: "upcoming",
  },
  {
    id: "witcher-expansion",
    game: "The Witcher 3: Songs of the Past",
    releaseDate: "2027",
    dayOfWeek: "CD Projekt Red",
    platforms: ["PS5", "XSX", "PC"],
    image: "https://www.cdprojekt.com/en/wp-content/uploads-en/2026/05/the-witcher-3-sop-16x9-master-image-en-1-1024x576.png",
    badge: "🧩 DLC / Expansão",
    badgeColor: "bg-indigo-600 text-white border-indigo-500 shadow-lg font-bold",
    category: "upcoming",
    slug: "the-witcher-3-expansao-songs-of-the-past-anuncio-gamescom-2026",
  },
  {
    id: "wreckreation2",
    game: "Wreckreation 2",
    releaseDate: "Sem data definida",
    dayOfWeek: "Em Breve",
    platforms: ["PS5", "XSX", "PC"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCP_EHJWV8cL1TlEcIWRiOjHaD2iwXfUjz5XPcHBk_Gg&s=10",
    badge: "🎮 Lançamento",
    badgeColor: "bg-brand-orange text-white border-brand-orange shadow-lg font-black",
    category: "upcoming",
    slug: "wreckreation-2-anunciado-criadores-burnout-ps5-xbox-pc",
  },
];

export function ReleaseRadarStrip() {
  const [filter, setFilter] = useState<"all" | "week" | "upcoming">("week");
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
              <h2 className="font-heading text-sm md:text-base font-bold text-white uppercase tracking-wider">
                Radar de Lançamentos
              </h2>
            </div>
            <p className="text-[11px] text-gray-400 font-subtitle">
              Próximos grandes jogos e novidades da semana na indústria
            </p>
          </div>
        </div>

        {/* FILTROS E CONTROLES DE NAVEGAÇÃO */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-background-void/80 p-1 rounded-xl border border-brand-orange-muted/15 font-mono text-[10px] sm:text-[11px]">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${filter === "all" ? "bg-brand-orange text-white font-bold" : "text-gray-400 hover:text-white"
                }`}
            >
              <span className="hidden xs:inline">Todos</span><span className="xs:hidden">Tudo</span>
            </button>
            <button
              onClick={() => setFilter("week")}
              className={`px-2 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${filter === "week" ? "bg-brand-orange text-white font-bold" : "text-gray-400 hover:text-white"
                }`}
            >
              <span className="hidden xs:inline">Esta Semana</span><span className="xs:hidden">Semana</span>
            </button>
            <button
              onClick={() => setFilter("upcoming")}
              className={`px-2 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${filter === "upcoming" ? "bg-brand-orange text-white font-bold" : "text-gray-400 hover:text-white"
                }`}
            >
              <span className="hidden xs:inline">Em Breve</span><span className="xs:hidden">Breve</span>
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
            <div className="group relative w-[220px] xs:w-56 sm:w-64 md:w-72 shrink-0 rounded-xl overflow-hidden border border-brand-orange-muted/15 bg-card-slate/50 hover:bg-card-slate hover:border-brand-orange/40 hover:shadow-[0_0_20px_rgba(255,94,0,0.15)] transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-1">
              <div className="relative h-24 xs:h-28 sm:h-32 w-full overflow-hidden">
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
