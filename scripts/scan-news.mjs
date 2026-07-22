const SOURCES = [
  { name: "Gematsu", url: "https://www.gematsu.com/feed", lang: "en", category: "japão" },
  { name: "IGN Brasil", url: "https://br.ign.com/feed.xml", lang: "pt", category: "geral" },
  { name: "Eurogamer", url: "https://www.eurogamer.net/feed", lang: "en", category: "geral" },
  { name: "VGC", url: "https://www.videogameschronicle.com/feed/", lang: "en", category: "indústria" },
  { name: "GameSpot", url: "https://www.gamespot.com/feeds/mashup/", lang: "en", category: "geral" },
  { name: "Push Square", url: "https://www.pushsquare.com/feeds/latest", lang: "en", category: "playstation" },
  { name: "Pure Xbox", url: "https://www.purexbox.com/feeds/latest", lang: "en", category: "xbox" },
  { name: "Nintendo Life", url: "https://www.nintendolife.com/feeds/latest", lang: "en", category: "nintendo" },
];

function parseDate(str) {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function isToday(date) {
  if (!date) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

const STOPWORDS_EN = /(video|review|buy|deal|sale|price|discount|podcast|trailer|update|patch)/i;

function score(item) {
  let s = 0;
  const t = `${item.title} ${item.summary}`.toLowerCase();

  if (t.includes("anuncia") || t.includes("announce")) s += 3;
  if (t.includes("lança") || t.includes("launch") || t.includes("release")) s += 2;
  if (t.includes("confirma") || t.includes("confirm")) s += 2;
  if (t.includes("reveal") || t.includes("revela")) s += 2;
  if (t.includes("chega") || t.includes("arrives")) s += 1;
  if (t.includes("adquire") || t.includes("acquire") || t.includes("merge")) s += 2;
  if (t.includes("demissão") || t.includes("layoff") || t.includes("fecha")) s += 2;
  if (t.includes("playstation") || t.includes("sony")) s += 1;
  if (t.includes("xbox") || t.includes("microsoft")) s += 1;
  if (t.includes("nintendo") || t.includes("switch")) s += 1;
  if (t.includes("steam") || t.includes("pc")) s += 1;
  if (t.includes("exclusivo") || t.includes("exclusive")) s += 2;

  if (STOPWORDS_EN.test(t)) s -= 2;

  return s;
}

async function fetchFeed(source) {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "OrangeBrick/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
        return m ? m[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1") : "";
      };
      const title = get("title");
      const link = get("link");
      const summary = get("description");
      const pubDate = parseDate(get("pubDate"));
      if (title && link) {
        items.push({ source: source.name, title, link, summary, pubDate, score: 0 });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function run() {
  console.log("Scanning news sources...\n");

  const results = (await Promise.all(SOURCES.map(fetchFeed))).flat();

  const todayItems = results.filter((i) => isToday(i.pubDate));

  if (todayItems.length === 0) {
    console.log("No news found for today.");
    console.log(`(${results.length} total items fetched, none from today)`);
    return;
  }

  for (const item of todayItems) {
    item.score = score(item);
  }

  todayItems.sort((a, b) => b.score - a.score);
  const top = todayItems.slice(0, 5);

  console.log(`Found ${todayItems.length} articles from today.\n`);
  console.log("Top picks:\n");

  for (const item of top) {
    const dateStr = item.pubDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    console.log(`  ${"★".repeat(Math.max(1, Math.round(item.score / 2) + 1))}${"☆".repeat(Math.max(0, 5 - Math.round(item.score / 2) - 1))}  ${item.score.toFixed(0)} pts`);
    console.log(`  📰 ${item.source}`);
    console.log(`  🕐 ${dateStr}`);
    console.log(`  ${item.title}`);
    console.log(`  ${item.link}`);
    console.log();
  }

  console.log(`\nBest pick: "${top[0].title}"`);
  console.log(`Source: ${top[0].source}`);
  console.log(`URL: ${top[0].link}`);
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
