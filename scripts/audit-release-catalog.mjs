import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../supabase/migrations/20260724000003_complete_release_catalog.sql", import.meta.url);
const outputPath = new URL("../docs/release-catalog-steam-audit.json", import.meta.url);
const migrationPath = new URL("../supabase/migrations/20260725000003_release_catalog_editorial_audit.sql", import.meta.url);
const februaryMigrationPath = new URL("../supabase/migrations/20260725000004_release_catalog_february_images.sql", import.meta.url);
const marchAprilMigrationPath = new URL("../supabase/migrations/20260725000005_release_catalog_march_april_images.sql", import.meta.url);
const remainingMonthsMigrationPath = new URL("../supabase/migrations/20260725000006_release_catalog_may_december.sql", import.meta.url);
const reportPath = new URL("../docs/release-catalog-editorial-audit-2026-07-24.md", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const pattern = /\('(?<id>[^']+)',\s*'(?<game>(?:[^']|'')+)',\s*'(?<releaseLabel>(?:[^']|'')+)',\s*date\s*'(?<releaseDate>2026-[^']+)'/g;
const releases = [...source.matchAll(pattern)].map(({ groups }) => ({
  id: groups.id,
  game: groups.game.replaceAll("''", "'"),
  releaseLabel: groups.releaseLabel.replaceAll("''", "'"),
  releaseDate: groups.releaseDate,
}));

function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(the|edition|remastered|remake|hd)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function score(expected, candidate) {
  const left = new Set(normalize(expected).split(" "));
  const right = new Set(normalize(candidate).split(" "));
  const overlap = [...left].filter((term) => right.has(term)).length;
  return overlap / Math.max(left.size, right.size, 1);
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "OrangeBrickReleaseAudit/1.0" },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function auditRelease(release) {
  const query = encodeURIComponent(release.game);
  const search = await getJson(`https://store.steampowered.com/api/storesearch/?term=${query}&cc=br&l=english`);
  const candidates = (search.items || [])
    .map((item) => ({ ...item, matchScore: score(release.game, item.name) }))
    .sort((first, second) => second.matchScore - first.matchScore);
  const candidate = candidates[0];
  if (!candidate || candidate.matchScore < 0.6) {
    return { ...release, status: "manual-review", candidates: candidates.slice(0, 3) };
  }

  const detailsResponse = await getJson(`https://store.steampowered.com/api/appdetails?appids=${candidate.id}&cc=br&l=english`);
  const details = detailsResponse[String(candidate.id)]?.data;
  if (!details) {
    return { ...release, status: "manual-review", candidate };
  }

  const screenshots = (details.screenshots || []).map((item) => item.path_full);
  return {
    ...release,
    status: candidate.matchScore === 1 ? "matched" : "review-match",
    appId: candidate.id,
    steamName: details.name,
    steamType: details.type,
    isIndie: (details.genres || []).some((genre) => genre.description === "Indie"),
    developers: details.developers || [],
    publishers: details.publishers || [],
    genres: (details.genres || []).map((genre) => genre.description),
    releaseDateSteam: details.release_date?.date || null,
    comingSoon: details.release_date?.coming_soon ?? null,
    screenshots,
    matchScore: candidate.matchScore,
  };
}

let results;
if (process.env.REFRESH_RELEASE_AUDIT === "true") {
  results = [];
  for (const release of releases) {
    try {
      results.push(await auditRelease(release));
    } catch (error) {
      results.push({ ...release, status: "request-error", error: String(error) });
    }
  }
  await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
} else {
  results = JSON.parse(await readFile(outputPath, "utf8"));
}

for (const item of results.filter((release) => release.releaseDate >= "2026-05-01" && !release.screenshots?.length)) {
  const appId = item.appId ?? Number(item.error?.match(/appids=(\d+)/)?.[1]);
  if (!appId) continue;
  const response = await fetch(`https://store.steampowered.com/app/${appId}/?cc=us&l=english`, {
    headers: { "User-Agent": "OrangeBrickReleaseAudit/1.0" },
  });
  if (!response.ok) continue;
  const html = await response.text();
  const screenshot = html
    .match(/&quot;full&quot;:&quot;(https:\\\/\\\/[^&]+?\.1920x1080\.jpg[^&]*)&quot;/)?.[1]
    ?.replaceAll("\\/", "/")
    .replaceAll("&amp;", "&");
  if (screenshot) {
    item.appId = appId;
    item.screenshots = [screenshot];
  }
}

const manualIndie = new Map([
  ["spear", true],
  ["arknights-endfield", false],
  ["escape-the-ever-after", true],
  ["highguard", false],
  ["conquest-tactics", true],
  ["the-18th-attic", true],
  ["humanityz", true],
  ["blazblue-entropy-effect-x", false],
  ["mario-tennis-fever", false],
  ["menherarium", true],
  ["rainbow-six-mobile", false],
  ["never-grace", true],
  ["mlb-the-show-26", false],
  ["xploit-zero", true],
  ["pokemon-champions", false],
  ["tomodachi-life-living-the-dream", false],
  ["saros", false],
  ["farming-simulator-26-switch-edition", false],
  ["yoshi-and-the-mysterious-book", false],
  ["pictonico", true],
  ["efootball-kick-off", false],
  ["rf-online-next", false],
  ["star-fox", false],
  ["grand-theft-auto-vi", false],
  ["ganbare-goemon-daishuugou", false],
  ["rhythm-heaven-groove", false],
  ["ao-oni", true],
  ["granblue-fantasy-relink-endless-ragnarok", false],
  ["ebaseball-pro-spirit-2026", false],
  ["the-guild-europe-1410", false],
  ["gothic-classic", false],
  ["bloodrayne-definitive-collection", false],
  ["exstetra-hd-remastered", false],
  ["aretha-collection-1993-1995", false],
  ["xenoblade-chronicles-2-switch-2-edition", false],
]);

const knownJanuary = new Map([
  ["escape-the-ever-after", {
    game: "Escape from Ever After",
    appId: 1996390,
    isIndie: true,
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1996390/9530a3ab392c359295c16c34859999164b5379c6/ss_9530a3ab392c359295c16c34859999164b5379c6.1920x1080.jpg?t=1780594097",
  }],
  ["highguard", {
    appId: 4128260,
    isIndie: false,
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4128260/dfdb7ab5ef35a501553d5f630c9812209c02728f/ss_dfdb7ab5ef35a501553d5f630c9812209c02728f.1920x1080.jpg?t=1773274959",
  }],
  ["conquest-tactics", {
    game: "Conquest Tactics: Realm of Sin",
    appId: 3308960,
    isIndie: true,
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3308960/f2e4fe1345b6b3285984429cc7c633215e159807/ss_f2e4fe1345b6b3285984429cc7c633215e159807.1920x1080.jpg?t=1784106874",
  }],
  ["spear", {
    game: "S.P.E.A.R.",
    isIndie: true,
    image: "https://store-images.s-microsoft.com/image/apps.34321.14474803177493602.fc0be985-235a-4500-b3ec-d2f26a34cadc.97530099-5427-435e-92ab-1b1c63ee56e0?h=1080&q=90&w=1920",
  }],
  ["arknights-endfield", {
    isIndie: false,
    image: "https://web-static.hg-cdn.com/upload/image/20260119/6449fcc85a70c8fddea7df91051bb13f.png",
  }],
]);

const dateCorrections = new Map([
  ["heartopia", ["16 de Janeiro", "2026-01-16"]],
  ["cozy-caravan", ["7 de Janeiro", "2026-01-07"]],
  ["cassette-boy", ["14 de Janeiro", "2026-01-14"]],
  ["brokenlore-unfollow", ["15 de Janeiro", "2026-01-15"]],
  ["hermit-and-pig", ["5 de Fevereiro", "2026-02-05"]],
  ["banquet-for-fools", ["5 de Março", "2026-03-05"]],
  ["the-fortress", ["22 de Janeiro", "2026-01-22"]],
  ["seven-deadly-sins-origin", ["16 de Março", "2026-03-16"]],
  ["dark-auction", ["28 de Janeiro", "2026-01-28"]],
  ["code-vein-2", ["29 de Janeiro", "2026-01-29"]],
]);

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const classifications = results.map((item) => {
  const known = knownJanuary.get(item.id);
  const productType = item.steamType === "dlc" ? "dlc" : "game";
  const isIndie = known?.isIndie ?? item.isIndie ?? manualIndie.get(item.id) ?? false;
  return {
    ...item,
    game: known?.game ?? (item.id === "code-vein-2" ? "CODE VEIN II" : item.game),
    productType,
    isIndie,
    badge: productType === "dlc" ? "DLC / Expansão" : isIndie ? "Indie" : "Lançamento",
    sourceUrl: known?.appId || item.appId
      ? `https://store.steampowered.com/app/${known?.appId || item.appId}`
      : null,
  };
});

const values = classifications
  .map((item) => `    (${sql(item.id)}, ${sql(item.productType)}, ${item.isIndie}, ${sql(item.badge)})`)
  .join(",\n");
const januaryUpdates = classifications
  .filter((item) => item.releaseDate.startsWith("2026-01"))
  .map((item) => {
    const known = knownJanuary.get(item.id);
    const image = known?.image ?? item.screenshots?.[0];
    const correction = dateCorrections.get(item.id);
    const assignments = [
      `game = ${sql(item.game)}`,
      `image_url = ${sql(image)}`,
      "updated_at = now()",
    ];
    if (correction) {
      assignments.push(`release_label = ${sql(correction[0])}`);
      assignments.push(`release_date = date ${sql(correction[1])}`);
    }
    return `update public.release_radar_items\nset ${assignments.join(",\n  ")}\nwhere id = ${sql(item.id)};`;
  })
  .join("\n\n");

const migration = `alter table public.release_radar_items
  add column if not exists product_type text not null default 'game'
    check (product_type in ('game', 'dlc')),
  add column if not exists is_indie boolean not null default false;

with audit(id, product_type, is_indie, badge) as (
  values
${values}
)
update public.release_radar_items release
set
  product_type = audit.product_type,
  is_indie = audit.is_indie,
  badge = audit.badge,
  updated_at = now()
from audit
where release.id = audit.id;

update public.release_radar_items
set
  product_type = 'dlc',
  is_indie = false,
  badge = 'DLC / Expansão',
  updated_at = now()
where id in ('starfield-dlc', 'witcher-expansion');

${januaryUpdates}
`;

const months = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });
const reportRows = classifications
  .sort((first, second) => first.releaseDate.localeCompare(second.releaseDate) || first.game.localeCompare(second.game))
  .map((item) => {
    const source = item.sourceUrl ? `[Steam](${item.sourceUrl})` : "Revisão editorial / loja oficial";
    return `| ${item.releaseDate} | ${item.game} | ${item.productType === "dlc" ? "DLC / expansão" : "Jogo completo"} | ${item.isIndie ? "Sim" : "Não"} | ${source} |`;
  });
