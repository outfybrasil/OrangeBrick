import assert from "node:assert/strict";
import test from "node:test";
import { getNewsRateLimit, normalizeNewsSearch, parseNewsPage, selectFeaturedNews } from "../src/lib/news-query.ts";

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

test("featured news takes priority without changing publication order or duplicating the selected item", () => {
  const newer = { id: "newer", is_featured: false, featured_priority: 0 };
  const selected = { id: "gta", is_featured: true, featured_priority: 100 };
  const previous = { id: "previous", is_featured: true, featured_priority: 0 };
  const posts = [newer, previous, selected];
  const hero = selectFeaturedNews(posts);
  assert.equal(hero, selected);
  assert.deepEqual(posts.map((post) => post.id), ["newer", "previous", "gta"]);
  assert.deepEqual(posts.filter((post) => post.id !== hero?.id).slice(0, 2), [newer, previous]);
  assert.equal(selectFeaturedNews([newer]), newer);
  assert.equal(selectFeaturedNews([]), null);
  assert.equal(selectFeaturedNews([previous, { ...selected, featured_priority: 0 }]), previous);
});
