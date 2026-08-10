import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function driveListFiles(folderId: string) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const query = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType)",
    pageSize: "100",
    orderBy: "modifiedTime desc",
  });
  if (apiKey) query.set("key", apiKey);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha ao listar pasta do Drive (${response.status})`);
  }
  const data = (await response.json()) as { files?: { id: string; name: string; mimeType: string }[] };
  return data.files ?? [];
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

        const summary = metadata.resumo || buildSummary(kept);
        const blocks = await validatedBlocks(buildBlocks(kept.join("\n")));
        const coverUrl = await reachableImageUrl(metadata.capa) || await reachableImageUrl(metadata.imagem_hd);

        const { data: existing } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
        if (existing) {
          results.skipped++;
          continue;
        }

        const { error: insertError } = await supabase.from("posts").insert([
          {
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
            editorial_sources: [{ name: "Google Drive", url: `https://drive.google.com/file/d/${file.id}/view` }],
            correction_note: null,
          },
        ]);
        if (insertError) {
          results.failed++;
          results.failures.push({ name: file.name, error: insertError.message });
        } else {
          results.imported++;
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
