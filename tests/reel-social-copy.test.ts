import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type SocialPostInput = {
  title: string;
  summary: string;
  slug: string;
  category: string;
  script?: { hook?: string; ctaQuestion?: string; ttsProvider?: "elevenlabs" | "edge-tts" } | null;
};

type SocialCopyOutput = {
  instagram: { caption: string; hashtags: string[] };
  tiktok: { caption: string; hashtags: string[] };
  youtube: { title: string; description: string; tags: string[] };
};

function loadGenerateSocialCopys() {
  const source = ts.transpileModule(readFileSync(new URL("../src/lib/video/reel-service.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports: { generateSocialCopys?: (post: SocialPostInput) => SocialCopyOutput } = {};
  const require = createRequire(import.meta.url);
  const mockedRequire = (name: string) => {
    if (name.endsWith("reel-script")) return {};
    if (name.endsWith("reel-remote")) return { enqueueRemoteReel: async () => ({}), cancelRemoteReel: async () => ({}), usesRemoteReels: () => false };
    return require(name);
  };
  vm.runInNewContext(source, {
    exports,
    require: mockedRequire,
    process,
    console,
    setTimeout,
    clearTimeout,
    WeakSet,
  });
  return exports.generateSocialCopys!;
}

function loadGenerateReelScript(response: unknown) {
  const source = ts.transpileModule(readFileSync(new URL("../src/lib/video/reel-script.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports: { generateReelScript?: (post: { title: string; summary: string; category: string; body: string }, apiKey: string) => Promise<{ narrationText: string; ctaQuestion: string; ctaAction: string; ctaButton: string }> } = {};
  const require = createRequire(import.meta.url);
  class GoogleGenAI {
    models = { generateContent: async () => ({ text: JSON.stringify(response) }) };
    constructor() {}
  }
  const mockedRequire = (name: string) => name === "@google/genai" ? { GoogleGenAI } : require(name);
  vm.runInNewContext(source, {
    exports,
    require: mockedRequire,
    console,
    setTimeout,
    clearTimeout,
  });
  return exports.generateReelScript!;
}

test("social copy uses a platform-specific CTA, article link, and focused hashtags", () => {
  const generate = loadGenerateSocialCopys();
  const copy = generate({
    title: "Saros: Zenith chega grátis com chefes em sequência e New Game+",
    summary: "Saros: Zenith chega grátis ao PS5 com oito chefes em sequência, New Game+ e opções que tornam o combate mais acessível.",
    slug: "saros-zenith-chega-gratis-com-chefes-em-sequencia-e-new-game-plus",
    category: "breaking",
    script: {
      hook: "Saros: Zenith chega grátis ao PS5.",
      ctaQuestion: "Você enfrentaria oito chefes sem pausa?",
    },
  });

  assert.match(copy.instagram.caption, /Leia a matéria completa: https:\/\/orangebrick\.blog\/posts\/saros-zenith-chega-gratis-com-chefes-em-sequencia-e-new-game-plus/);
  assert.match(copy.instagram.caption, /Responda nos comentários: Você enfrentaria oito chefes sem pausa\?/);
  assert.doesNotMatch(copy.instagram.caption, /instagram\.com/);
  assert.match(copy.tiktok.caption, /Matéria completa: https:\/\/orangebrick\.blog\/posts\/saros-zenith-chega-gratis-com-chefes-em-sequencia-e-new-game-plus/);
  assert.match(copy.tiktok.caption, /Responda nos comentários: Você enfrentaria oito chefes sem pausa\?/);
  assert.match(copy.youtube.description, /Instagram: @ob\.labs/);
  assert.doesNotMatch(copy.youtube.description, /orangebrick\.blog/);
  assert.match(copy.youtube.description, /Responda nos comentários: Você enfrentaria oito chefes sem pausa\?/);
  assert.equal((copy.instagram.caption.match(/Saros: Zenith chega grátis ao PS5/g) || []).length, 1);
  assert.ok(copy.instagram.hashtags.includes("#Saros"));
  assert.ok(copy.tiktok.hashtags.includes("#saros"));
  assert.ok(copy.youtube.description.includes("#Saros"));
  assert.ok(copy.youtube.tags.includes("Saros"));
  assert.ok(copy.instagram.hashtags.length <= 4);
  assert.ok(copy.tiktok.hashtags.length <= 4);
  assert.ok((copy.youtube.description.match(/#[\p{L}\p{N}_]+/gu) || []).length <= 3);
  assert.doesNotMatch(`${copy.instagram.caption} ${copy.tiktok.caption} ${copy.youtube.description}`, /#(?:games|fyp|viral)\b/i);

  const faraway = generate({
    title: "Faraway chega em 5 de novembro ao PS5, Xbox, Switch 2 e PC",
    summary: "Faraway estreia em 5 de novembro em consoles e PC; o arcade de constelações de Steph Thirion também terá 16 fases de quebra-cabeça.",
    slug: "faraway-ganha-data-de-lancamento-oficial-e-chega-em-novembro",
    category: "breaking",
    script: { ctaQuestion: "O que você acha dessa mudança?" },
  });

  assert.match(faraway.instagram.caption, /Responda nos comentários: Você pretende jogar Faraway no lançamento\?/);
  assert.match(faraway.tiktok.caption, /Matéria completa: https:\/\/orangebrick\.blog\/posts\/faraway-ganha-data-de-lancamento-oficial-e-chega-em-novembro/);
  assert.match(faraway.youtube.description, /Siga no Instagram: @ob\.labs/);
  assert.ok(faraway.instagram.hashtags.includes("#Faraway"));
  assert.ok(!faraway.instagram.hashtags.includes("#PlayStation"));
});

test("new reel scripts replace generic CTAs with a contextual question and comment prompt", async () => {
  const response = {
    hook: "Faraway chega em novembro.",
    headline: "FARAWAY CHEGA EM NOVEMBRO",
    subHeadline: "O ARCADE GANHA DATA",
    badge: "GAMES",
    narrationText: "Faraway estreia em novembro no PS5, Xbox, Switch 2 e PC. O jogo combina constelações e quebra-cabeças em dezesseis fases. A proposta é do criador Steph Thirion e transforma cada cenário em um desafio lógico. A chegada multiplataforma amplia o público do arcade e coloca o projeto no calendário de jogos independentes. O que você acha dessa mudança?",
    scenes: Array.from({ length: 5 }, (_, index) => ({
      id: `scene${index + 1}`,
      headline: `Cena ${index + 1}`,
      highlight: `Fato ${index + 1}`,
      tag: "FARAWAY",
      imageIndex: index % 3,
    })),
    ctaQuestion: "O que você acha dessa mudança?",
    ctaAction: "Siga @ob.labs no Instagram",
    ctaButton: "SIGA @OB.LABS",
  };
  const generate = loadGenerateReelScript(response);
  const script = await generate({
    title: "Faraway chega em 5 de novembro ao PS5, Xbox, Switch 2 e PC",
    summary: "Faraway estreia em 5 de novembro em consoles e PC; o arcade terá 16 fases.",
    category: "breaking",
    body: "",
  }, "test");

  assert.equal(script.ctaQuestion, "Você pretende jogar Faraway no lançamento?");
  assert.match(script.narrationText, /Você pretende jogar Faraway no lançamento\?$/);
  assert.doesNotMatch(script.narrationText, /O que você acha dessa mudança/);
  assert.equal(script.ctaAction, "Comente sua resposta para continuar a conversa");
  assert.equal(script.ctaButton, "COMENTE ABAIXO");
});
