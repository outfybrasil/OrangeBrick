export interface StoredObject { path: string; bytes: number }

export function findOrphanedEditorialFiles(files: StoredObject[], trackedPaths: Iterable<string>): StoredObject[] {
  const tracked = new Set(trackedPaths);
  return files.filter((file) => file.path.startsWith("editorial/") && !tracked.has(file.path));
}

export function allowsNotification(preferences: { breaking_news?: boolean; brickboard_replies?: boolean } | null, kind: "news" | "community"): boolean {
  if (!preferences) return true;
  return kind === "news" ? preferences.breaking_news !== false : preferences.brickboard_replies !== false;
}

export function retentionCutoffs(now: Date) {
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  return { notifications: daysAgo(90), auditLogs: daysAgo(365) };
}