const monthCounts = new Map();
for (const item of classifications) {
  const key = months.format(new Date(`${item.releaseDate}T12:00:00Z`));
  monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
}
const report = `# Auditoria editorial do Radar 2026 — 24/07/2026

Escopo: ${classifications.length} itens com data definida no catálogo de 2026.

Critério: \`product_type\` separa jogo completo de DLC/expansão; \`is_indie\` é uma dimensão independente. O badge visível prioriza DLC, depois indie, depois lançamento.

Meses sem registros no catálogo: agosto, outubro e dezembro.

| Data | Produto | Tipo | Indie | Fonte |
|---|---|---|---|---|
${reportRows.join("\n")}
`;

await writeFile(migrationPath, migration, "utf8");
await writeFile(reportPath, report, "utf8");

const knownFebruary = new Map([
  ["the-18th-attic", {
    game: "The 18th Attic - Paranormal Anomaly Hunting Game",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3403660/ee414a88ee0de0489347c61702e5c6ed0dd40496/ss_ee414a88ee0de0489347c61702e5c6ed0dd40496.1920x1080.jpg?t=1777746524",
    isIndie: true,
  }],
  ["humanityz", {
    game: "HumanitZ",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1766060/4873f37f516dc207bd0f61ba5dcd16b0d2ca6070/ss_4873f37f516dc207bd0f61ba5dcd16b0d2ca6070.1920x1080.jpg?t=1770400758",
    isIndie: true,
  }],
  ["blazblue-entropy-effect-x", {
    image: "https://blog.playstation.com/tachyon/2025/11/4d15c297978753f4fcda7657bbe8dccc82fbdb54.jpg",
    isIndie: false,
  }],
  ["mario-tennis-fever", {
    image: "https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_1.5/ncom/en_US/articles/2026/its-time-to-hit-the-court-in-mario-tennis-fever/2250x1266_MTF_availableNow_1",
    isIndie: false,
  }],
  ["menherarium", {
    game: "Menherarium: Deadly Dice",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3394770/9da466b75338a18161e013411aee867be95354a0/ss_9da466b75338a18161e013411aee867be95354a0.1920x1080.jpg?t=1782401223",
    isIndie: true,
  }],
  ["rainbow-six-mobile", {
    image: "https://i.ytimg.com/vi/HzWjPR7EUmE/maxresdefault.jpg",
    isIndie: false,
  }],
]);
const februaryDateCorrections = new Map([
  ["the-18th-attic", ["23 de Janeiro", "2026-01-23"]],
  ["crimson-capes", ["12 de Fevereiro", "2026-02-12"]],
  ["unemployment-simulator-2018", ["3 de Fevereiro", "2026-02-03"]],
  ["tides-of-tomorrow", ["22 de Abril", "2026-04-22"]],
]);
const februaryIds = new Set([
  ...results.filter((item) => item.releaseDate.startsWith("2026-02")).map((item) => item.id),
  "hermit-and-pig",
]);
const februaryUpdates = classifications
  .filter((item) => februaryIds.has(item.id))
  .map((item) => {
    const known = knownFebruary.get(item.id);
    const correction = februaryDateCorrections.get(item.id);
    const game = known?.game ?? item.game;
    const image = known?.image ?? item.screenshots?.[0];
    const isIndie = known?.isIndie ?? item.isIndie;
    const assignments = [
      `game = ${sql(game)}`,
      `image_url = ${sql(image)}`,
      "product_type = 'game'",
      `is_indie = ${Boolean(isIndie)}`,
      `badge = ${sql(isIndie ? "Indie" : "Lançamento")}`,
      "updated_at = now()",
    ];
    if (correction) {
      assignments.push(`release_label = ${sql(correction[0])}`);
      assignments.push(`release_date = date ${sql(correction[1])}`);
    }
    return `update public.release_radar_items\nset ${assignments.join(",\n  ")}\nwhere id = ${sql(item.id)};`;
  })
  .join("\n\n");
