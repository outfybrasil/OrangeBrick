import assert from "node:assert/strict";
import test from "node:test";
import {
  allowsNotification,
  filterOrphanedEditorialFilePaths,
  findOrphanedEditorialFiles,
  removeOrphanedEditorialFilesWithAudit,
  retentionCutoffs,
  type OrphanFileRemovalOperations,
} from "../src/lib/operations.ts";

test("respeita preferências de notícias e comunidade", () => {
  assert.equal(allowsNotification(null, "news"), true);
  assert.equal(allowsNotification({ breaking_news: false }, "news"), false);
  assert.equal(allowsNotification({ brickboard_replies: false }, "community"), false);
  assert.equal(allowsNotification({ breaking_news: false }, "community"), true);
});

test("separa apenas arquivos editoriais sem registro", () => {
  const files = [
    { path: "editorial/a.webp", bytes: 10 },
    { path: "editorial/b.webp", bytes: 20 },
    { path: "avatars/legacy.webp", bytes: 30 },
  ];
  assert.deepEqual(findOrphanedEditorialFiles(files, ["editorial/a.webp"]), [{ path: "editorial/b.webp", bytes: 20 }]);
});

test("permite remover apenas arquivos editoriais órfãos existentes, sem repetição ou traversal", () => {
  const files = [
    { path: "editorial/a.webp", bytes: 10 },
    { path: "editorial/b.webp", bytes: 20 },
    { path: "editorial/../outside.webp", bytes: 30 },
    { path: "avatars/legacy.webp", bytes: 40 },
  ];

  assert.deepEqual(
    filterOrphanedEditorialFilePaths(
      ["editorial/a.webp", "editorial/a.webp", "editorial/b.webp", "editorial/../outside.webp", "avatars/legacy.webp", "editorial/missing.webp"],
      files,
      ["editorial/a.webp"],
    ),
    ["editorial/b.webp"],
  );
});

test("calcula janelas de retenção de forma determinística", () => {
  const cutoffs = retentionCutoffs(new Date("2026-08-03T12:00:00.000Z"));
  assert.equal(cutoffs.notifications, "2026-05-05T12:00:00.000Z");
  assert.equal(cutoffs.auditLogs, "2025-08-03T12:00:00.000Z");
  assert.equal(cutoffs.contactSubmissions, "2025-08-03T12:00:00.000Z");
});

test("não chama Storage quando a auditoria pendente não foi gravada", async () => {
  let removed = false;
  const operations: OrphanFileRemovalOperations = {
    async createPending() { return { id: null, error: true }; },
    async remove() { removed = true; return { errorName: null }; },
    async updateAudit() { return true; },
  };

  assert.deepEqual(await removeOrphanedEditorialFilesWithAudit(["editorial/orphan.webp"], operations), { status: "audit_unavailable" });
  assert.equal(removed, false);
});

test("registra falha do Storage e nunca informa exclusão confirmada", async () => {
  const updates: Array<{ action: string; details: Record<string, unknown> }> = [];
  const operations: OrphanFileRemovalOperations = {
    async createPending() { return { id: "audit-1", error: false }; },
    async remove() { return { errorName: "StorageError" }; },
    async updateAudit(_id, action, details) { updates.push({ action, details }); return true; },
  };

  assert.deepEqual(await removeOrphanedEditorialFilesWithAudit(["editorial/orphan.webp"], operations), {
    status: "storage_failed",
    auditLogged: true,
  });
  assert.equal(updates[0]?.action, "delete_orphan_files_failed");
  assert.equal(updates[0]?.details.error_code, "StorageError");
});

test("informa remoção real quando a conclusão da auditoria falha", async () => {
  let removeCalls = 0;
  const operations: OrphanFileRemovalOperations = {
    async createPending() { return { id: "audit-2", error: false }; },
    async remove() { removeCalls++; return { errorName: null }; },
    async updateAudit() { return false; },
  };

  assert.deepEqual(await removeOrphanedEditorialFilesWithAudit(["editorial/a.webp", "editorial/b.webp"], operations), {
    status: "audit_incomplete",
    deleted: 2,
  });
  assert.equal(removeCalls, 1);
});

test("retorna sucesso somente após Storage e auditoria confirmarem", async () => {
  const operations: OrphanFileRemovalOperations = {
    async createPending() { return { id: "audit-3", error: false }; },
    async remove() { return { errorName: null }; },
    async updateAudit() { return true; },
  };

  assert.deepEqual(await removeOrphanedEditorialFilesWithAudit(["editorial/a.webp"], operations), {
    status: "removed",
    deleted: 1,
  });
});
