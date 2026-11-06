import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialInstagramPublication, SocialPostDraft } from "../types/database";

export const socialDraftBucket = "social-post-drafts";
export const socialMediaBucket = "social-post-media";

export async function ensureSocialBucket(db: SupabaseClient, media = false) {
  const bucket = media ? socialMediaBucket : socialDraftBucket;
  const { data, error } = await db.storage.getBucket(bucket);
  if (error && Number(error.statusCode) !== 404 && !/bucket.*not found/i.test(error.message)) throw new Error("Não foi possível acessar o armazenamento de posts.");
  if (data?.public) throw new Error("O armazenamento de posts precisa ser privado.");
  if (!data) {
    const { error } = await db.storage.createBucket(bucket, { public: false, fileSizeLimit: media ? 3 * 1024 * 1024 : 100_000, allowedMimeTypes: media ? ["image/jpeg"] : ["application/json"] });
    if (error && Number(error.statusCode) !== 409 && !/already exists/i.test(error.message)) throw new Error("Não foi possível preparar o armazenamento de posts.");
  }
}

function prefix(postId: string, format: SocialPostDraft["format"]) { return `instagram/${postId}/${format}`; }
function filename(postId: string, format: SocialPostDraft["format"], attempt: number) { return `${prefix(postId, format)}/${String(attempt).padStart(8, "0")}.json`; }

export async function latestInstagramPublication(db: SupabaseClient, postId: string, format: SocialPostDraft["format"]): Promise<SocialInstagramPublication | null> {
  const { data, error } = await db.storage.from(socialDraftBucket).list(prefix(postId, format), { limit: 100, sortBy: { column: "name", order: "desc" } });
  if (error) {
    if (Number(error.statusCode) === 404 || /bucket.*not found/i.test(error.message)) return null;
    throw new Error("Não foi possível conferir o histórico do Instagram.");
  }
  const latest = data?.find(file => /^\d{8}\.json$/.test(file.name));
  if (!latest) return null;
  const { data: blob, error: readError } = await db.storage.from(socialDraftBucket).download(`${prefix(postId, format)}/${latest.name}`);
  if (readError || !blob) throw new Error("Não foi possível ler o histórico do Instagram.");
  const record = JSON.parse(await blob.text()) as SocialInstagramPublication;
  if (!Number.isInteger(record.attempt) || record.attempt < 1 || !["processing", "published", "failed", "unknown"].includes(record.status)) throw new Error("O histórico do Instagram precisa ser revisado.");
  return record;
}

export async function claimInstagramPublication(db: SupabaseClient, postId: string, format: SocialPostDraft["format"], batchId: string, account: { id: string; username: string }, republishOf?: number) {
  await ensureSocialBucket(db);
  const latest = await latestInstagramPublication(db, postId, format);
  if (republishOf !== undefined ? latest?.status !== "published" || latest.attempt !== republishOf : latest && latest.status !== "failed") return null;
  const now = new Date().toISOString();
  const record: SocialInstagramPublication = { attempt: (latest?.attempt || 0) + 1, batchId, status: "processing", phase: "creating", accountId: account.id, username: account.username, containerId: null, mediaId: null, permalink: null, error: null, createdAt: now, updatedAt: now };
  if (record.attempt > 99_999_999) throw new Error("Limite de tentativas atingido.");
  const { error } = await db.storage.from(socialDraftBucket).upload(filename(postId, format, record.attempt), JSON.stringify(record), { upsert: false, contentType: "application/json", cacheControl: "0" });
  if (error) {
    if (Number(error.statusCode) === 409 || /already exists|duplicate/i.test(error.message)) return null;
    throw new Error("Não foi possível reservar o envio ao Instagram.");
  }
  return record;
}

export async function saveInstagramPublication(db: SupabaseClient, postId: string, format: SocialPostDraft["format"], record: SocialInstagramPublication) {
  record.updatedAt = new Date().toISOString();
  const { error } = await db.storage.from(socialDraftBucket).upload(filename(postId, format, record.attempt), JSON.stringify(record), { upsert: true, contentType: "application/json", cacheControl: "0" });
  if (error) throw new Error("O resultado não pôde ser salvo. Confira o Instagram antes de repetir o envio.");
}

export function summarizeInstagramPublications(records: Partial<Record<SocialPostDraft["format"], SocialInstagramPublication | null>>): import("../types/database").SocialPostListStatus {
  const publishedFormats = (["single", "carousel"] as const).filter(format => records[format]?.status === "published");
  if (publishedFormats.length) return { status: "published", publishedFormats };
  const values = Object.values(records);
  for (const status of ["processing", "unknown", "failed"] as const) if (values.some(record => record?.status === status)) return { status, publishedFormats };
  return { status: "not_sent", publishedFormats };
}
