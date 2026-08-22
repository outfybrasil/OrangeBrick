import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: drafts, error } = await supabase
  .from("posts")
  .select("id, title, slug, category, image_url, image_alt, body, created_at")
  .eq("is_published", false)
  .order("created_at", { ascending: false });

if (error) {
  console.error("Falha ao carregar rascunhos:", error.message);
  process.exit(1);
}

async function checkUrl(imageUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(imageUrl, { method: "HEAD", redirect: "follow", signal: controller.signal });
    clearTimeout(timeout);
    return res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}`;
  } catch (err) {
    return "FALHA DE REDE";
  }
}

let hasIssues = false;

for (const draft of drafts || []) {
  let blocks = [];
  try {
    blocks = typeof draft.body === "string" ? JSON.parse(draft.body) : (draft.body || []);
  } catch {
    blocks = [];
  }
  const imageBlocks = (Array.isArray(blocks) ? blocks : []).filter((b) => b.type === "image");
  const bodyUrls = [...new Set(imageBlocks.map((b) => b.url).filter(Boolean))];
  const videoBlocks = (Array.isArray(blocks) ? blocks : []).filter((b) => b.type === "video");

  const issues = [];
  if (!draft.image_url) issues.push("Capa AUSENTE");
  if (bodyUrls.length < 2) issues.push(`Apenas ${bodyUrls.length} imagem(ns) interna(s)`);
  if (imageBlocks.some((b) => !b.alt || !b.caption)) issues.push("Image block sem alt/caption");

  let coverStatus = "SEM CAPA";
  if (draft.image_url) coverStatus = await checkUrl(draft.image_url);

  const blockedStatuses = {};
  for (const bodyUrl of bodyUrls) {
    if (bodyUrl !== draft.image_url) blockedStatuses[bodyUrl] = await checkUrl(bodyUrl);
  }

  const hasVideo = videoBlocks.length > 0;
  const report = [
    `- ${draft.title}`,
    `  slug: ${draft.slug} | categoria: ${draft.category}`,
    `  capa: ${coverStatus} | body images: ${bodyUrls.length} (${Object.values(blockedStatuses).join(", ") || "OK"}) | videos: ${videoBlocks.length}`,
  ];
  if (issues.length > 0) {
    hasIssues = true;
    report.push(`  ⚠️ ${issues.join(" | ")}`);
  }
  console.log(report.join("\n"));
}

console.log(hasIssues ? "\nRascunhos com pendências encontrados." : "\nTodos os rascunhos estão completos.");
process.exit(hasIssues ? 1 : 0);