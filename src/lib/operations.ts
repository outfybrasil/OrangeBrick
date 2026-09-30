export interface StoredObject { path: string; bytes: number }

export function findOrphanedEditorialFiles(files: StoredObject[], trackedPaths: Iterable<string>): StoredObject[] {
  const tracked = new Set(trackedPaths);
  return files.filter((file) => file.path.startsWith("editorial/") && !tracked.has(file.path));
}

export function filterOrphanedEditorialFilePaths(paths: unknown, files: StoredObject[], trackedPaths: Iterable<string>): string[] {
  if (!Array.isArray(paths)) return [];

  const orphaned = new Set(findOrphanedEditorialFiles(files, trackedPaths).map((file) => file.path));
  const seen = new Set<string>();

  return paths.filter((path): path is string => {
    if (typeof path !== "string" || path.length > 1024 || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return false;
    if (!orphaned.has(path) || seen.has(path)) return false;
    seen.add(path);
    return true;
  }).slice(0, 100);
}

export type OrphanFileAuditAction = "delete_orphan_files_failed" | "delete_orphan_files";

export interface OrphanFileRemovalOperations {
  createPending(paths: string[]): Promise<{ id: string | null; error: boolean }>;
  remove(paths: string[]): Promise<{ errorName: string | null }>;
  updateAudit(id: string, action: OrphanFileAuditAction, details: Record<string, unknown>): Promise<boolean>;
}

export type OrphanFileRemovalResult =
  | { status: "audit_unavailable" }
  | { status: "storage_failed"; auditLogged: boolean }
  | { status: "audit_incomplete"; deleted: number }
  | { status: "removed"; deleted: number };

export async function removeOrphanedEditorialFilesWithAudit(
  paths: string[],
  operations: OrphanFileRemovalOperations,
): Promise<OrphanFileRemovalResult> {
  let auditRecord: { id: string | null; error: boolean } | null = null;
  try {
    auditRecord = await operations.createPending(paths);
  } catch {
    return { status: "audit_unavailable" };
  }
  if (auditRecord.error || !auditRecord.id) return { status: "audit_unavailable" };

  let removal: { errorName: string | null };
  try {
    removal = await operations.remove(paths);
  } catch (error) {
    removal = { errorName: error instanceof Error ? error.name : "unknown" };
  }

  if (removal.errorName) {
    let auditLogged = false;
    try {
      auditLogged = await operations.updateAudit(auditRecord.id, "delete_orphan_files_failed", {
        paths,
        error_code: removal.errorName,
      });
    } catch {
      auditLogged = false;
    }
    return { status: "storage_failed", auditLogged };
  }

  let auditLogged = false;
  try {
    auditLogged = await operations.updateAudit(auditRecord.id, "delete_orphan_files", {
      paths,
      deleted: paths.length,
    });
  } catch {
    auditLogged = false;
  }
  if (!auditLogged) return { status: "audit_incomplete", deleted: paths.length };
  return { status: "removed", deleted: paths.length };
}

export function allowsNotification(preferences: { breaking_news?: boolean; brickboard_replies?: boolean } | null, kind: "news" | "community"): boolean {
  if (!preferences) return true;
  return kind === "news" ? preferences.breaking_news !== false : preferences.brickboard_replies !== false;
}

export function retentionCutoffs(now: Date) {
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  const contactSubmissions = new Date(now);
  contactSubmissions.setUTCMonth(contactSubmissions.getUTCMonth() - 12);
  return { notifications: daysAgo(90), auditLogs: daysAgo(365), contactSubmissions: contactSubmissions.toISOString() };
}
