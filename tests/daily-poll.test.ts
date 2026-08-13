import assert from "node:assert/strict";
import test from "node:test";
import { brazilDate, pollSimilarity, validateDailyPollDraft, type DailyPollArticle } from "../src/lib/daily-poll.ts";

const articles: DailyPollArticle[] = [{ id: "post-1", title: "Warner prioriza Hogwarts Legacy 2", summary: "A sequência está em desenvolvimento.", category: "industry", slug: "hogwarts-legacy-2", publishedAt: "2026-08-12T12:00:00Z" }];

test("calcula a data editorial no fuso de São Paulo", () => {
  assert.equal(brazilDate(new Date("2026-08-13T01:30:00Z")), "2026-08-12");
});

test("aceita uma pergunta vinculada a uma matéria fornecida", () => {
  const draft = validateDailyPollDraft({ question: "O que Hogwarts Legacy 2 mais precisa aprofundar?", options: ["Vida escolar", "Escolhas", "Exploração"], sourcePostId: "post-1" }, articles, []);
  assert.equal(draft.options.length, 3);
});

test("rejeita matéria inexistente e pergunta repetida", () => {
  assert.throws(() => validateDailyPollDraft({ question: "O que Hogwarts Legacy 2 mais precisa aprofundar?", options: ["Vida escolar", "Escolhas", "Exploração"], sourcePostId: "post-2" }, articles, []));
  assert.throws(() => validateDailyPollDraft({ question: "O que Hogwarts Legacy 2 mais precisa aprofundar?", options: ["Vida escolar", "Escolhas", "Exploração"], sourcePostId: "post-1" }, articles, ["O que Hogwarts Legacy 2 mais precisa aprofundar?"]));
});

test("detecta perguntas semanticamente próximas", () => {
  assert.ok(pollSimilarity("O que Hogwarts Legacy 2 precisa melhorar?", "O que Hogwarts Legacy 2 mais precisa melhorar?") >= 0.6);
});

test("rejeita termos editoriais em inglês sem tradução", () => {
  assert.throws(() => validateDailyPollDraft({ question: "O que Hogwarts Legacy 2 mais precisa aprofundar?", options: ["Maior budget", "Escolhas", "Exploração"], sourcePostId: "post-1" }, articles, []));
});