await writeFile(februaryMigrationPath, `${februaryUpdates}\n`, "utf8");

const knownMarchApril = new Map([
  ["never-grace", {
    game: "Never Grave: The Witch and The Curse",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2395770/ss_c4e61aad5335b3631d42519c4283f12a100f5696.1920x1080.jpg?t=1773129554",
    isIndie: true,
  }],
  ["mlb-the-show-26", {
    image: "https://blog.playstation.com/tachyon/2026/01/8563d8f53782260f80fd4885c39e5f89e1c41d05.jpg",
    isIndie: false,
  }],
  ["xploit-zero", {
    game: "Xploit ZERO",
    image: "https://aaagamestudios.com/xploit.zero/assets/imgs/XploitZERO_Key%20Art_Landscape.webp",
    isIndie: true,
  }],
  ["pokemon-champions", {
    image: "https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_1.5/ncom/en_US/articles/2026/get-battling-with-the-new-free-to-start-game-pokemon-champions/2250x1266_PC_launch",
    isIndie: false,
  }],
  ["tomodachi-life-living-the-dream", {
    image: "https://assets.nintendo.com/image/upload/f_auto,q_auto/Marketing/KWPrk6LG7f6pcDfo6uPckZPP4anLWs8dYrFGyXxWU9ksyHkwdYAd7jhGE8DqBFmJ/intro/looping-video-fallback",
    isIndie: false,
  }],
  ["saros", {
    image: "https://i.ytimg.com/vi/xmsc_GokLPI/maxresdefault.jpg",
    isIndie: false,
  }],
]);
const marchAprilDateCorrections = new Map([
  ["never-grace", ["4 de Março", "2026-03-04"]],
  ["dynasty-warriors-3-remastered", ["1 de Outubro", "2026-10-01"]],
  ["mouse-pi-for-hire", ["16 de Abril", "2026-04-16"]],
  ["copa-city", ["16 de Junho", "2026-06-16"]],
  ["pragmata", ["17 de Abril", "2026-04-17"]],
]);
const marchAprilIds = new Set([
  ...results
    .filter((item) => item.releaseDate.startsWith("2026-03") || item.releaseDate.startsWith("2026-04"))
    .map((item) => item.id),
  "banquet-for-fools",
  "seven-deadly-sins-origin",
  "tides-of-tomorrow",
]);
const marchAprilUpdates = classifications
  .filter((item) => marchAprilIds.has(item.id))
  .map((item) => {
    const known = knownMarchApril.get(item.id);
    const correction = marchAprilDateCorrections.get(item.id);
    const game = known?.game ?? item.game;
    const image = known?.image ?? item.screenshots?.[0];
    const productType = item.steamType === "dlc" ? "dlc" : "game";
    const isIndie = known?.isIndie ?? item.isIndie;
    const badge = productType === "dlc" ? "DLC / Expansão" : isIndie ? "Indie" : "Lançamento";
    const assignments = [
      `game = ${sql(game)}`,
      `image_url = ${sql(image)}`,
      `product_type = ${sql(productType)}`,
      `is_indie = ${Boolean(isIndie)}`,
      `badge = ${sql(badge)}`,
      "updated_at = now()",
    ];
    if (correction) {
      assignments.push(`release_label = ${sql(correction[0])}`);
      assignments.push(`release_date = date ${sql(correction[1])}`);
    }
    return `update public.release_radar_items\nset ${assignments.join(",\n  ")}\nwhere id = ${sql(item.id)};`;
  })
  .join("\n\n");
