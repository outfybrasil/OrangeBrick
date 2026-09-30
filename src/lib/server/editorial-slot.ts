const STALE_SLOT_MS = 360_000;
const SCHEDULED_EDITORIAL_SLOTS = new Set(["11", "17", "20"]);

export function isScheduledEditorialSlot(slot: string | null): slot is "11" | "17" | "20" {
  return slot !== null && SCHEDULED_EDITORIAL_SLOTS.has(slot);
}

export interface EditorialSlotRecord {
  value: string;
  updated_at: string;
}

export interface EditorialSlotStore {
  readSlot(key: string): Promise<EditorialSlotRecord | null>;
  insertRunningSlot(key: string, updatedAt: string): Promise<boolean>;
  isPostPublished(postId: string): Promise<boolean>;
  compareAndSetSlot(
    key: string,
    expectedValue: string,
    expectedUpdatedAt: string,
    nextValue: string,
    nextUpdatedAt: string,
  ): Promise<boolean>;
}

export async function claimEditorialSlot(store: EditorialSlotStore, key: string, now = Date.now()): Promise<boolean> {
  const existing = await store.readSlot(key);
  const updatedAt = new Date(now).toISOString();
  if (!existing) return store.insertRunningSlot(key, updatedAt);

  const age = now - Date.parse(existing.updated_at);
  const stale = Number.isFinite(age) && age > STALE_SLOT_MS;
  if (existing.value === "failed" || (existing.value === "running" && stale)) {
    return store.compareAndSetSlot(key, existing.value, existing.updated_at, "running", updatedAt);
  }

  const publishingPrefix = "publishing:";
  if (existing.value.startsWith(publishingPrefix) && stale) {
    const postId = existing.value.slice(publishingPrefix.length);
    if (!postId) return false;
    if (await store.isPostPublished(postId)) {
      await store.compareAndSetSlot(key, existing.value, existing.updated_at, `published:${postId}`, updatedAt);
      return false;
    }
    return store.compareAndSetSlot(key, existing.value, existing.updated_at, "running", updatedAt);
  }

  return false;
}
