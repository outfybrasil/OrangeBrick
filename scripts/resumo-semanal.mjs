import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "./.env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DAYS = 7;

function parseArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

const coverArg = parseArg("--cover");

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

const now = new Date();
const start = addDays(now, -DAYS);

const { data: posts, error } = await supabase
  .from("posts")
  .select("slug, title, summary, category, published_at")
  .eq("is_published", true)
  .not("published_at", "is", null)
  .order("published_at", { ascending: true });

if (error) {
  console.error("Falha ao carregar matérias:", error.message);
  process.exit(1);
}

const week = (posts || []).filter((post) => {
  const at = new Date(post.published_at);
  return at >= start && at <= now;
});

if (week.length === 0) {
  console.log("Nenhuma matéria publicada nos últimos " + DAYS + " dias.");
  process.exit(0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(value));
}

const startDate = formatDate(start);
const endLabel = formatDate(now);

function categoryLabel(count) {
  const map = {
    breaking: `${count} de plantão`,
    industry: `${count} de radar`,
    hardware: `${count} de hard news`,
    modding: `${count} de modding`,
    review: `${count} reviews`,
    opinion: `${count} opiniões`,
  };
  return map[count];
}

const byCategory = week.reduce((acc, post) => {
  acc[post.category] = (acc[post.category] || 0) + 1;
  return acc;
}, {});

const categoryLine = Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, count]) => ({ cat, count }));

const countText = categoryLine.map(({ cat, count }) => `${count} ${cat === "breaking" ? "de plantão" : cat === "industry" ? "de radar" : cat === "hardware" ? "de hard news" : cat === "modding" ? "de modding" : cat === "review" ? "de review" : "opiniões"}`).join(", ");

const blocks = [];
blocks.push({
  id: "intro",
  type: "text",
  content:
    `O resumo da semana do Orange Brick: ${week.length} matéria${week.length > 1 ? "s" : ""} entre ${startDate} e ${endLabel} — ${countText}. ` +
    `Reunimos o que importou, os desdobramentos de cada pauta e os links para a leitura completa. ` +
    "Sem enrolação.",
});

const thematicSections = {};
for (const post of week) {
  if (!thematicSections[post.category]) thematicSections[post.category] = [];
  thematicSections[post.category].push(post);
}

function categoryTitle(category) {
  const map = {
    breaking: "Plantão",
    industry: "Movimento na indústria",
    hardware: "Hardware",
    modding: "Modding",
    review: "Reviews",
    opinion: "Opinião",
  };
  return map[category] || "Destaques";
}

for (const [category, items] of Object.entries(thematicSections)) {
  const lines = items
    .map((post) => {
      const at = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(post.published_at));
      return `- **[${post.title}](/posts/${post.slug})** — ${post.summary} (${at})`;
    })
    .join("\n");
  blocks.push({ id: "sec-" + category, type: "text", content: `## ${categoryTitle(category)}\n\n${lines}` });
}

const top = [...week].sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, 3);
const topLines = top
  .map((post) => `- **[${post.title}](/posts/${post.slug})** — ${post.summary}`)
  .join("\n");
blocks.push({ id: "top", type: "text", content: `## Para ler primeiro\n\n${topLines}` });

blocks.push({
  id: "fonte",
  type: "text",
  content: "**Fonte:** [feed do Orange Brick](/feed.xml) · [todas as matérias do portal](/noticias)",
});

const slug = "resumo-semanal-" + now.toISOString().slice(0, 10);
const title = `RESUMO DA SEMANA: ${week.length} MATÉRIAS PUBLICADAS`;

const payload = {
  slug,
  title,
  summary: `Foram ${week.length} matérias no Orange Brick entre ${startDate} e ${endLabel} — ${countText}. O guia rápido pra quem acompanhar de longe.`,
  body: JSON.stringify(blocks),
  category: "industry",
  image_url: coverArg || "",
  image_alt: "Resumo editorial da semana nas páginas do Orange Brick",
  author_name: "The Brick",
  author_tag: "Radar",
  is_published: false,
  published_at: null,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
};

const { data, error: insertError } = await supabase.from("posts").insert(payload).select("id, slug, is_published").single();

if (insertError) {
  console.error("Falha ao salvar o rascunho:", insertError.message);
  process.exit(1);
}

console.log("Rascunho criado!");
console.log("  id:", data.id);
console.log("  slug:", data.slug);
console.log("  is_published:", data.is_published);
console.log("  blocos:", blocks.length);
console.log("  matérias na semana:", week.length);
if (!coverArg) console.log("  AVISO: capa vazia — adicione via painel admin antes de publicar (ex.: --cover /editorial/resumo-da-semana.webp).");