await writeFile(marchAprilMigrationPath, `${marchAprilUpdates}\n`, "utf8");

const remainingManual = new Map([
  ["mixtape", {
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2582320/24acc55682b75be77cb5f4bfef6502fbafd66f10/ss_24acc55682b75be77cb5f4bfef6502fbafd66f10.1920x1080.jpg?t=1784659606",
    isIndie: true,
  }],
  ["directive-8020", {
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2255370/5cba58e6db2df0db2387b89c78ff9ca63c508078/ss_5cba58e6db2df0db2387b89c78ff9ca63c508078.1920x1080.jpg?t=1784739727",
    isIndie: false,
  }],
  ["007-first-light", {
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/ef374e5e4ede8c71f32d455652bc00f2fa7c035e/ss_ef374e5e4ede8c71f32d455652bc00f2fa7c035e.1920x1080.jpg?t=1784903400",
    isIndie: false,
  }],
  ["farming-simulator-26-switch-edition", {
    image: "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/store/software/switch/70010000115163/5bbac54ee720cf2ed9557e4fe40d33a0a942f4f9b4e19ff6ce2aed6df7b1024f",
    isIndie: false,
  }],
  ["yoshi-and-the-mysterious-book", {
    image: "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/store/software/switch2/70010000119859/74720e9755d3cc39e312e33d6c985a815ed352217cbcdeeaeabb98387767c82f",
    isIndie: false,
  }],
  ["pictonico", {
    image: "https://i.ytimg.com/vi/ONoxuXGAoMk/maxresdefault.jpg",
    isIndie: false,
  }],
  ["efootball-kick-off", {
    image: "https://prcdn.freetls.fastly.net/release_image/50711/1354/50711-1354-403b850dcbb1157737d1c985e14383ad-1920x1080.jpg",
    isIndie: false,
  }],
  ["rf-online-next", {
    image: "https://channeln.gcdn.netmarble.com/channeln/Upload/ba7107dd-a5fd-447b-9b97-8a8a752dfe08.jpg",
    isIndie: false,
  }],
  ["star-fox", {
    image: "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/store/software/switch2/70010000123167/53252d090153a002caa2cd44e8d16cd5d8e138a71fdee7c2b11533cc4eea0780",
    isIndie: false,
  }],
  ["ganbare-goemon-daishuugou", {
    image: "https://www.konami.com/games/goemon/s/img/share.jpg",
    isIndie: false,
  }],
  ["rhythm-heaven-groove", {
    image: "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/store/software/switch/70010000122818/68783d5ce28afdd60025069dc9ba412c7d501afdb4248d1360967d629cd7bea1",
    isIndie: false,
  }],
  ["ao-oni", {
    game: "Aooni",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202606/1203/dbffd4b9cc5ea488ee1dd7c5e0d91f3ce8b9676f528a8f1f.jpg",
    isIndie: true,
  }],
  ["granblue-fantasy-relink-endless-ragnarok", {
    game: "Granblue Fantasy: Relink - Endless Ragnarok",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3839790/bc04b725e6c5c48327bcea684d70bfae1d725e1f/ss_bc04b725e6c5c48327bcea684d70bfae1d725e1f.1920x1080.jpg?t=1784178909",
    productType: "dlc",
    isIndie: false,
  }],
  ["doom-dark-ages-revelations", {
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3469450/1f1e9fc7c9f3096fad4c16525c8574fa993fced4/ss_1f1e9fc7c9f3096fad4c16525c8574fa993fced4.1920x1080.jpg?t=1784122789",
    productType: "dlc",
    isIndie: false,
  }],
  ["assassins-creed-black-flag-resynced", {
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3751950/5de8c44752bdbc724b905b76bc5023bbff57547f/ss_5de8c44752bdbc724b905b76bc5023bbff57547f.1920x1080.jpg?t=1783617053",
    isIndie: false,
  }],
  ["tokyo-valkyries", {
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4093240/f5dee22d83a141b32268a78d720b667945a3b1b1/ss_f5dee22d83a141b32268a78d720b667945a3b1b1.1920x1080.jpg?t=1783522890",
    isIndie: true,
  }],
  ["the-alters-last-variable", {
    productType: "dlc",
    isIndie: false,
  }],
  ["ebaseball-pro-spirit-2026", {
    game: "eBaseball™: PRO SPIRIT 2026",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4128400/e4ca763e81689de4f1dd504fa9d3387785f7bf89/ss_e4ca763e81689de4f1dd504fa9d3387785f7bf89.1920x1080.jpg?t=1784885751",
    isIndie: false,
  }],
  ["the-guild-europe-1410", {
    game: "The Guild - Europa 1410",
    appId: 2977260,
    isIndie: false,
  }],
  ["gothic-classic", {
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202507/0211/896082b7f0c2d839da17e2fed7c7959d65928c24d6ef98b9.jpg",
    isIndie: false,
  }],
  ["bloodrayne-definitive-collection", {
    game: "BloodRayne: Definitive Collection",
    image: "https://cdn.prod.website-files.com/5ed5c847e36fdf719f7440fc/69f33d258871cb1139977d0c_BloodRayne%2020th%20sizzle%20Reel%20Styleframe.jpg",
    isIndie: false,
  }],
  ["exstetra", {
    game: "EXSTETRA",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4251710/71b2887b15377bfea4381f55c689cd87b12db259/ss_71b2887b15377bfea4381f55c689cd87b12db259.1920x1080.jpg?t=1784537603",
    isIndie: false,
  }],
  ["aretha-collection-1993-1995", {
    game: "ARETHA COLLECTION 1993-1995",
    image: "https://edia.co.jp/wp-content/uploads/2026/04/press_main.jpg",
    isIndie: false,
  }],
  ["xenoblade-chronicles-2-switch-2-edition", {
    game: "Xenoblade Chronicles 2 – Nintendo Switch 2 Edition",
    image: "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/store/software/switch2/70050000075154/e6fd2a34d9cb9dd63889d759b540bbf622604c01ff81a12339425f49a533a446",
    isIndie: false,
  }],
  ["phantom-blade-zero", {
    image: "https://pbz.s-game.com/assets/videos/home/poster/1.webp",
    isIndie: false,
  }],
  ["grand-theft-auto-vi", {
    image: "https://i.ytimg.com/vi/VQRLujxTm3c/maxresdefault.jpg",
    isIndie: false,
  }],
]);

