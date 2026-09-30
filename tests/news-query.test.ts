import assert from "node:assert/strict";
import test from "node:test";
import { getNewsRateLimit, normalizeNewsSearch, parseNewsPage } from "../src/lib/news-query.ts";

test("accepts only bounded positive integer news pages", () => {
  assert.equal(parseNewsPage(null), 1);
  assert.equal(parseNewsPage("2"), 2);
  assert.equal(parseNewsPage("abc"), null);
  assert.equal(parseNewsPage("0"), null);
  assert.equal(parseNewsPage("501"), null);
  assert.equal(parseNewsPage("1.5"), null);
});

test("removes PostgREST filter separators and wildcard controls", () => {
  assert.equal(normalizeNewsSearch("a,b_(c)%*"), "a b c");
  assert.equal(normalizeNewsSearch(" Mario   Kart "), "Mario Kart");
});

test("limits public news searches more tightly than cached feed reads", () => {
  assert.deepEqual(getNewsRateLimit(""), { action: "news_feed", limit: 180 });
  assert.deepEqual(getNewsRateLimit("m"), { action: "news_feed", limit: 180 });
  assert.deepEqual(getNewsRateLimit("mario"), { action: "news_search", limit: 30 });
});
