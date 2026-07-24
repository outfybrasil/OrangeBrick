"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { isAllowedReleaseImageUrl } from "@/lib/release-images";
import type { ReleaseRadarItem } from "@/lib/types/database";

export interface ReleaseItem {
  id: string;
  game: string;
  releaseDate: string;
  releaseDateIso?: string;
  dayOfWeek: string;
  platforms: string[];
  image: string;
  badge: string;
  category: "week" | "upcoming";
  slug?: string;
}

export const ALL_RELEASES_DATA: ReleaseItem[] = [
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
    image: "https://cdn.mos.cms.futurecdn.net/PhMXTRmhcCmTHYYrtPzst-1920-80.jpg",
    badge: "Ação",
    category: "week",
  },
  {
    id: "an-eggstremely-hard-game",
    game: "An Eggstremely Hard Game",
    releaseDate: "24 de Julho",
    dayOfWeek: "Sexta-feira",
    platforms: ["PC"],
    image: "https://img.itch.zone/aW1nLzI0MzYxNTUxLnBuZw==/original/q99GWV.png",
    badge: "Indie",
    category: "week",
  },
  {
    id: "unbeatable",
    game: "Unbeatable",
    releaseDate: "27 de Julho",
    dayOfWeek: "Segunda-feira",
    platforms: ["SWITCH 2"],
    image: "https://www.unbeatablegame.com/unbeatable.jpg",
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
    image: "https://xboxwire.thesourcemediaassets.com/sites/2/2026/03/Dispatch-Hero-02aea826b2c62c2e37fa.jpg",
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
    image: "https://blog.playstation.com/tachyon/2025/12/e38e78bb713d998af2c48202e3d5ad9f799b89c3-scaled.jpg",
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
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202602/1300/d14826b1fb3d85ca04a986caeb9372a05d5431c7b20481e5.png",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "big-walk",
    game: "Big Walk",
    releaseDate: "04 de Agosto",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "Switch 2", "PS5"],
    image: "https://blog.playstation.com/tachyon/2024/12/f0d8193250995d523868bc134864dd7471e71d95.jpg",
    badge: "Aventura",
    category: "upcoming",
  },
  {
    id: "marvel-tokon-fighting-souls",
    game: "Marvel Tokon: Fighting Souls",
    releaseDate: "06 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5"],
    image: "https://blog.playstation.com/tachyon/2026/02/0d83e0175f979a2356ea38106bc8c8a6c209a935.jpg",
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
  {
    id: "agent-64",
    game: "Agent 64: Spies Never Die",
    releaseDate: "11 de Agosto",
    dayOfWeek: "Terça-feira",
    platforms: ["PC"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1577230/header.jpg",
    badge: "FPS",
    category: "upcoming",
  },
  {
    id: "akatori",
    game: "Akatori",
    releaseDate: "12 de Agosto",
    dayOfWeek: "Quarta-feira",
    platforms: ["PS4", "PS5", "Xbox One", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1442520/header.jpg",
    badge: "Metroidvania",
    category: "upcoming",
  },
  {
    id: "duskfade",
    game: "Duskfade",
    releaseDate: "13 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch 2", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2765400/header.jpg",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "rivage",
    game: "Rivage",
    releaseDate: "13 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2543000/header.jpg",
    badge: "Aventura",
    category: "upcoming",
  },
  {
    id: "hell-let-loose-vietnam",
    game: "Hell Let Loose: Vietnam",
    releaseDate: "13 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1058200/header.jpg",
    badge: "FPS",
    category: "upcoming",
  },
  {
    id: "wild-blue-skies",
    game: "Wild Blue Skies",
    releaseDate: "13 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2410000/header.jpg",
    badge: "Simulação",
    category: "upcoming",
  },
  {
    id: "low-budget-repairs",
    game: "Low-Budget Repairs",
    releaseDate: "13 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2693890/header.jpg",
    badge: "Simulação",
    category: "upcoming",
  },
  {
    id: "the-sinking-city-2",
    game: "The Sinking City 2",
    releaseDate: "18 de Agosto",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202606/0514/ac22f400d84c66b01304ef60b021366b2470a9328127da5e.jpg",
    badge: "Terror",
    category: "upcoming",
  },
  {
    id: "reka",
    game: "Reka",
    releaseDate: "18 de Agosto",
    dayOfWeek: "Terça-feira",
    platforms: ["PC"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1737870/header.jpg",
    badge: "Aventura",
    category: "upcoming",
  },
  {
    id: "mortal-shell-2",
    game: "Mortal Shell II",
    releaseDate: "20 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://assets-mortalshell2.lon1.cdn.digitaloceanspaces.com/2d35bbdf59a6c1dd3368d0ce5758aa4f.png",
    badge: "Soulslike",
    category: "upcoming",
  },
  {
    id: "the-witchs-bakery",
    game: "The Witch's Bakery",
    releaseDate: "20 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch", "Switch 2", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2168390/header.jpg",
    badge: "Simulação",
    category: "upcoming",
  },
  {
    id: "resonance-plague-tale",
    game: "Resonance: A Plague Tale Legacy",
    releaseDate: "27 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1523620/header.jpg",
    badge: "Aventura",
    category: "upcoming",
  },
  {
    id: "star-wars-zero-company",
    game: "Star Wars Zero Company",
    releaseDate: "27 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2765300/header.jpg",
    badge: "Estratégia",
    category: "upcoming",
  },
  {
    id: "mgs-master-collection-vol2",
    game: "Metal Gear Solid Master Collection: Volume 2",
    releaseDate: "27 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch", "Switch 2", "PC", "PS5", "XSX"],
    image: "https://blog.playstation.com/tachyon/2026/02/907574ca511f747f092d00e63af1e738bbcbd13f.png",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "lous-lagoon",
    game: "Lou's Lagoon",
    releaseDate: "27 de Agosto",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch", "PC", "PS5", "XSX"],
    image: "https://blog.playstation.com/tachyon/2026/07/e6f0585217ec2da6aa7e8ff5b43ed77a54249ef6.jpg",
    badge: "Aventura",
    category: "upcoming",
  },

  // --- SETEMBRO 2026 ---
  {
    id: "blood-of-dawnwalker",
    game: "The Blood of Dawnwalker",
    releaseDate: "03 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://blog.playstation.com/tachyon/2028/04/6dd5f55af17c0f75a5da2c591289dcfc350f07f0.jpg",
    badge: "RPG",
    category: "upcoming",
  },
  {
    id: "orbitals",
    game: "Orbitals",
    releaseDate: "03 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["SWITCH 2"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2415000/header.jpg",
    badge: "Estratégia",
    category: "upcoming",
  },
  {
    id: "onimusha-way-of-the-sword",
    game: "Onimusha: Way of the Sword",
    releaseDate: "25 de Setembro",
    dayOfWeek: "Sexta-feira",
    platforms: ["Switch 2", "PC", "PS5", "XSX"],
    image: "https://blog.playstation.com/tachyon/2026/06/1d8c87b7a3739efaeae001ec21dc89c6a99a03c2.jpg",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "wheelmates",
    game: "WheelMates",
    releaseDate: "07 de Setembro",
    dayOfWeek: "Segunda-feira",
    platforms: ["PC"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2619000/header.jpg",
    badge: "Corrida",
    category: "upcoming",
  },
  {
    id: "halloween-the-game",
    game: "Halloween: The Game",
    releaseDate: "08 de Setembro",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://blog.playstation.com/tachyon/2025/09/7c59f44e2039206f0fc6a52d98a6bcb65a6b7fca.jpg",
    badge: "Terror",
    category: "upcoming",
  },
  {
    id: "screenbound",
    game: "Screenbound",
    releaseDate: "10 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2864000/header.jpg",
    badge: "Plataforma",
    category: "upcoming",
  },
  {
    id: "brokenlore-dont-lie",
    game: "BrokenLore: Don't Lie",
    releaseDate: "10 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2930000/header.jpg",
    badge: "Terror",
    category: "upcoming",
  },
  {
    id: "wolverine",
    game: "Marvel's Wolverine",
    releaseDate: "15 de Setembro",
    dayOfWeek: "Terça-feira",
    platforms: ["PS5"],
    image: "https://blog.playstation.com/tachyon/2026/07/64aab9113b761b758ab61bf8efd60337f9b2bffa.jpg",
    badge: "Lançamento",
    category: "upcoming",
  },
  {
    id: "fire-emblem-fortunes-weave",
    game: "Fire Emblem: Fortune's Weave",
    releaseDate: "17 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["SWITCH 2"],
    image: "https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_1.5/ncom/My%20Nintendo%20Store/EN-US/Nintendo%20Switch%202/Software/Fire%20Emblem%20Fortune%27s%20Weave/125688-nintendo-switch-2-fire-emblem-fortunes-weave-2000x2000",
    badge: "RPG Tático",
    category: "upcoming",
  },
  {
    id: "dawn-of-war-4",
    game: "Warhammer 40,000: Dawn of War IV",
    releaseDate: "17 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2850000/header.jpg",
    badge: "Estratégia",
    category: "upcoming",
  },
  {
    id: "trails-in-the-sky-2nd",
    game: "Trails in the Sky 2nd Chapter",
    releaseDate: "17 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch", "Switch 2", "PC", "PS5"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/251150/header.jpg",
    badge: "RPG",
    category: "upcoming",
  },
  {
    id: "lego-batman-dark-knight",
    game: "LEGO Batman: Legacy of the Dark Knight",
    releaseDate: "18 de Setembro",
    dayOfWeek: "Sexta-feira",
    platforms: ["SWITCH 2"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/213330/header.jpg",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "paperhead",
    game: "Paperhead",
    releaseDate: "18 de Setembro",
    dayOfWeek: "Sexta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2800000/header.jpg",
    badge: "FPS",
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
  {
    id: "control-resonant",
    game: "Control Resonant",
    releaseDate: "24 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://blog.playstation.com/tachyon/2026/06/135d0ebe1e1ae2548ff2def7fb0870108116192d.jpg",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "hell-is-us",
    game: "Hell is Us",
    releaseDate: "24 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["SWITCH 2"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1630330/header.jpg",
    badge: "Ação",
    category: "upcoming",
  },
  {
    id: "silent-hill-townfall",
    game: "Silent Hill: Townfall",
    releaseDate: "24 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5"],
    image: "https://blog.playstation.com/tachyon/2026/06/d86a7dc035f1d019e05b02b9af2c5946bf406659.jpg",
    badge: "Terror",
    category: "upcoming",
  },
  {
    id: "hot-wheels-infinite-rush",
    game: "Hot Wheels Infinite Rush",
    releaseDate: "24 de Setembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch 2", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1660000/header.jpg",
    badge: "Corrida",
    category: "upcoming",
  },
  {
    id: "nivalis-nights",
    game: "Nivalis Nights",
    releaseDate: "29 de Setembro",
    dayOfWeek: "Terça-feira",
    platforms: ["PC"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1488490/header.jpg",
    badge: "Simulação",
    category: "upcoming",
  },
  {
    id: "minecraft-dungeons-2",
    game: "Minecraft Dungeons II",
    releaseDate: "29 de Setembro",
    dayOfWeek: "Terça-feira",
    platforms: ["Switch", "Switch 2", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1672970/header.jpg",
    badge: "Ação",
    category: "upcoming",
  },

  // --- OUTUBRO 2026 ---
  {
    id: "end-of-abyss",
    game: "End of Abyss",
    releaseDate: "01 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2754000/header.jpg",
    badge: "Terror",
    category: "upcoming",
  },
  {
    id: "rayman-legends-retold",
    game: "Rayman Legends Retold",
    releaseDate: "01 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch 2", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/242550/header.jpg",
    badge: "Plataforma",
    category: "upcoming",
  },
  {
    id: "dynasty-warriors-3-remastered",
    game: "Dynasty Warriors 3: Complete Edition Remastered",
    releaseDate: "01 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PS5"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2500000/header.jpg",
    badge: "Musou",
    category: "upcoming",
  },
  {
    id: "ace-combat-8",
    game: "Ace Combat 8: Wings of Theve",
    releaseDate: "02 de Outubro",
    dayOfWeek: "Sexta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://blog.playstation.com/tachyon/2026/06/66da9a630ae2251abc0ce07e6a0b6cf463da61cc.jpg",
    badge: "Simulação",
    category: "upcoming",
  },
  {
    id: "gears-eday",
    game: "Gears of War: E-Day",
    releaseDate: "06 de Outubro",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "XSX"],
    image: "https://xboxwire.thesourcemediaassets.com/sites/2/2026/06/Gears-f783604b4900f089e04e-1024x576.jpg",
    badge: "Tiro",
    category: "upcoming",
  },
  {
    id: "star-wars-galactic-racer",
    game: "Star Wars: Galactic Racer",
    releaseDate: "06 de Outubro",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2700000/header.jpg",
    badge: "Corrida",
    category: "upcoming",
  },
  {
    id: "epic-mickey-rebrushed",
    game: "Epic Mickey: Rebrushed",
    releaseDate: "06 de Outubro",
    dayOfWeek: "Terça-feira",
    platforms: ["SWITCH 2"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1522780/header.jpg",
    badge: "Plataforma",
    category: "upcoming",
  },
  {
    id: "clive-barkers-hellraiser",
    game: "Clive Barker's Hellraiser: Revival",
    releaseDate: "08 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2840000/header.jpg",
    badge: "Terror",
    category: "upcoming",
  },
  {
    id: "silver-pines",
    game: "Silver Pines",
    releaseDate: "08 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2520000/header.jpg",
    badge: "Aventura",
    category: "upcoming",
  },
  {
    id: "forever-ago",
    game: "Forever Ago",
    releaseDate: "08 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch 2", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1311090/header.jpg",
    badge: "Aventura",
    category: "upcoming",
  },
  {
    id: "kingdom-hearts-hd-28",
    game: "Kingdom Hearts HD 2.8 Final Chapter Prologue",
    releaseDate: "08 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch 2", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2552430/header.jpg",
    badge: "RPG",
    category: "upcoming",
  },
  {
    id: "dragons-dogma-2-switch2",
    game: "Dragon's Dogma II",
    releaseDate: "09 de Outubro",
    dayOfWeek: "Sexta-feira",
    platforms: ["SWITCH 2"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2054970/header.jpg",
    badge: "RPG",
    category: "upcoming",
  },
  {
    id: "valor-mortis",
    game: "Valor Mortis",
    releaseDate: "13 de Outubro",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2740000/header.jpg",
    badge: "FPS",
    category: "upcoming",
  },
  {
    id: "planet-zoo-2",
    game: "Planet Zoo 2",
    releaseDate: "13 de Outubro",
    dayOfWeek: "Terça-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/703080/header.jpg",
    badge: "Simulação",
    category: "upcoming",
  },
  {
    id: "castlevania-belmonts-curse",
    game: "Castlevania: Belmont's Curse",
    releaseDate: "15 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1980000/header.jpg",
    badge: "Metroidvania",
    category: "upcoming",
  },
  {
    id: "tenebris-somnia",
    game: "Tenebris Somnia",
    releaseDate: "16 de Outubro",
    dayOfWeek: "Sexta-feira",
    platforms: ["Switch", "Switch 2", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2121550/header.jpg",
    badge: "Terror",
    category: "upcoming",
  },
  {
    id: "final-fantasy-resonance",
    game: "Final Fantasy Resonance",
    releaseDate: "22 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["Switch", "Switch 2", "PC", "PS5", "XSX"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1492070/header.jpg",
    badge: "RPG",
    category: "upcoming",
  },
  {
    id: "nintendo-switch-sports-resort",
    game: "Nintendo Switch Sports Resort",
    releaseDate: "22 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["SWITCH 2"],
    image: "https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_1240/b_white/f_auto/q_auto/store/software/switch/70010000048450/nss_hero",
    badge: "Esportes",
    category: "upcoming",
  },
  {
    id: "cod-mw4",
    game: "Call of Duty: Modern Warfare 4",
    releaseDate: "23 de Outubro",
    dayOfWeek: "Sexta-feira",
    platforms: ["Switch 2", "PC", "PS5", "XSX"],
    image: "https://blog.playstation.com/tachyon/2028/05/898360a33ff3150179a7f1fd9dd4a3f4e90f680e-scaled.png",
    badge: "FPS",
    category: "upcoming",
    slug: "call-of-duty-modern-warfare-4-beta-nintendo-switch-2-data-outubro",
  },
  {
    id: "phantom-blade-0",
    game: "Phantom Blade 0",
    releaseDate: "29 de Outubro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PC", "PS5"],
    image: "https://blog.playstation.com/tachyon/2026/06/c5d7a536df29921a90d83d34c8306a3c0b314421-scaled.jpg",
    badge: "Ação",
    category: "upcoming",
  },

  // --- NOVEMBRO 2026 ---
  {
    id: "lord-of-mysteries",
    game: "Lord of Mysteries",
    releaseDate: "01 de Novembro",
    dayOfWeek: "Domingo",
    platforms: ["Mobile"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2850000/header.jpg",
    badge: "RPG",
    category: "upcoming",
  },
  {
    id: "metaphor-refantazio-switch2",
    game: "Metaphor: ReFantazio",
    releaseDate: "12 de Novembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["SWITCH 2"],
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2677840/header.jpg",
    badge: "RPG",
    category: "upcoming",
  },
  {
    id: "gta-6",
    game: "Grand Theft Auto VI",
    releaseDate: "19 de Novembro",
    dayOfWeek: "Quinta-feira",
    platforms: ["PS5", "XSX"],
    image: "https://www.rockstargames.com/VI/_next/static/media/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg?akim=1&imdensity=1&imwidth=3840",
    badge: "Lançamento",
    category: "upcoming",
  },
];

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

function releaseDateValue(item: ReleaseItem) {
  if (item.releaseDateIso) return new Date(`${item.releaseDateIso}T12:00:00Z`);
  const match = item.releaseDate.toLowerCase().match(/^(\d{1,2}) de ([a-zç]+)/);
  if (!match || MONTHS[match[2]] === undefined) return null;
  return new Date(Date.UTC(2026, MONTHS[match[2]], Number(match[1]), 12));
}

function getWeekGroup(item: ReleaseItem): { key: string; label: string } {
  const date = releaseDateValue(item);
  if (!date) return { key: "sem-data", label: "Sem data definida" };
  const monday = new Date(date);
  const weekday = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - weekday + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const format = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
  return {
    key: monday.toISOString().slice(0, 10),
    label: `${format.format(monday)} a ${format.format(sunday)}`,
  };
}

export function ReleaseRadarStrip() {
  const supabase = useMemo(() => createDataClient(), []);
  const [releases, setReleases] = useState<ReleaseItem[]>(
    ALL_RELEASES_DATA
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      const { data, error } = await supabase
        .from("release_radar_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error || !data || data.length === 0) return;
      const databaseItems = (data as ReleaseRadarItem[]).map((item) => ({
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
      }));
      const merged = new Map(
        ALL_RELEASES_DATA.map((item) => [item.id, item])
      );
      for (const item of databaseItems) {
        merged.set(item.id, item);
      }
      setReleases([...merged.values()].sort((a, b) => {
        const first = releaseDateValue(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const second = releaseDateValue(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return first - second || a.game.localeCompare(b.game, "pt-BR");
      }));
    });
  }, [supabase]);

  const currentMonthReleases = useMemo(() => {
    const currentDate = new Date();
    return releases.filter((item) => {
      const date = releaseDateValue(item);
      return date?.getUTCFullYear() === currentDate.getFullYear()
        && date.getUTCMonth() === currentDate.getMonth();
    });
  }, [releases]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -360 : 360;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section className="mb-8 w-full" aria-labelledby="release-radar-title">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center justify-between gap-4">
            <p className="mb-1 text-xs font-bold text-brand-orange">Agenda de jogos</p>
            <Link
              href="/lancamentos"
              className="text-xs font-bold text-brand-orange hover:underline sm:hidden"
            >
              Ver todos →
            </Link>
          </div>
          <h2 id="release-radar-title" className="font-heading text-2xl font-black tracking-[-0.025em] text-white sm:text-3xl">
            Radar de lançamentos
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm">
            Todos os jogos previstos para este mês.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Link
            href="/lancamentos"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3.5 py-2 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
          >
            Ver calendário completo <span aria-hidden="true">→</span>
          </Link>

          <div className="hidden items-center sm:flex">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              className="flex min-h-11 min-w-11 items-center justify-center border-l border-y border-white/10 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Ver lançamentos anteriores"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              className="flex min-h-11 min-w-11 items-center justify-center border border-white/10 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Ver próximos lançamentos"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <div
          ref={scrollContainerRef}
          className="-mx-3 flex snap-x snap-mandatory overflow-x-auto border-y border-white/10 px-3 scrollbar-none sm:mx-0 sm:px-0"
        >
          {currentMonthReleases.map((item) => {
            const CardContent = (
                  <article className="group flex h-full w-[260px] xs:w-[280px] sm:w-[300px] shrink-0 snap-start flex-col border-r border-white/10 bg-background-void transition-colors hover:bg-white/[0.025]">
                    <div className="relative aspect-video w-full overflow-hidden bg-[#0C0D11]">
                      {isAllowedReleaseImageUrl(item.image) ? (
                        <img
                          src={item.image}
                          alt={item.game}
                          className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center">
                          <span className="text-xs font-semibold text-gray-400">Capa pendente</span>
                        </div>
                      )}
                      <span className="absolute right-2 top-2 z-10 border-b-2 border-brand-orange bg-black/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md">
                        {item.badge}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <time className="text-xs font-black uppercase text-brand-orange">{item.releaseDate}</time>
                          <span className="text-[10px] font-semibold text-gray-500">{item.dayOfWeek}</span>
                        </div>
                        <h3 className="font-heading text-sm sm:text-base font-extrabold leading-tight text-white transition-colors group-hover:text-brand-orange line-clamp-2">
                          {item.game}
                        </h3>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-2 border-t border-white/[0.08] pt-3">
                        <p className="text-[10px] font-bold uppercase text-gray-500 truncate">
                          {item.platforms.join(" · ")}
                        </p>
                        {item.slug ? (
                          <span className="shrink-0 text-[10px] font-bold text-gray-300 transition-colors group-hover:text-white">
                            Ler matéria <span aria-hidden="true">→</span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-bold text-gray-500">
                            Detalhes
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );

                if (item.slug) {
                  return (
                    <Link
                      key={item.id}
                      href={`/posts/${item.slug}`}
                      className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange"
                    >
                      {CardContent}
                    </Link>
                  );
                }

                return <div key={item.id} className="shrink-0">{CardContent}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
