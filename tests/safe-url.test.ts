import assert from "node:assert/strict";
import test from "node:test";
import { safeLinkUrl } from "../src/lib/safe-url.ts";

test("accepts ordinary internal and HTTP links", () => {
  assert.equal(safeLinkUrl("/posts/game?from=home#review"), "/posts/game?from=home#review");
  assert.equal(safeLinkUrl("https://example.com/source"), "https://example.com/source");
  assert.equal(safeLinkUrl("http://example.com/source"), "http://example.com/source");
});

test("rejects script schemes, external aliases, credentials and browser-normalized links", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "/\\evil.example", "https:\\evil.example", "java\nscript:alert(1)", "https://user:password@example.com", "https://", " https://example.com", "https://example.com/\u0000"]) {
    assert.equal(safeLinkUrl(value), null, value);
  }
  assert.equal(safeLinkUrl("/posts/game", false), null);
});
