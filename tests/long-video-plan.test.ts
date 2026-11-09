import assert from "node:assert/strict";
import test from "node:test";
import { planNarratedScenes, prepareEditorialEpisode } from "../scripts/generate-long-video.mjs";

const chapter = {
  number: "01", title: "O cartão", narration: "O cartão funciona como chave. O download vem depois.",
  scenes: [{ headline: "A chave" }, { headline: "O download", narrationAnchor: "O download vem" }],
  sentences: [{ text: "O cartão funciona como chave.", start: 0, end: 2.8 }, { text: "O download vem depois.", start: 3.1, end: 10 }],
};

test("a mudança visual acompanha a frase ancorada e cobre toda a narração", () => {
  const scenes = planNarratedScenes(chapter, 10);
  assert.equal(scenes[1].start, 3.1);
  assert.equal(scenes[0].duration + scenes[1].duration, 10);
  assert.notEqual(scenes[1].start, 5.2);
});

test("âncora ausente interrompe a montagem em vez de esconder erro de roteiro", () => {
  assert.throws(() => planNarratedScenes({ ...chapter, scenes: [chapter.scenes[0], { narrationAnchor: "Um anúncio inexistente" }] }, 10), /Âncora visual/);
});

test("prévia preserva o episódio original e adiciona um CTA após a resposta", () => {
  const input = { slug: "cartao-fisico", chapters: [chapter] };
  const preview = prepareEditorialEpisode(input, true);
  assert.equal(preview.slug, "cartao-fisico-preview");
  assert.equal(input.slug, "cartao-fisico");
  assert.equal(input.chapters[0].narration, chapter.narration);
  assert.match(preview.chapters[0].narration, /O download vem depois\..*inscreva-se no OB Labs\.$/);
});

test("o padrão remove pedidos empilhados e rejeita identificador de caminho", () => {
  const result = prepareEditorialEpisode({ slug: "cartao", chapters: [{ ...chapter, narration: "O fato foi explicado. Deixe seu comentário e acesse orangebrick ponto blog." }] });
  assert.doesNotMatch(result.chapters[0].narration, /Deixe seu comentário/);
  assert.throws(() => prepareEditorialEpisode({ slug: "../cartao", chapters: [chapter] }), /inválida/);
});


test("preparar novamente mantém uma única chamada e preserva a conclusão", () => {
  const once = prepareEditorialEpisode({ slug: "cartao", chapters: [chapter] });
  const twice = prepareEditorialEpisode(once);
  assert.equal(twice.chapters[0].narration, once.chapters[0].narration);
  assert.equal((twice.chapters[0].narration.match(/inscreva-se/giu) || []).length, 1);
  assert.match(twice.chapters[0].narration, /O download vem depois/);
  assert.equal(twice.chapters[0].scenes.length, once.chapters[0].scenes.length);
  assert.deepEqual(twice.audiencePlan.reviewHours, [24, 72, 168]);
});
