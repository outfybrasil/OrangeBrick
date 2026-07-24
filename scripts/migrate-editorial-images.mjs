import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Variáveis do Supabase não configuradas");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const width = 1280;
const height = 720;
const maxBytes = 10 * 1024 * 1024;

async function download(url) {
  if (url.startsWith("/")) {
    const publicRoot = resolve(process.cwd(), "public");
    const localPath = resolve(publicRoot, url.slice(1));
    if (!localPath.startsWith(`${publicRoot}${sep}`)) throw new Error("Caminho local incompatível");
    const buffer = await readFile(localPath);
    if (buffer.byteLength > maxBytes) throw new Error("Arquivo acima de 10 MB");
    return buffer;
  }
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("URL incompatível");
  const response = await fetch(parsed, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg",
      "User-Agent": "OrangeBrick-ArchiveMigration/1.0",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > maxBytes) throw new Error("Arquivo acima de 10 MB");
  return buffer;
}

async function convert(source) {
  const background = await sharp(source)
    .rotate()
    .resize(width, height, { fit: "cover" })
    .blur(28)
    .modulate({ brightness: 0.42, saturation: 0.78 })
    .webp({ quality: 78 })
    .toBuffer();
  const foreground = await sharp(source)
    .rotate()
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp(background)
    .composite([{ input: foreground, gravity: "center" }])
    .webp({ quality: 84, effort: 5 })
    .toBuffer();
}

const { data: existingRows, error: existingError } = await supabase
  .from("editorial_images")
  .select("*");
if (existingError) throw existingError;

const existingByPublicUrl = new Map((existingRows || []).map((image) => [image.public_url, image]));
const existingBySource = new Map(
  (existingRows || []).map((image) => [`${image.post_id}:${image.kind}:${image.source_url}`, image])
);

async function migrateImage(post, sourceUrl, altText, kind) {
  if (!sourceUrl) return null;
  const alreadyStored = existingByPublicUrl.get(sourceUrl);
  if (alreadyStored) return alreadyStored;

  const key = `${post.id}:${kind}:${sourceUrl}`;
  const existing = existingBySource.get(key);
  if (existing) return existing;

  const source = await download(sourceUrl);
  const output = await convert(source);
  const path = `editorial/${post.id}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from("post-images").upload(path, output, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(path);
  const { data, error } = await supabase
    .from("editorial_images")
    .insert({
      post_id: post.id,
      kind,
      source_url: sourceUrl,
      storage_path: path,
      public_url: publicData.publicUrl,
      alt_text: altText || null,
      width,
      height,
      file_size: output.byteLength,
      mime_type: "image/webp",
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from("post-images").remove([path]);
    throw error;
  }

  existingByPublicUrl.set(data.public_url, data);
  existingBySource.set(key, data);
  return data;
}

const { data: posts, error: postsError } = await supabase
  .from("posts")
  .select("*")
  .order("created_at", { ascending: true });
if (postsError) throw postsError;

let migrated = 0;
let failed = 0;

for (const post of posts || []) {
  try {
    let nextCoverUrl = post.image_url;
    if (post.image_url) {
      const cover = await migrateImage(post, post.image_url, post.image_alt, "cover");
      if (cover) {
        nextCoverUrl = cover.public_url;
        migrated += 1;
      }
    }

    let blocks;
    try {
      blocks = JSON.parse(post.body);
    } catch {
      blocks = null;
    }

    let nextBody = post.body;
    if (Array.isArray(blocks)) {
      const nextBlocks = [];
      for (const block of blocks) {
        if (block?.type === "image" && typeof block.url === "string" && block.url) {
          const bodyImage = await migrateImage(post, block.url, block.alt, "body");
          nextBlocks.push(bodyImage ? { ...block, url: bodyImage.public_url } : block);
          if (bodyImage) migrated += 1;
        } else {
          nextBlocks.push(block);
        }
      }
      nextBody = JSON.stringify(nextBlocks);
    }

    if (nextCoverUrl !== post.image_url || nextBody !== post.body) {
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          image_url: nextCoverUrl,
          body: nextBody,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
      if (updateError) throw updateError;
    }
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${post.slug}: ${message}\n`);
  }
}

process.stdout.write(`Imagens processadas: ${migrated}. Matérias com falha: ${failed}.\n`);
if (failed > 0) process.exitCode = 1;
