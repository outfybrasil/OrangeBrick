const fs = require("fs");
const path = require("path");
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

// Fotos de Nintendo Switch/cartuchos conhecidas no Unsplash
const candidates = [
  // IDs mais conhecidos de Nintendo Switch no Unsplash
  { id: "photo-1498429089284-41f8cf3ffd39", desc: "Nintendo Switch jogos espalhados" },
  { id: "photo-1568605114967-8130f3a36994", desc: "console gaming setup" },
  { id: "photo-1526374965328-7f61d4dc18c5", desc: "tecnologia digital" },
  { id: "photo-1551303258-8b81eb1e339b", desc: "Nintendo Switch cartucho" },
  { id: "photo-1580327344181-c1163234e5a0", desc: "Switch OLED" },
  { id: "photo-1493711662062-fa541adb3fc8", desc: "gaming controller Nintendo" },
  { id: "photo-1535223289429-a400a0f3bde6", desc: "Nintendo Joy-Con" },
  { id: "photo-1566576912321-d58ddd7a6088", desc: "videogame shelf" },
  { id: "photo-1471478331149-c72f17e33c73", desc: "game cartridges" },
  { id: "photo-1550745165-9bc0b252726f", desc: "retro games" },
];

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode < 400 });
    });
    req.on("error", () => resolve({ url, status: 0, ok: false }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ url, status: 0, ok: false }); });
    req.end();
  });
}

async function findAndUpdate() {
  console.log("Testando URLs de Nintendo Switch/cartuchos no Unsplash...\n");

  const results = [];
  for (const c of candidates) {
    const url = `https://images.unsplash.com/${c.id}?auto=format&fit=crop&w=800&q=80`;
    const result = await checkUrl(url);
    const icon = result.ok ? "✅" : "❌";
    console.log(`${icon} [${c.id}] ${c.desc} — HTTP ${result.status}`);
    if (result.ok) results.push({ ...c, url, coverUrl: `https://images.unsplash.com/${c.id}?auto=format&fit=crop&w=1200&q=80` });
  }

  console.log(`\nURLs válidas encontradas: ${results.length}`);
  results.forEach((r, i) => console.log(`  [${i}] ${r.desc}: ${r.url}`));

  if (results.length === 0) {
    console.log("Nenhuma URL válida. Encerrando.");
    return;
  }

  // Usar a primeira válida que faça mais sentido com cartuchos/switch
  const best = results[0];
  console.log(`\nAtualizando com: [${best.id}] ${best.desc}`);

  const envPath = path.join(__dirname, "..", ".env.local");
  const envConfig = fs.readFileSync(envPath, "utf-8");
  const env = {};
  envConfig.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/(^['"]|['"]$)/g, "");
    }
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: post, error } = await supabase
    .from("posts")
    .select("body")
    .eq("slug", "nintendo-switch-2-game-key-card-midia-fisica-controversia")
    .single();

  if (error) { console.error("Erro:", error.message); return; }

  const blocks = JSON.parse(post.body);
  const imgBlock = blocks.find(b => b.type === "image");
  if (imgBlock) imgBlock.url = best.url;

  const { error: e } = await supabase
    .from("posts")
    .update({ body: JSON.stringify(blocks), image_url: best.coverUrl, updated_at: new Date().toISOString() })
    .eq("slug", "nintendo-switch-2-game-key-card-midia-fisica-controversia");

  if (e) console.error("Erro ao atualizar:", e.message);
  else console.log("✅ Imagem atualizada no Supabase!");
}

findAndUpdate().catch(console.error);
