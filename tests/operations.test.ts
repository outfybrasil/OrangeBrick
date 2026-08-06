import assert from "node:assert/strict";
import test from "node:test";
import { allowsNotification, findOrphanedEditorialFiles, retentionCutoffs } from "../src/lib/operations.ts";

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

test("calcula janelas de retenção de forma determinística", () => {
  const cutoffs = retentionCutoffs(new Date("2026-08-03T12:00:00.000Z"));
  assert.equal(cutoffs.notifications, "2026-05-05T12:00:00.000Z");
  assert.equal(cutoffs.auditLogs, "2025-08-03T12:00:00.000Z");
});