const remainingIndies = new Set([
  "dead-as-disco",
  "mixtape",
  "outbound",
  "battlestar-galactica-scattered-hopes",
  "call-of-the-elder-gods",
  "thick-as-thieves",
  "bubsy-4d",
  "enter-the-chronosphere",
  "realm-of-ink",
  "yerba-buena",
  "stonemachia",
  "echo-generation-2",
  "schrodingers-call",
  "crashout-crew",
  "killer-bean",
  "dark-scrolls",
  "moonlight-peaks",
  "backyard-baseball",
  "tokyo-valkyries",
  "palworld",
  "hell-clock",
  "cozy-grove-camp-spirit",
  "teeto",
  "hell-maiden",
  "heave-ho-2",
  "moss-the-forgotten-relic",
  "dive-or-die-children-of-rain",
  "fading-echo",
  "tears-of-metal",
  "cultic",
  "tormentum-ii",
  "forever-skies",
  "go-north",
]);

for (const [id, manual] of remainingManual) {
  if (!manual.appId || manual.image) continue;
  const response = await getJson(`https://store.steampowered.com/api/appdetails?appids=${manual.appId}&cc=br&l=english`);
  manual.image = response[String(manual.appId)]?.data?.screenshots?.[0]?.path_full;
}

const remainingDateCorrections = new Map([
  ["lego-batman-legacy-of-the-dark-knight", ["22 de Maio", "2026-05-22"]],
  ["rf-online-next", ["16 de Junho", "2026-06-16"]],
  ["the-guild-europe-1410", ["Setembro de 2026", null]],
  ["bloodrayne-definitive-collection", ["Outubro de 2026", null]],
  ["phantom-blade-zero", ["29 de Outubro", "2026-10-29"]],
  ["exstetra", ["29 de Julho", "2026-07-29"]],
]);

