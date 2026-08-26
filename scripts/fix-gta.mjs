import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import { fixPostImages } from "../src/lib/ai/gemini-news.ts";

console.log("Corrigindo imagens...");
const posts = await fixPostImages("gta-vi-mecanicas-reveladas-pelos-vazamentos");
if (posts.length === 0) {
  console.log("Nenhum post encontrado.");
} else {
  for (const p of posts) {
    console.log("OK:", p.title);
    console.log("Capa:", p.image_url || "nenhuma");
  }
}
