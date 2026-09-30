import assert from "node:assert/strict";
import test from "node:test";
import { summarizeMigrationReadiness } from "../scripts/migration-readiness.mjs";

test("exige confirmação remota além de versões locais únicas", () => {
  const result = summarizeMigrationReadiness(["20260924000000_first.sql", "20260924000001_second.sql"], false);

  assert.equal(result.local_versions_unique, true);
  assert.equal(result.remote_history_confirmed, false);
  assert.equal(result.ready, false);
  assert.equal(result.confirmation_variable, "PRODUCTION_MIGRATION_HISTORY_CONFIRMED");
});

test("aceita histórico confirmado quando as versões locais são únicas", () => {
  const result = summarizeMigrationReadiness(["20260924000000_first.sql", "20260924000001_second.sql"], true);

  assert.equal(result.ready, true);
  assert.deepEqual(result.duplicate_versions, []);
});

test("rejeita colisões locais mesmo com confirmação remota", () => {
  const result = summarizeMigrationReadiness(["20260924000000_first.sql", "20260924000000_second.sql"], true);

  assert.equal(result.local_versions_unique, false);
  assert.equal(result.ready, false);
  assert.equal(result.duplicate_versions.length, 1);
  assert.equal(result.duplicate_versions[0].version, "20260924000000");
});
