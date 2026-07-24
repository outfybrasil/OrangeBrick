"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/ui/Footer";
import { createDataClient } from "@/lib/supabase/client";
import { ALL_RELEASES_DATA, type ReleaseItem } from "@/components/feed/ReleaseRadarStrip";
import { isAllowedReleaseImageUrl } from "@/lib/release-images";
import type { ReleaseRadarItem } from "@/lib/types/database";

const LEGACY_RELEASES: ReleaseItem[] = [
  // --- JULHO 2026 ---
  {
    id: "splatoon-raiders",
    game: "Splatoon Raiders",
    releaseDate: "23 de Julho",
    dayOfWeek: "Quinta-feira",
    platforms: ["SWITCH 2"],
    image: "https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_1240/b_white/f_auto/q_auto/store/software/switch2/70010000122824/cf587e01f6f115398f411f280dba21e025795eb69f234a41722341ea999d170d",
    badge: "Ação",
    category: "week",
  },
  {
    id: "avatar-legends-fighting-game",
    game: "Avatar Legends: The Fighting Game",
    releaseDate: "23 de Julho",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch", "Switch 2", "PC", "PS5", "XSX"],
    image: "https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_1240/b_white/f_auto/q_auto/store/software/switch/70010000124322/9ececef2d8606f8aef67554fb23afc72dd5a505dd341eb1bc4d54011769e39be",
    badge: "Luta",
    category: "week",
  },
  {
    id: "dinoblade",
    game: "Dinoblade",
    releaseDate: "23 de Julho",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2521940/header.jpg",
    badge: "Ação",
    category: "week",
  },
  {
    id: "an-eggstremely-hard-game",
    game: "An Eggstremely Hard Game",
    releaseDate: "24 de Julho",
    dayOfWeek: "Sexta-feira",
    platforms: ["PC"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2843810/header.jpg",
    badge: "Indie",
    category: "week",
  },
  {
    id: "unbeatable",
    game: "Unbeatable",
    releaseDate: "27 de Julho",
    dayOfWeek: "Segunda-feira",
    platforms: ["SWITCH 2"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2240620/header.jpg",
    badge: "Ritmo",
    category: "week",
  },
  {
    id: "halo-campaign-evolved",
    game: "Halo: Campaign Evolved",
    releaseDate: "28 de Julho",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://rollingstone.com.br/wp-content/uploads/2025/10/halo-halo-studios-rolling-stone.jpg",
    badge: "FPS",
    category: "week",
    slug: "halo-campaign-evolved-faltam-5-dias-o-que-esperar-do-remake",
  },
  {
    id: "everquest-legends",
    game: "EverQuest Legends",
    releaseDate: "28 de Julho",
    dayOfWeek: "Terça-feira",
    platforms: ["PC"],
    image: "https://assets-cdn.daybreakgames.com/uploads/dcsclient/000/000/334/561.jpg?v=1.0",
    badge: "MMORPG",
    category: "week",
  },
  {
    id: "dispatch",
    game: "Dispatch",
    releaseDate: "29 de Julho",
    dayOfWeek: "Quarta-feira",
    platforms: ["XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2592160/header.jpg",
    badge: "Ação",
    category: "week",
  },
  {
    id: "mistfall-hunter",
    game: "Mistfall Hunter",
    releaseDate: "29 de Julho",
    dayOfWeek: "Quarta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://lf16-fe-tos.bytedgame.com/obj/g-marketing-assets-sg/2025_09_02_03_42_26/196038060061_s1652719.png",
    badge: "RPG de ação",
    category: "week",
  },
  {
    id: "the-relic-first-guardian",
    game: "The Relic: First Guardian",
    releaseDate: "31 de Julho",
    dayOfWeek: "Sexta-feira",
    platforms: ["PC", "PS5"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBlWYgmnst8CVRT7TsgL_CHwfWYXaSDcqiLZaOPsm5qklWlZkq5U2sb3g&s=10",
    badge: "RPG de ação",
    category: "week",
  },

  // --- AGOSTO 2026 ---
  {
    id: "beast-of-reincarnation",
    game: "Beast of Reincarnation",
    releaseDate: "04 de Agosto",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2904320/header.jpg",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "big-walk",
    game: "Big Walk",
    releaseDate: "04 de Agosto",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "Switch 2", "PS5"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1315800/header.jpg",
    badge: "Aventura",
    category: "upcoming",
  },
  {
    id: "marvel-tokon-fighting-souls",
    game: "Marvel Tokon: Fighting Souls",
    releaseDate: "06 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2635900/header.jpg",
    badge: "Luta",
    category: "upcoming",
  },
  {
    id: "grounded-2",
    game: "Grounded 2",
    releaseDate: "11 de Agosto",
    dayOfWeek: "Terça-feira",
    platforms: ["PS5"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/962130/header.jpg",
    badge: "Sobrevivência",
    category: "upcoming",
  },
  {
    id: "oblivion-remastered",
    game: "The Elder Scrolls IV: Oblivion Remastered",
    releaseDate: "11 de Agosto",
    dayOfWeek: "Terça-feira",
    platforms: ["SWITCH 2"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/22330/header.jpg",
    badge: "RPG",
    category: "upcoming",
  },

  // --- SETEMBRO 2026 ---
  {
    id: "wolverine",
    game: "Marvel's Wolverine",
    releaseDate: "15 de Setembro",
    dayOfWeek: "Terça-feira",
    platforms: ["PS5"],
    image: "https://gameverse.com.ua/uploads/games/marvel-s-wolverine/qda4.jpg",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "dune-awakening",
    game: "Dune: Awakening",
    releaseDate: "22 de Setembro",
    dayOfWeek: "Terça-feira",
    platforms: ["PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1172620/header.jpg",
    badge: "Sobrevivência",
    category: "upcoming",
  },

  // --- OUTUBRO 2026 ---
  {
    id: "gears-eday",
    game: "Gears of War: E-Day",
    releaseDate: "06 de Outubro",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "XSX"],
    image: "https://www.notebookcheck.info/fileadmin/Notebooks/News/_nc5/Gears-of-War-E-Day-Gamescom.jpg",
    badge: "Tiro",
    category: "upcoming",
  },
  {
    id: "cod-mw4",
    game: "Call of Duty: Modern Warfare 4",
    releaseDate: "23 de Outubro",
    dayOfWeek: "Sexta-feira",
    platforms: ["Switch 2", "PC", "PS5", "XSX"],
    image: "https://cdn.box.co.uk/magefan_blog/modern-warfare-4-main.jpg",
    badge: "FPS",
    category: "upcoming",
    slug: "call-of-duty-modern-warfare-4-beta-nintendo-switch-2-data-outubro",
  },

  // --- NOVEMBRO 2026 ---
  {
    id: "gta-6",
    game: "Grand Theft Auto VI",
    releaseDate: "19 de Novembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PS5", "XSX"],
    image: "https://th.bing.com/th/id/OIP.CzMibmTT8C1XveJ-BJTOAQHaEK?w=328&h=184&c=7&r=0&o=7&dpr=1.1&pid=1.7&rm=3",
    badge: "Ação",
    category: "upcoming",
  },
];

const INITIAL_RELEASES = [...new Map(
  [...LEGACY_RELEASES, ...ALL_RELEASES_DATA].map((item) => [item.id, item])
).values()];

function getMonthGroupKey(dateStr: string): { key: string; label: string } {
  const lower = dateStr.toLowerCase();
  if (lower.includes("janeiro")) return { key: "2026-01", label: "Janeiro de 2026" };
  if (lower.includes("fevereiro")) return { key: "2026-02", label: "Fevereiro de 2026" };
  if (lower.includes("março")) return { key: "2026-03", label: "Março de 2026" };
  if (lower.includes("abril")) return { key: "2026-04", label: "Abril de 2026" };
  if (lower.includes("maio")) return { key: "2026-05", label: "Maio de 2026" };
  if (lower.includes("junho")) return { key: "2026-06", label: "Junho de 2026" };
  if (lower.includes("julho")) return { key: "2026-07", label: "Julho de 2026" };
  if (lower.includes("agosto")) return { key: "2026-08", label: "Agosto de 2026" };
  if (lower.includes("setembro")) return { key: "2026-09", label: "Setembro de 2026" };
  if (lower.includes("outubro")) return { key: "2026-10", label: "Outubro de 2026" };
  if (lower.includes("novembro")) return { key: "2026-11", label: "Novembro de 2026" };
  if (lower.includes("dezembro")) return { key: "2026-12", label: "Dezembro de 2026" };
  return { key: "other", label: "A confirmar" };
}

function extractDayNumber(dateStr: string, isoStr?: string): number {
  if (isoStr) {
    const parts = isoStr.split("-");
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) return parsed;
    }
  }
  const match = dateStr.match(/^(\d{1,2})\s+de/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 99;
}

export function ReleasesPageClient() {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createDataClient(), []);
  const [releases, setReleases] = useState<ReleaseItem[]>(INITIAL_RELEASES);
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");

  useEffect(() => {
    queueMicrotask(async () => {
      const { data, error } = await supabase
        .from("release_radar_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error || !data || data.length === 0) return;
      const merged = new Map(INITIAL_RELEASES.map((item) => [item.id, item]));
      for (const item of data as ReleaseRadarItem[]) {
        const release: ReleaseItem = {
          id: item.id,
          game: item.game,
          releaseDate: item.release_label,
          releaseDateIso: item.release_date || undefined,
          dayOfWeek: item.schedule_label,
          platforms: item.platforms,
          image: item.image_url || "",
          badge: item.badge,
          category: item.category,
          slug: item.post_slug || undefined,
        };
        merged.set(item.id, release);
      }
      setReleases([...merged.values()]);
    });
  }, [supabase]);

  const filteredReleases = useMemo(() => {
    return releases.filter((item) => {
      if (search) {
        const query = search.toLowerCase();
        const matchesGame = item.game.toLowerCase().includes(query);
        const matchesBadge = item.badge.toLowerCase().includes(query);
        if (!matchesGame && !matchesBadge) return false;
      }
      if (selectedPlatform !== "all") {
        const hasPlatform = item.platforms.some((p) =>
          p.toLowerCase().includes(selectedPlatform.toLowerCase())
        );
        if (!hasPlatform) return false;
      }
      return true;
    });
  }, [releases, search, selectedPlatform]);

  const groupedReleases = useMemo(() => {
    const groups = new Map<string, { label: string; items: ReleaseItem[] }>();
    for (const item of filteredReleases) {
      const month = getMonthGroupKey(item.releaseDate);
      const group = groups.get(month.key) || { label: month.label, items: [] };
      group.items.push(item);
      groups.set(month.key, group);
    }
    return [...groups.entries()]
      .map(([key, group]) => ({
        key,
        ...group,
        items: group.items.sort((first, second) => {
          const dayA = extractDayNumber(first.releaseDate, first.releaseDateIso);
          const dayB = extractDayNumber(second.releaseDate, second.releaseDateIso);
          if (dayA !== dayB) return dayA - dayB;
          return first.game.localeCompare(second.game, "pt-BR");
        }),
      }))
      .sort((first, second) => {
        if (first.key === "other") return 1;
        if (second.key === "other") return -1;
        return first.key.localeCompare(second.key);
      });
  }, [filteredReleases]);

  return (
    <div className="min-h-dvh bg-background-void text-white">
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-card-slate/30 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 transition-colors hover:text-white"
          >
            ← Voltar para a Home
          </button>
          <Link href="/" className="group flex items-center gap-2">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick"
              style={{ maxHeight: "32px", maxWidth: "44px", width: "auto", height: "auto" }}
              className="h-7 sm:h-8 w-auto max-h-8 max-w-11 object-contain transform group-hover:scale-105 transition-transform duration-200 shrink-0"
            />
            <span className="font-heading text-base sm:text-lg font-black tracking-wider text-white uppercase group-hover:text-brand-orange transition-colors whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <div className="border-b border-white/10 bg-card-slate/10 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-brand-orange">
            Calendário de Games 2026
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Lançamentos <span className="text-brand-orange">Oficiais</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
            Agenda completa dos principais jogos confirmados para PlayStation, Xbox, Nintendo Switch, Switch 2 e PC em 2026.
          </p>

          {/* Filtros e Busca */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Buscar por nome do jogo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-background-void px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-brand-orange focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                ["all", "Todas as plataformas"],
                ["ps5", "PS5"],
                ["xsx", "Xbox Series"],
                ["switch", "Nintendo"],
                ["pc", "PC"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPlatform(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    selectedPlatform === key
                      ? "bg-brand-orange text-white"
                      : "border border-white/10 bg-card-slate/40 text-gray-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grade Principal de Lançamentos */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {groupedReleases.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm font-mono text-gray-400">Nenhum jogo encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedReleases.map((group) => (
              <section key={group.key} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                  <span className="h-6 w-2.5 rounded-full bg-brand-orange shadow-[0_0_12px_#FF5E00]" />
                  <h2 className="font-heading text-xl font-black uppercase text-white sm:text-2xl">
                    {group.label}
                  </h2>
                  <span className="ml-auto text-xs font-mono text-gray-500">
                    {group.items.length} {group.items.length === 1 ? "lançamento" : "lançamentos"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className="group flex flex-col overflow-hidden border border-white/10 bg-background-void transition-colors hover:border-brand-orange/40 hover:bg-white/[0.025]"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-[#0C0D11]">
                        {isAllowedReleaseImageUrl(item.image) ? (
                          <img
                            src={item.image}
                            alt={item.game}
                            className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center">
                            <span className="text-xs font-semibold text-gray-500">Capa pendente</span>
                          </div>
                        )}
                        <span className="absolute right-2 top-2 z-10 border-b-2 border-brand-orange bg-black/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md">
                          {item.badge}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <div className="mb-2 flex items-baseline justify-between gap-2">
                            <time className="text-xs font-black uppercase text-brand-orange">
                              {item.releaseDate}
                            </time>
                            <span className="text-[10px] font-semibold text-gray-500">
                              {item.dayOfWeek}
                            </span>
                          </div>
                          <h3 className="font-heading text-sm font-extrabold leading-tight text-white transition-colors group-hover:text-brand-orange sm:text-base line-clamp-2">
                            {item.game}
                          </h3>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-2 border-t border-white/[0.08] pt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">
                            {item.platforms.join(" · ")}
                          </p>
                          {item.slug ? (
                            <Link
                              href={`/posts/${item.slug}`}
                              className="shrink-0 text-[10px] font-bold text-brand-orange hover:underline"
                            >
                              Ver matéria →
                            </Link>
                          ) : (
                            <span className="shrink-0 text-[10px] font-bold text-gray-500">
                              Confirmado
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
