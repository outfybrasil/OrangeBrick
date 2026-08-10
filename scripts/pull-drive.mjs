import { createSign } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const fileArg = args.find((a) => a.startsWith("--file="))?.split("=")[1];
const folderArg = args.find((a) => a.startsWith("--folder="))?.split("=")[1];
const ignoredFileIds = new Set(
  (process.env.GOOGLE_DRIVE_IGNORED_FILE_IDS || "").split(",").map((id) => id.trim()).filter(Boolean)
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STATE_PATH = resolve("scripts", ".drive-sync-state.json");
const stateFile = existsSync(STATE_PATH) ? JSON.parse(await readFile(STATE_PATH, "utf8")) : {};
const syncedByDriveId = stateFile.synced ?? {};
const syncedBySlug = stateFile.slugs ?? [];

const categoryTags = {
  breaking: "💣 Plantão",
  hardware: "🛠️ Hard News",
  industry: "📡 Radar",
  modding: "🔧 Gambiarra",
  review: "🎮 Review",
  opinion: "🔥 Opinião",
};

function encode64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function serviceAccountCredentials() {
  const jsonPath = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if (jsonPath && existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, "utf8"));
  }
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  if (email && privateKey) return { client_email: email, private_key: privateKey };
  return null;
}

async function getAccessToken() {
  const credentials = serviceAccountCredentials();
  if (!credentials) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = encode64({ alg: "RS256", typ: "JWT" });
  const claims = encode64({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const unsigned = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(credentials.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(`${unsigned}.${signature}`)}`,
  });
  const data = await response.json();
  if (!data.access_token) throw new Error(`Falha na autenticação do service account: ${data.error_description ?? data.error}`);
  return data.access_token;
}

async function driveRequest(pathname, searchParams) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const token = await getAccessToken();
  const query = new URLSearchParams(searchParams);
  if (!token) {
    if (!apiKey) {
      throw new Error(
        "Nenhuma credencial do Drive configurada. Defina GOOGLE_DRIVE_API_KEY (pasta pública) ou GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON (pasta privada, recomendado)"
      );
    }
    query.set("key", apiKey);
  }
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`https://www.googleapis.com/drive/v3${pathname}?${query}`, { headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Erro na API do Drive (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.json();
}

async function exportMarkdown(fileId, mimeType) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const token = await getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let target;
  if (mimeType === "application/vnd.google-apps.document") {
    const query = token ? "" : `&key=${apiKey}`;
    target = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/markdown${query}`;
  } else {
    const query = token ? "" : `&key=${apiKey}`;
    target = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${query}`;
  }
  const response = await fetch(target, { headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Erro ao exportar o documento (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.text();
}

function extractMetadata(lines) {
  const metadata = {};
  const kept = [];
  for (const line of lines) {
    const cleaned = line.replace(/\*/g, "").replace(/\\([\[\]_])/g, "$1").trim();
    const match = cleaned.match(/^\[?(Categoria|Resumo|Autor|Capa|Alt|Imagem_HD|Legenda)\]?:\s*(.+)$/i);
    if (match && !metadata[match[1].toLowerCase()]) {
      metadata[match[1].toLowerCase()] = match[2].trim();
    } else {
      kept.push(line);
    }
  }
  return { metadata, kept };
}

function unwrapUrl(value) {
  if (!value) return null;
  const markdownLink = value.match(/^\[([^\]]+)\]\([^)]+\)$/);
  return (markdownLink?.[1] || value).replace(/\\([_])/g, "$1").trim();
}

function imageUrl(value) {
  const url = unwrapUrl(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (/(^|\.)(unsplash\.com|pexels\.com|pixabay\.com)$/i.test(parsed.hostname)) return null;
    return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(parsed.pathname) ? url : null;
  } catch {
    return null;
  }
}

async function reachableImageUrl(value) {
  const url = imageUrl(value);
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(8000) });
    await response.body?.cancel();
    return response.ok ? url : null;
  } catch {
    return null;
  }
}

async function validatedBlocks(blocks) {
  const valid = [];
  for (const block of blocks) {
    if (block.type !== "image" || await reachableImageUrl(block.url)) valid.push(block);
  }
  return valid;
}

