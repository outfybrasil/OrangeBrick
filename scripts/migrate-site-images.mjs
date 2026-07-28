import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Variáveis do Supabase não configuradas");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const storagePrefix = `${supabaseUrl}/storage/v1/object/public/post-images/`;
const maxBytes = 10 * 1024 * 1024;
const migratedSources = new Map();

const { data: knownImages, error: knownImagesError } = await supabase
  .from("editorial_images")
  .select("source_url, public_url");
if (knownImagesError) throw knownImagesError;
for (const image of knownImages || []) migratedSources.set(image.source_url, image.public_url);

async function archive(sourceUrl, kind, ownerId, altText) {
  if (!sourceUrl || sourceUrl.startsWith(storagePrefix) || sourceUrl.startsWith("/")) return sourceUrl;
  const knownUrl = migratedSources.get(sourceUrl);
  if (knownUrl) return knownUrl;

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg",
      "User-Agent": "OrangeBrick-ArchiveMigration/1.0",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  if (source.byteLength > maxBytes) throw new Error("Arquivo acima de 10 MB");

  const pipeline = sharp(source, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
  const output = kind === "avatar"
    ? await pipeline.resize(512, 512, { fit: "cover" }).webp({ quality: 86, effort: 5 }).toBuffer()
    : kind === "community"
      ? await pipeline.resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86, effort: 5 }).toBuffer()
      : await pipeline.resize(1280, 720, { fit: "cover" }).webp({ quality: 88, effort: 5 }).toBuffer();
  const metadata = await sharp(output).metadata();
  const path = `archive/${kind}/${ownerId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from("post-images").upload(path, output, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(path);
  const { error: recordError } = await supabase.from("editorial_images").insert({
    post_id: null,
    kind: kind === "catalog" ? "release" : "cover",
    source_url: sourceUrl,
    storage_path: path,
    public_url: publicData.publicUrl,
    alt_text: altText,
    width: metadata.width,
    height: metadata.height,
    file_size: output.byteLength,
    mime_type: "image/webp",
  });
  if (recordError) {
    await supabase.storage.from("post-images").remove([path]);
    throw recordError;
  }
  migratedSources.set(sourceUrl, publicData.publicUrl);
  return publicData.publicUrl;
}

async function migrateRows(table, column, kind, label) {
  const { data: rows, error } = await supabase.from(table).select(`id,${column}`);
  if (error) throw error;
  let migrated = 0;
  let failed = 0;
  for (const row of rows || []) {
    const sourceUrl = row[column];
    if (!sourceUrl || sourceUrl.startsWith(storagePrefix) || sourceUrl.startsWith("/")) continue;
    try {
      const publicUrl = await archive(sourceUrl, kind, row.id, `${label} ${row.id}`);
      const { error: updateError } = await supabase.from(table).update({ [column]: publicUrl }).eq("id", row.id);
      if (updateError) throw updateError;
      migrated += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${table}.${column} ${row.id}: ${message}\n`);
    }
  }
  process.stdout.write(`${table}.${column}: ${migrated} migradas, ${failed} falhas.\n`);
  return failed;
}

let failures = 0;
failures += await migrateRows("release_radar_items", "image_url", "catalog", "Arte do Radar");
failures += await migrateRows("topics", "image_url", "catalog", "Imagem do assunto");
failures += await migrateRows("profiles", "avatar_url", "avatar", "Avatar");
failures += await migrateRows("community_posts", "media_url", "community", "Mídia do Brick");

const { data: profiles, error: profilesError } = await supabase.from("profiles").select("user_id, avatar_url");
if (profilesError) throw profilesError;
for (const profile of profiles || []) {
  if (!profile.avatar_url) continue;
  const { error: postsError } = await supabase.from("community_posts").update({ author_avatar: profile.avatar_url }).eq("user_id", profile.user_id);
  if (postsError) failures += 1;
  const { error: commentsError } = await supabase.from("community_comments").update({ author_avatar: profile.avatar_url }).eq("user_id", profile.user_id);
  if (commentsError) failures += 1;
}

if (failures > 0) process.exitCode = 1;