const remainingIds = new Set(results
  .filter((item) => item.releaseDate >= "2026-05-01" && item.id !== "exstetra-hd-remastered")
  .map((item) => item.id));
const remainingUpdates = classifications
  .filter((item) => remainingIds.has(item.id))
  .map((item) => {
    const manual = remainingManual.get(item.id);
    const correction = remainingDateCorrections.get(item.id);
    const game = manual?.game ?? item.game;
    const image = manual?.image ?? item.screenshots?.[0];
    const productType = manual?.productType ?? (item.steamType === "dlc" ? "dlc" : "game");
    const isIndie = manual?.isIndie ?? (remainingIndies.has(item.id) ? true : item.isIndie ?? false);
    const badge = productType === "dlc" ? "DLC / Expansão" : isIndie ? "Indie" : "Lançamento";
    const assignments = [
      `game = ${sql(game)}`,
      `image_url = ${sql(image)}`,
      `product_type = ${sql(productType)}`,
      `is_indie = ${Boolean(isIndie)}`,
      `badge = ${sql(badge)}`,
      "updated_at = now()",
    ];
    if (correction) {
      assignments.push(`release_label = ${sql(correction[0])}`);
      assignments.push(correction[1] ? `release_date = date ${sql(correction[1])}` : "release_date = null");
    }
    return `update public.release_radar_items\nset ${assignments.join(",\n  ")}\nwhere id = ${sql(item.id)};`;
  })
  .join("\n\n");
await writeFile(
  remainingMonthsMigrationPath,
  `${remainingUpdates}\n\ndelete from public.release_radar_items where id = 'exstetra-hd-remastered';\n`,
  "utf8",
);
console.log(`Auditados ${results.length} registros em ${outputPath.pathname}`);
