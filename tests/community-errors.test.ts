import assert from "node:assert/strict";
import test from "node:test";
import { getCommunityErrorMessage } from "../src/lib/community-errors.ts";

test("explica o limite diário sem expor erro técnico", () => {
  assert.match(getCommunityErrorMessage(new Error("Limite diário atingido.")), /limite de hoje/i);
});

test("preserva a data de uma suspensão", () => {
  assert.equal(
    getCommunityErrorMessage(new Error("Sua participação no Brickboard está suspensa até 30/07/2026 14:00.")),
    "Sua participação no Brickboard está suspensa até 30/07/2026 14:00."
  );
});

test("traduz falha de rede", () => {
  assert.match(getCommunityErrorMessage(new TypeError("Failed to fetch")), /conexão falhou/i);
});

test("usa mensagem segura para erros desconhecidos", () => {
  assert.doesNotMatch(getCommunityErrorMessage({ message: "SQL secret detail" }), /SQL secret/);
});
