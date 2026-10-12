import assert from "node:assert/strict";
import test from "node:test";
import { assertEditorialReviewAudit } from "../src/lib/ai/editorial-review-audit.ts";

const source = { url: "https://example.org/article/official-game", text: "The publisher confirms this game launches on PlayStation 5 and Xbox Series X in November." };
const audit = { supported: true, issues: [], checks: ["title", "summary", "intro_text", "development_text", "conclusion_text"].map((section) => ({ section, source_url: source.url, excerpt: source.text })) };

test("a factual audit requires literal evidence from fetched sources for every article section", () => {
  assert.doesNotThrow(() => assertEditorialReviewAudit(JSON.stringify(audit), [source]));
  assert.throws(() => assertEditorialReviewAudit(JSON.stringify({ ...audit, checks: audit.checks.slice(1) }), [source]), /todas as partes/);
  assert.throws(() => assertEditorialReviewAudit(JSON.stringify({ ...audit, checks: audit.checks.map((check) => ({ ...check, excerpt: "The publisher confirms a simultaneous PC release." })) }), [source]), /não foi encontrada/);
  assert.throws(() => assertEditorialReviewAudit(JSON.stringify({ ...audit, checks: audit.checks.map((check) => ({ ...check, source_url: "https://attacker.test/made-up-source" })) }), [source]), /não foi encontrada/);
});

test("uncertainty and incomplete model responses keep the original draft for manual review", () => {
  assert.throws(() => assertEditorialReviewAudit(JSON.stringify({ ...audit, supported: false, issues: ["Platform claim unsupported"] }), [source]), /sem comprovação/);
  assert.throws(() => assertEditorialReviewAudit(JSON.stringify({ ...audit, issues: ["Verify launch date"] }), [source]), /sem comprovação/);
  assert.throws(() => assertEditorialReviewAudit("{}", [source]), /sem comprovação/);
  assert.throws(() => assertEditorialReviewAudit("invalid", [source]));
});