function buildBlocks(content) {
  const blocks = [];
  const lines = content.split("\n");
  let textBuffer = [];
  let index = 0;

  const flushText = () => {
    const text = textBuffer.join("\n").trim();
    if (text) {
      blocks.push({ id: `block-${index++}`, type: "text", content: text });
    }
    textBuffer = [];
  };

  for (const line of lines) {
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    const htmlImageMatch = line.match(/^\\?<img\s+src="([^"]+)"\s+alt="([^"]*)"\s*\/?>$/i);
    if (imageMatch) {
      flushText();
      blocks.push({
        id: `block-${index++}`,
        type: "image",
        url: unwrapUrl(imageMatch[2]),
        alt: imageMatch[1] || "",
        caption: "",
      });
    } else if (htmlImageMatch) {
      flushText();
      blocks.push({
        id: `block-${index++}`,
        type: "image",
        url: unwrapUrl(htmlImageMatch[1]),
        alt: htmlImageMatch[2],
        caption: "",
      });
    } else if (/^#\s+/.test(line.trim())) {
      flushText();
      textBuffer.push(line.replace(/^#\s+/, "## ").replace(/\*\*/g, ""));
    } else if (line.trim().startsWith("## ") || line.trim().startsWith("### ")) {
      flushText();
      textBuffer.push(line.replace(/\*\*/g, ""));
    } else {
      textBuffer.push(line);
    }
  }
  flushText();
  return blocks;
}

function buildSlug(title) {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug.slice(0, 90);
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, "$1$2")
    .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSummary(lines) {
  for (const line of lines) {
    const text = stripMarkdown(line);
    if (text.length >= 20) return text.length > 150 ? `${text.slice(0, 147).trimEnd()}...` : text;
  }
  const fallback = stripMarkdown(lines.join(" "));
  return fallback.length > 150 ? `${fallback.slice(0, 147).trimEnd()}...` : fallback;
}

async function postExists(slug) {
  const { data } = await supabase.from("posts").select("id").eq("slug", slug).single();
  return Boolean(data);
}

async function importDocument(file) {
  const { id, name, mimeType } = file;
  if (ignoredFileIds.has(id)) {
    console.log(`⏭ Documento bloqueado (${name})`);
    return { status: "skipped" };
  }
  if (/^Matérias Orange Brick\b/i.test(name)) {
    console.log(`⏭ Documento agregador ignorado (${name})`);
    return { status: "skipped" };
  }
  if (syncedByDriveId[id] && !force) {
    console.log(`⏭ Já importado (${name}) — use --force para reimportar`);
    return { status: "skipped" };
  }
  const markdown = await exportMarkdown(id, mimeType);
  const lines = markdown.split("\n").map((l) => l.replace(/\r$/, ""));
  const { metadata, kept } = extractMetadata(lines);

  let title = metadata.title;
  const h1 = kept.find((l) => l.trim().startsWith("# "));
  if (h1) {
    title = h1.replace(/^#\s+/, "").trim();
    const idx = kept.indexOf(h1);
    kept.splice(idx, 1);
  }
  title = (title || name.replace(/\.md$/i, "").trim()).replace(/\*\*/g, "").trim();

  const category = metadata.categoria && categoryTags[metadata.categoria.toLowerCase()]
    ? metadata.categoria.toLowerCase()
    : "industry";
  const slug = buildSlug(title);
  const authorLine = stripMarkdown(metadata.autor || "");
  const authorByLine = kept.find((l) => /^(?:[Pp]or|Autor):/.test(stripMarkdown(l.trim())));
  let authorName = authorByLine || authorLine;
  if (authorByLine !== undefined) {
    authorName = stripMarkdown(authorByLine).replace(/^(?:[Pp]or|Autor):\s*/i, "").trim();
    kept.splice(kept.indexOf(authorByLine), 1);
  }
  const summary = metadata.resumo || buildSummary(kept);
  const blocks = await validatedBlocks(buildBlocks(kept.join("\n")));
  const coverUrl = await reachableImageUrl(metadata.capa) || await reachableImageUrl(metadata.imagem_hd);

  if (await postExists(slug) && !force) {
    console.log(`⏭ Slug já existe (${slug}) — use --force para reimportar`);
    return { status: "skipped" };
  }

  const post = {
    slug,
    title: title.toUpperCase(),
    summary,
    body: JSON.stringify(blocks),
    category,
    image_url: coverUrl,
    image_alt: metadata.alt || metadata.legenda || null,
    author_name: authorName,
    author_tag: categoryTags[category],
    is_published: false,
    published_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    information_status: "confirmed",
    featured_quote: null,
    editorial_sources: [],
    correction_note: null,
  };

  if (dryRun) {
    console.log(`\n🔎 DRY-RUN — ${title}`);
    console.log(`Slug: ${slug}`);
    console.log(`Categoria: ${category}`);
    console.log(`Resumo: ${summary}`);
    console.log(`Blocos: ${blocks.length}`);
    console.log("---");
    return { status: "dry-run" };
  }

  const { error } = await supabase.from("posts").insert([post]);
  if (error) {
    console.error(`❌ Erro ao salvar ${title}: ${error.message}`);
    return { status: "error" };
  }

  syncedByDriveId[id] = slug;
  if (!syncedBySlug.includes(slug)) syncedBySlug.push(slug);
  await writeFile(STATE_PATH, JSON.stringify({ synced: syncedByDriveId, slugs: syncedBySlug }, null, 2));

  console.log(`✅ Importado como rascunho: ${title} (/${slug})`);
  return { status: "imported" };
}

const folderId = folderArg || process.env.GOOGLE_DRIVE_FOLDER_ID;
if (!fileArg && !folderId) {
  console.error("Defina GOOGLE_DRIVE_FOLDER_ID no .env ou passe --folder=<id> (ou --file=<id> para um documento específico)");
  process.exit(1);
}

console.log(dryRun ? "MODO DRY-RUN — nada será salvo" : "Sincronizando Google Drive → rascunhos do Supabase");

const results = { imported: 0, skipped: 0, error: 0, dryRun: 0 };

try {
  if (fileArg) {
    const file = await driveRequest(`/files/${fileArg}`, { fields: "id,name,mimeType" });
    const result = await importDocument(file);
    if (result.status === "imported") results.imported++;
    else if (result.status === "skipped") results.skipped++;
    else if (result.status === "error") results.error++;
    else results.dryRun++;
  } else {
    const data = await driveRequest("/files", {
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id,name,mimeType)",
      pageSize: "100",
      orderBy: "modifiedTime desc",
    });
    const files = data.files ?? [];
    if (files.length === 0) {
      console.log("Nenhum documento encontrado na pasta.");
    }
    for (const file of files) {
      const result = await importDocument(file);
      if (result.status === "imported") results.imported++;
      else if (result.status === "skipped") results.skipped++;
      else if (result.status === "error") results.error++;
      else results.dryRun++;
    }
  }
} catch (err) {
  console.error("Erro:", err.message);
  process.exit(1);
}

console.log(
  `\nResumo: ${results.imported} importados, ${results.skipped} ignorados, ${results.dryRun} dry-run, ${results.error} com erro`
);
await writeFile(STATE_PATH, JSON.stringify({ synced: syncedByDriveId, slugs: syncedBySlug }, null, 2));
