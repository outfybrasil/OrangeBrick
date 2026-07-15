const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const IMAGE_URL = "https://static1.srcdn.com/wordpress/wp-content/uploads/2025/01/nintendo-switch-2-reveal-image-4.jpg";
const ALT_TEXT = "Nintendo Switch 2 revelado oficialmente pela Nintendo — console na dock com design modernizado e detalhes em preto";
const SLUG = "nintendo-switch-2-game-key-card-midia-fisica-controversia";

async function updateImage() {
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
    .eq("slug", SLUG)
    .single();

  if (error) { console.error("Erro ao buscar post:", error.message); return; }

  const blocks = JSON.parse(post.body);
  const imgBlock = blocks.find(b => b.type === "image");
  if (imgBlock) {
    imgBlock.url = IMAGE_URL;
    imgBlock.alt = ALT_TEXT;
  }

  const { error: e } = await supabase
    .from("posts")
    .update({
      body: JSON.stringify(blocks),
      image_url: IMAGE_URL,
      image_alt: ALT_TEXT,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", SLUG);

  if (e) console.error("Erro ao atualizar:", e.message);
  else console.log("Imagem do Nintendo Switch 2 atualizada!");
}

updateImage().catch(console.error);
