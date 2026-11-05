import assert from "node:assert/strict";
import test from "node:test";
import { buildReelCaptions, buildReelEditPlan, generateCompositionHtml, resolveVisualStyle, type CompositionOptions } from "../src/lib/video/reel-composition.ts";

const texts = [
  "O novo console ganhou uma atualização importante.",
  "A fabricante detalhou as mudanças nesta semana.",
  "Os jogos terão novas opções de configuração.",
  "A mudança preserva os recursos que já existem.",
  "Os jogadores poderão escolher como querem jogar.",
  "Essa mudança melhora sua experiência?",
];
const options: CompositionOptions = {
  category: "hardware", duration: 25,
  imagePaths: ["assets/cover.webp", "assets/detail.webp", "assets/product.webp"],
  sentences: texts.map((text, index) => ({ text, start: index * 4, end: index * 4 + 3.5, duration: 3.5 })),
  script: {
    hook: "O que muda no console", headline: "Uma atualização para escolher como jogar", subHeadline: "", badge: "Hardware",
    narrationText: texts.join(" "), ctaQuestion: texts[5], ctaAction: "Comente", ctaButton: "COMENTE ABAIXO",
    scenes: texts.slice(0, 5).map((text, index) => ({ id: `scene${index + 1}`, headline: text.slice(0, 36), highlight: "", tag: "Console", imageIndex: index % 3, narrationAnchor: text.split(" ").slice(0, 4).join(" ") })),
  },
};

test("editorial cuts follow narration anchors, respect image choices and start the CTA on its spoken question", () => {
  const scenes = buildReelEditPlan(options);
  assert.deepEqual(scenes.map((scene) => scene.start), [0, 4, 8, 12, 16, 20]);
  assert.equal(scenes[2].imageIndex, 2);
  assert.equal(scenes[1].timing, "anchor");
  assert.equal(scenes.at(-1)?.layout, "closing");
  scenes.forEach((scene, index) => {
    assert.ok(scene.duration > 0);
    assert.equal(scene.start + scene.duration, scenes[index + 1]?.start ?? options.duration);
  });
});

test("stale anchors fall back to sentence boundaries and short narrations do not create empty scenes", () => {
  const short = { ...options, sentences: options.sentences.slice(0, 2), script: { ...options.script, scenes: options.script.scenes.map((scene) => ({ ...scene, narrationAnchor: "âncora inexistente", imageIndex: 99 })) } };
  const scenes = buildReelEditPlan(short);
  assert.deepEqual(scenes.map((scene) => scene.start), [0, 4, 7.5]);
  assert.equal(scenes[1].timing, "sentence");
  assert.ok(scenes.every((scene) => scene.imageIndex < options.imagePaths.length));
  assert.throws(() => buildReelEditPlan({ ...options, imagePaths: [] }), /visual/);
  assert.throws(() => buildReelEditPlan({ ...options, sentences: [] }), /narração/);
  assert.throws(() => buildReelEditPlan({ ...options, sentences: [{ ...options.sentences[0], end: 100 }] }), /Tempos/);
});

test("caption groups preserve every spoken word and stay inside their sentence timings", () => {
  const captions = buildReelCaptions(options.sentences, options.duration);
  assert.equal(captions.map((caption) => caption.text).join(" "), texts.join(" "));
  captions.forEach((caption, index) => {
    assert.ok(caption.end > caption.start);
    assert.ok(caption.text.length <= 32);
    assert.ok(caption.start >= (captions[index - 1]?.end ?? 0));
    assert.ok(caption.end <= options.duration);
  });
});

test("composition uses deterministic caption elements and escapes untrusted script content", () => {
  const unsafe = { ...options, script: { ...options.script, headline: '</script><img src=x onerror="alert(1)">' } };
  const html = generateCompositionHtml(unsafe);
  assert.ok(html.includes("&lt;/script&gt;"));
  assert.ok(!html.includes('</script><img src=x'));
  assert.ok(!html.includes("tl.call("));
  assert.equal(resolveVisualStyle(56), "editorial");
  assert.equal(resolveVisualStyle(56, "cinema"), "cinema");
});

test("comparisons require an explicit pair of distinct available images and preserve their labels", () => {
  const pair = [{ imageIndex: 0, label: "Produto A" }, { imageIndex: 1, label: "Produto B" }];
  const comparative: CompositionOptions = { ...options, script: { ...options.script, scenes: options.script.scenes.map((scene, index) => index === 1 ? { ...scene, layout: "comparison", comparison: pair } : scene) } };
  const scenes = buildReelEditPlan(comparative);
  assert.equal(scenes[1].layout, "comparison");
  assert.deepEqual(scenes[1].comparison, pair);
  const invalid: CompositionOptions = { ...comparative, imagePaths: ["same.webp", "same.webp"] };
  assert.equal(buildReelEditPlan(invalid)[1].layout, "image");
  const missing: CompositionOptions = { ...comparative, imagePaths: ["only.webp"] };
  assert.equal(buildReelEditPlan(missing)[1].layout, "image");
});

test("summaries require actual points and details require complementary information", () => {
  const enhanced: CompositionOptions = { ...options, script: { ...options.script, scenes: options.script.scenes.map((scene, index) => index === 1 ? { ...scene, layout: "brief", pills: ["Fato A", "Fato A", "Fato B"] } : index === 2 ? { ...scene, layout: "detail", highlight: scene.headline } : scene) } };
  const scenes = buildReelEditPlan(enhanced);
  assert.equal(scenes[1].layout, "brief");
  assert.deepEqual(scenes[1].points, ["Fato A", "Fato B"]);
  assert.equal(scenes[2].layout, "image");
});
