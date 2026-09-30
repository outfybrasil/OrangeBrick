import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedEditorialImageUrl, matchesSteamGameQuery, parseVisualImageReview } from "../src/lib/ai/editorial-images.ts";

test("Steam lookup rejects a different game, sequel or edition", () => {
  assert.equal(matchesSteamGameQuery("Grand Theft Auto VI official gameplay screenshot", "Grand Theft Auto V"), false);
  assert.equal(matchesSteamGameQuery("Counter-Strike 2 gameplay screenshot", "Counter-Strike 2"), true);
  assert.equal(matchesSteamGameQuery("The Witcher 3: Wild Hunt official key art", "The Witcher 3: Wild Hunt"), true);
  assert.equal(matchesSteamGameQuery("Halo Infinite gameplay", "Halo"), false);
});

test("official image policy excludes stock photos, spoofed hosts and Steam thumbnails", () => {
  assert.equal(isAllowedEditorialImageUrl("https://images.unsplash.com/photo.jpg"), false);
  assert.equal(isAllowedEditorialImageUrl("https://playstation.com.attacker.test/art.jpg"), false);
  assert.equal(isAllowedEditorialImageUrl("https://cdn.akamai.steamstatic.com/steam/apps/1/header.jpg"), false);
  assert.equal(isAllowedEditorialImageUrl("https://cdn.akamai.steamstatic.com/steam/apps/1/ss_gameplay.jpg"), true);
  assert.equal(isAllowedEditorialImageUrl("https://media.playstation.com/game/art.jpg"), true);
});

test("visual review rejects uncertainty, generic imagery and invented descriptions", () => {
  const review = { matches_subject: true, is_generic: false, is_authentic_material: true, confidence: 0.98, alt: "Gameplay do jogo citado mostrando seu cenário.", caption: "O cenário do jogo contextualiza a novidade anunciada." };
  assert.ok(parseVisualImageReview(JSON.stringify(review)));
  assert.equal(parseVisualImageReview(JSON.stringify({ ...review, is_generic: true })), null);
  assert.equal(parseVisualImageReview(JSON.stringify({ ...review, confidence: 0.7 })), null);
  assert.equal(parseVisualImageReview(JSON.stringify({ ...review, matches_subject: false })), null);
  assert.equal(parseVisualImageReview(JSON.stringify({ ...review, is_authentic_material: false })), null);
  assert.equal(parseVisualImageReview(JSON.stringify({ ...review, alt: "" })), null);
  assert.equal(parseVisualImageReview("not JSON"), null);
});
