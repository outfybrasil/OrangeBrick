import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const slug = "gamescom-2026-abertura-opening-night-live-revelacoes-lancamentos";

const { data: post } = await supabase
  .from("posts")
  .select("*")
  .eq("slug", slug)
  .single();

const title = post.title;
const summary = post.summary;
const imageUrl = post.image_url || "";
const imageAlt = post.image_alt || "";
const informationStatus = post.information_status || "confirmed";
const storedQuote = post.featured_quote;
const quoteText = storedQuote?.text || "";
const quoteAuthor = storedQuote?.author || "";
const quoteSourceUrl = storedQuote?.source_url || "";
const storedSources = Array.isArray(post.editorial_sources) ? post.editorial_sources : [];
const sourcesText = storedSources.map((source) => `${source.name || "Fonte"}|${source.url || ""}`).join("\n");
const blocks = JSON.parse(post.body);

const textContent = blocks
  .filter((block) => block.type === "text")
  .map((block) => block.content)
  .join("\n");
const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
const imageBlocks = blocks.filter((block) => block.type === "image");
const sources = sourcesText.split("\n").map((line) => line.trim()).filter(Boolean);

const checklist = [
  { id: 1, label: "Título com até 70 caracteres", complete: Boolean(title.trim() && title.length <= 70) },
  { id: 2, label: "Resumo entre 80 e 180 caracteres", complete: summary.trim().length >= 80 && summary.trim().length <= 180 },
  { id: 3, label: "Capa e texto alternativo preenchidos", complete: Boolean(imageUrl.trim() && imageAlt.trim().length >= 3) },
  { id: 4, label: "Corpo entre 700 e 1.000 palavras", complete: wordCount >= 700 && wordCount <= 1000 },
  { id: 5, label: "Duas imagens internas distintas", complete: imageBlocks.length >= 2 && new Set(imageBlocks.map((block) => block.url.trim()).filter(Boolean)).size >= 2 },
  { id: 6, label: "Alt text e legenda nas imagens internas", complete: imageBlocks.length >= 2 && imageBlocks.every((block) => block.alt.trim().length >= 3 && Boolean(block.caption?.trim())) },
  { id: 7, label: "Pelo menos três fontes estruturadas", complete: sources.length >= 3 && sources.every((line) => /^.+\|https:\/\//.test(line)) },
  { id: 8, label: "Fonte citada ao final do texto", complete: /\*\*Fonte:\*\*/i.test(textContent) },
  { id: 9, label: "Estado da informação definido", complete: Boolean(informationStatus) },
  { id: 10, label: "Fala verificada ou ausência registrada", complete: Boolean(quoteText.trim() ? quoteAuthor.trim() && /^https:\/\//.test(quoteSourceUrl.trim()) : textContent.toLowerCase().includes("declaração pública")) },
];

console.log(`\n=== RESULTADO DO CHECKLIST EDITORIAL: ${checklist.filter((i) => i.complete).length} de ${checklist.length} ===\n`);
for (const item of checklist) {
  console.log(`${item.complete ? "✓" : "✗"} ${item.label}`);
}
console.log(`\nContagem de palavras: ${wordCount}`);
