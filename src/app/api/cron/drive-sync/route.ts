import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const categoryTags: Record<string, string> = {
  breaking: "💣 Plantão",
  hardware: "🛠️ Hard News",
  industry: "📡 Radar",
  modding: "🔧 Gambiarra",
  review: "🎮 Review",
  opinion: "🔥 Opinião",
};

function authorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function stripMarkdown(text: string) {
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

function extractMetadata(lines: string[]) {
  const metadata: Record<string, string> = {};
  const kept: string[] = [];
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

function unwrapUrl(value?: string) {
  if (!value) return null;
  const markdownLink = value.match(/^\[([^\]]+)\]\([^)]+\)$/);
  return (markdownLink?.[1] || value).replace(/\\([_])/g, "$1").trim();
}

function imageUrl(value?: string) {
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

async function reachableImageUrl(value?: string) {
  const url = imageUrl(value);
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-0" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    await response.body?.cancel();
    return response.ok ? url : null;
  } catch {
    return null;
  }
}

async function groqReview(title: string, summary: string, content: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { title, summary, content };
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você é editor do Orange Brick. Reescreva sem inventar fatos, preserve URLs e citações verificáveis, remova observações sobre IA e devolva JSON com title, summary e content. O título deve ter no máximo 70 caracteres, o resumo uma frase direta e o texto deve preservar a apuração original." },
        { role: "user", content: JSON.stringify({ title, summary, content }) },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Groq retornou ${response.status}`);
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  if (typeof parsed.title !== "string" || typeof parsed.summary !== "string" || typeof parsed.content !== "string") throw new Error("Resposta inválida do Groq");
  return { title: parsed.title.trim(), summary: parsed.summary.trim(), content: parsed.content.trim() };
}

async function imageSearch(query: string) {
  const response = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) return [];
  const html = await response.text();
  const urls = [...html.matchAll(/"murl":"(https?:\/\/[^"\\]+)"/g)].map((match) => match[1].replace(/\\u002f/g, "/"));
  return [...new Set(urls)].filter((url) => !/(unsplash|pexels|pixabay)\.com/i.test(url));
}

async function downloadEditorialImage(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  const input = Buffer.from(await response.arrayBuffer());
  const original = await sharp(input).metadata();
  if (!original.width || !original.height || original.width < 1200 || original.height < 675 || original.width / original.height < 1.65 || original.width / original.height > 1.95) return null;
  const output = await sharp(input).resize(1920, 1080, { fit: "cover", position: "centre" }).webp({ quality: 90, effort: 5 }).toBuffer();
  const metadata = await sharp(output).metadata();
  return { output, width: metadata.width || 1920, height: metadata.height || 1080 };
}

async function sourceImages(title: string, existing: string[]) {
  const candidates = [...new Set(existing.filter(Boolean))];
  const officialQueries = [
    `${title} official artwork screenshot`,
    `${title} official promotional image`,
    `${title} official logo game`,
  ];
  for (const query of officialQueries) {
    if (candidates.length >= 3) break;
    candidates.push(...await imageSearch(query));
  }
  const assets: { sourceUrl: string; output: Buffer; width: number; height: number }[] = [];
  for (const candidate of [...new Set(candidates)]) {
    if (assets.length >= 3) break;
    const image = await downloadEditorialImage(candidate).catch(() => null);
    if (image) assets.push({ sourceUrl: candidate, ...image });
  }
  if (assets.length < 3) throw new Error(`Não foi possível encontrar capa e duas imagens oficiais para ${title}`);
  return assets;
}

async function validatedBlocks(blocks: ReturnType<typeof buildBlocks>) {
  const valid: ReturnType<typeof buildBlocks> = [];
  for (const block of blocks) {
    if (block.type !== "image" || await reachableImageUrl(block.url)) valid.push(block);
  }
  return valid;
}

function buildBlocks(content: string) {
  const blocks: { id: string; type: string; content?: string; url?: string; alt?: string; caption?: string }[] = [];
  const lines = content.split("\n");
  let textBuffer: string[] = [];
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
        url: unwrapUrl(imageMatch[2]) || "",
        alt: imageMatch[1] || "",
        caption: "",
      });
    } else if (htmlImageMatch) {
      flushText();
      blocks.push({
        id: `block-${index++}`,
        type: "image",
        url: unwrapUrl(htmlImageMatch[1]) || "",
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

function buildSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

function buildSummary(lines: string[]) {
  for (const line of lines) {
    const text = stripMarkdown(line);
    if (text.length >= 20) return text.length > 150 ? `${text.slice(0, 147).trimEnd()}...` : text;
  }
  const fallback = stripMarkdown(lines.join(" "));
  return fallback.length > 150 ? `${fallback.slice(0, 147).trimEnd()}...` : fallback;
}

async function driveListChildren(folderId: string) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const query = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,modifiedTime)",
    pageSize: "1000",
    orderBy: "modifiedTime desc",
  });
  if (apiKey) query.set("key", apiKey);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha ao listar pasta do Drive (${response.status})`);
  }
  const data = (await response.json()) as { files?: { id: string; name: string; mimeType: string; modifiedTime?: string }[] };
  return data.files ?? [];
}

function saoPauloDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

async function driveListFiles(folderId: string) {
  const rootItems = await driveListChildren(folderId);
  const { year, month, day } = saoPauloDateParts();
  const todayNames = new Set([`${year}-${month}-${day}`, `${day}-${month}-${year}`]);
  const files = rootItems.filter((item) => item.mimeType !== "application/vnd.google-apps.folder");
  const todayFolder = rootItems.find((item) => item.mimeType === "application/vnd.google-apps.folder" && todayNames.has(item.name));
  if (!todayFolder) return files;
  const todayItems = await driveListChildren(todayFolder.id);
  return [...files, ...todayItems.filter((item) => item.mimeType !== "application/vnd.google-apps.folder")];
}

async function markImported(supabase: ReturnType<typeof serviceClient>, driveFileId: string, postId: string) {
  const { error } = await supabase.from("drive_import_registry").upsert({
    drive_file_id: driveFileId,
    post_id: postId,
    status: "imported",
    updated_at: new Date().toISOString(),
  });
  if (error && error.code !== "PGRST205" && !error.message.includes("schema cache")) throw error;
}

async function exportMarkdown(fileId: string) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const query = apiKey ? `&key=${apiKey}` : "";
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/markdown${query}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`Falha ao exportar documento (${response.status})`);
  }
  return response.text();
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    return NextResponse.json({ error: "GOOGLE_DRIVE_FOLDER_ID não configurado" }, { status: 500 });
  }

  const supabase = serviceClient();
  const ignoredFileIds = new Set(
    (process.env.GOOGLE_DRIVE_IGNORED_FILE_IDS || "").split(",").map((id) => id.trim()).filter(Boolean),
  );
  const results = { imported: 0, skipped: 0, failed: 0, failures: [] as { name: string; error: string }[] };

  try {
    const files = await driveListFiles(folderId);
    for (const file of files) {
      try {
        if (/^Matérias Orange Brick\b/i.test(file.name) || ignoredFileIds.has(file.id)) {
          results.skipped++;
          continue;
        }
        const { data: registryEntry, error: registryError } = await supabase
          .from("drive_import_registry")
          .select("drive_file_id")
          .eq("drive_file_id", file.id)
          .maybeSingle();
        const registryUnavailable = registryError?.code === "PGRST205" || registryError?.message.includes("schema cache");
        if (registryError && !registryUnavailable) throw registryError;
        const { data: tombstone } = await supabase.storage
          .from("post-images")
          .download(`system/drive-import-tombstones/${file.id}.png`);
        const { data: deletedEntry, error: deletedEntryError } = await supabase
          .from("admin_audit_log")
          .select("id")
          .eq("action", "delete")
          .eq("target_type", "drive_import")
          .eq("target_id", file.id)
          .limit(1)
          .maybeSingle();
        const auditUnavailable = deletedEntryError?.code === "PGRST205" || deletedEntryError?.message.includes("schema cache");
        if (deletedEntryError && !auditUnavailable) throw deletedEntryError;
        if (registryEntry || deletedEntry || tombstone) {
          results.skipped++;
          continue;
        }
        const markdown = await exportMarkdown(file.id);
        const lines = markdown.split("\n").map((l) => l.replace(/\r$/, ""));
        const { metadata, kept } = extractMetadata(lines);

        let title = metadata.title;
        const h1 = kept.find((l) => l.trim().startsWith("# "));
        if (h1) {
          title = h1.replace(/^#\s+/, "").trim();
          kept.splice(kept.indexOf(h1), 1);
        }
        title = (title || file.name.replace(/\.md$/i, "").trim()).replace(/\*\*/g, "").trim();

        const category = metadata.categoria && categoryTags[metadata.categoria.toLowerCase()]
          ? metadata.categoria.toLowerCase()
          : "industry";
        const slug = buildSlug(title);

        const authorByLine = kept.find((l) => /^(?:[Pp]or|Autor):/.test(stripMarkdown(l.trim())));
        let authorName = metadata.autor || "The Brick";
        if (authorByLine !== undefined) {
          authorName = stripMarkdown(authorByLine).replace(/^(?:[Pp]or|Autor):\s*/i, "").trim();
          kept.splice(kept.indexOf(authorByLine), 1);
        }

        const originalContent = kept.join("\n");
        const reviewed = await groqReview(title, metadata.resumo || buildSummary(kept), originalContent);
        title = reviewed.title.replace(/\*\*/g, "").trim();
        const summary = reviewed.summary;
        const blocks = await validatedBlocks(buildBlocks(reviewed.content));
        const coverUrl = await reachableImageUrl(metadata.capa) || await reachableImageUrl(metadata.imagem_hd);

        const { data: existing } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
        if (existing) {
          await markImported(supabase, file.id, existing.id);
          results.skipped++;
          continue;
        }

        const { data: importedPost, error: insertError } = await supabase.from("posts").insert([
          {
            slug,
            title: title.toUpperCase(),
            summary,
            body: "[]",
            category,
            image_url: null,
            image_alt: metadata.alt || metadata.legenda || null,
            author_name: authorName,
            author_tag: categoryTags[category],
            is_published: false,
            published_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            information_status: "confirmed",
            featured_quote: null,
            editorial_sources: [{ name: "Google Drive", url: `https://drive.google.com/file/d/${file.id}/view` }],
            correction_note: null,
          },
        ]).select("id").single();
        if (insertError) {
          results.failed++;
          results.failures.push({ name: file.name, error: insertError.message });
        } else {
          const existingImages = [coverUrl || "", ...blocks.filter((block) => block.type === "image").map((block) => block.url || "")];
          try {
            const assets = await sourceImages(title, existingImages);
            const publicUrls: string[] = [];
            for (let index = 0; index < assets.length; index += 1) {
              const asset = assets[index];
              const storagePath = `editorial/${importedPost.id}/${index === 0 ? "cover" : `body-${index}`}-${crypto.randomUUID()}.webp`;
              const { error: uploadError } = await supabase.storage.from("post-images").upload(storagePath, asset.output, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
              if (uploadError) throw uploadError;
              const publicUrl = supabase.storage.from("post-images").getPublicUrl(storagePath).data.publicUrl;
              publicUrls.push(publicUrl);
              const { error: imageError } = await supabase.from("editorial_images").insert({ post_id: importedPost.id, kind: index === 0 ? "cover" : "body", source_url: asset.sourceUrl, storage_path: storagePath, public_url: publicUrl, alt_text: index === 0 ? (metadata.alt || `Capa oficial de ${title}`) : `Imagem oficial relacionada a ${title}`, width: asset.width, height: asset.height, file_size: asset.output.byteLength, mime_type: "image/webp" });
              if (imageError) throw imageError;
            }
            const textBlocks = blocks.filter((block) => block.type === "text");
            const textParts = textBlocks.map((block) => block.content || "").filter(Boolean);
            const first = textParts.slice(0, Math.max(1, Math.ceil(textParts.length / 3))).join("\n\n");
            const secondStart = Math.max(1, Math.ceil(textParts.length / 3));
            const secondEnd = Math.max(secondStart + 1, Math.ceil((textParts.length * 2) / 3));
            const second = textParts.slice(secondStart, secondEnd).join("\n\n");
            const third = textParts.slice(secondEnd).join("\n\n");
            const finalBlocks = [
              { id: crypto.randomUUID(), type: "text", content: first || summary },
              { id: crypto.randomUUID(), type: "image", url: publicUrls[1], alt: `Imagem oficial relacionada a ${title}`, caption: `Material oficial relacionado a ${title}.` },
              { id: crypto.randomUUID(), type: "text", content: second || summary },
              { id: crypto.randomUUID(), type: "image", url: publicUrls[2], alt: `Segunda imagem oficial relacionada a ${title}`, caption: `Segundo ângulo do material oficial de ${title}.` },
              { id: crypto.randomUUID(), type: "text", content: third || summary },
            ];
            const { error: finalizeError } = await supabase.from("posts").update({ title: title.toUpperCase(), summary, body: JSON.stringify(finalBlocks), image_url: publicUrls[0], image_alt: metadata.alt || `Capa oficial de ${title}`, updated_at: new Date().toISOString() }).eq("id", importedPost.id);
            if (finalizeError) throw finalizeError;
            await markImported(supabase, file.id, importedPost.id);
            results.imported++;
          } catch (imageError) {
            const uploadedImages = await supabase.from("editorial_images").select("storage_path").eq("post_id", importedPost.id);
            if (uploadedImages.data?.length) await supabase.storage.from("post-images").remove(uploadedImages.data.map((image) => image.storage_path));
            await supabase.from("editorial_images").delete().eq("post_id", importedPost.id);
            await supabase.from("posts").delete().eq("id", importedPost.id);
            throw imageError;
          }
        }
      } catch (err) {
        results.failed++;
        results.failures.push({ name: file.name, error: err instanceof Error ? err.message : "Erro desconhecido" });
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha na sincronização" },
      { status: 500 },
    );
  }

  return NextResponse.json(results);
}
