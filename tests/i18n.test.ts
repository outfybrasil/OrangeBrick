import test from "node:test";
import assert from "node:assert/strict";
import { detectLocale, getDictionary, isValidLocale } from "../src/lib/i18n/index.ts";

test("detectLocale identifies Brazilian IP as pt", () => {
  assert.equal(detectLocale("BR", null), "pt");
  assert.equal(detectLocale("br", null), "pt");
});

test("detectLocale identifies foreign IP as en", () => {
  assert.equal(detectLocale("US", null), "en");
  assert.equal(detectLocale("PT", null), "en");
  assert.equal(detectLocale("DE", null), "en");
  assert.equal(detectLocale("JP", null), "en");
});

test("detectLocale falls back to accept-language when country is absent", () => {
  assert.equal(detectLocale(null, "pt-BR,pt;q=0.9,en-US;q=0.8"), "pt");
  assert.equal(detectLocale(null, "en-US,en;q=0.9"), "en");
  assert.equal(detectLocale(null, "es-ES,es;q=0.9"), "en");
  assert.equal(detectLocale(null, null), "pt");
});

test("isValidLocale validates supported locales", () => {
  assert.equal(isValidLocale("pt"), true);
  assert.equal(isValidLocale("en"), true);
  assert.equal(isValidLocale("fr"), false);
  assert.equal(isValidLocale(null), false);
});

test("getDictionary provides correct dictionary with all keys present", () => {
  const pt = getDictionary("pt");
  const en = getDictionary("en");

  assert.equal(pt.categories.breaking, "Plantão");
  assert.equal(en.categories.breaking, "Breaking");
  assert.equal(pt.common.siteName, "Orange Brick");
  assert.equal(en.common.siteName, "Orange Brick");
  assert.equal(en.nav.news, "News");
  assert.equal(pt.nav.news, "Notícias");
});
