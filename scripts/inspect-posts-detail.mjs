import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
function getVar(k) {
  const m = envContent.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : process.env[k];
}

const supabase = createClient(getVar("NEXT_PUBLIC_SUPABASE_URL"), getVar("SUPABASE_SERVICE_ROLE_KEY"));

const { data: posts, error } = await supabase
  .from("posts")
  .select("id, title, slug, image_url, body, is_published, created_at, updated_at")
  .order("created_at", { ascending: false })
  .limit(10);

if (error) {
  console.error("Erro:", error);
} else {
  posts.forEach((p) => {
    let blocks = [];
    try {
      blocks = typeof p.body === "string" ? JSON.parse(p.body) : p.body || [];
    } catch {}
    const imgBlocks = blocks.filter((b) => b.type === "image");
    console.log("-----------------------------------------");
    console.log("Título:", p.title);
    console.log("Slug:", p.slug);
    console.log("ID:", p.id);
    console.log("Capa (image_url):", p.image_url);
    console.log("Blocos de Imagem no Corpo:", imgBlocks.length);
    imgBlocks.forEach((img, i) => console.log(`  Img ${i + 1}: ${img.url} | Alt: ${img.alt} | Caption: ${img.caption}`));
  });
}
