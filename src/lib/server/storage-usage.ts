import type { SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_QUOTA_BYTES = Number(process.env.STORAGE_QUOTA_BYTES) || 1024 ** 3;
export const STORAGE_ALERT_RATIO = 0.7;

export type StoredFile = { path: string; bytes: number };
export type StorageUsage = { bytes: number; files: number; quotaBytes: number; ratio: number; buckets: Array<{ id: string; files: number; bytes: number }> };

export async function listBucketFiles(supabase: SupabaseClient, bucket: string, prefix = ""): Promise<StoredFile[]> {
  const files: StoredFile[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    for (const item of data || []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.metadata) files.push({ path, bytes: Number(item.metadata.size || 0) });
      else files.push(...await listBucketFiles(supabase, bucket, path));
    }
    if (!data || data.length < 1000) return files;
  }
}

export async function measureStorageUsage(supabase: SupabaseClient): Promise<StorageUsage> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const measured = await Promise.all((buckets || []).map(async (bucket) => {
    const files = await listBucketFiles(supabase, bucket.id);
    return { id: bucket.id, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0) };
  }));
  const bytes = measured.reduce((sum, bucket) => sum + bucket.bytes, 0);
  return {
    bytes,
    files: measured.reduce((sum, bucket) => sum + bucket.files, 0),
    quotaBytes: STORAGE_QUOTA_BYTES,
    ratio: bytes / STORAGE_QUOTA_BYTES,
    buckets: measured.sort((a, b) => b.bytes - a.bytes),
  };
}
