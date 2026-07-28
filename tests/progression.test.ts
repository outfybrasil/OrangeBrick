import assert from "node:assert/strict";
import test from "node:test";
import { divisionLabel, formatXp, levelCeiling, levelFloor, levelProgress, rarityLabel } from "../src/lib/progression.ts";

test("calcula os limites da curva vitalícia", () => {
  assert.equal(levelFloor(1), 0);
  assert.equal(levelCeiling(1), 400);
  assert.equal(levelFloor(5), 2500);
  assert.equal(levelCeiling(5), 3600);
  assert.equal(levelCeiling(100), 1_000_000);
});

test("limita o progresso do nível entre zero e cem", () => {
  assert.equal(levelProgress(0, 1), 0);
  assert.equal(levelProgress(200, 1), 50);
  assert.equal(levelProgress(400, 1), 100);
  assert.equal(levelProgress(-100, 1), 0);
});

test("formata os termos públicos em português", () => {
  assert.equal(formatXp(1280), "1.280");
  assert.equal(divisionLabel("steel"), "Aço");
  assert.equal(divisionLabel(null), "Sem divisão");
  assert.equal(rarityLabel("legendary"), "Lendária");
});
