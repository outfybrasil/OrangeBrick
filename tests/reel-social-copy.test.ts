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

  assert.match(copy.instagram.caption, /Matéria completa no link da bio: https:\/\/orangebrick\.blog\/posts\/saros-zenith-chega-gratis-com-chefes-em-sequencia-e-new-game-plus\?utm_source=instagram&utm_medium=reel&utm_campaign=reel/);
  assert.match(copy.instagram.caption, /Responda nos comentários: Você enfrentaria oito chefes sem pausa\?/);
  assert.match(copy.instagram.caption, /Siga @ob\.labs/);
  assert.doesNotMatch(copy.instagram.caption, /instagram\.com/);
  assert.match(copy.tiktok.caption, /Matéria completa no link da bio\./);
  assert.doesNotMatch(copy.tiktok.caption, /orangebrick\.blog/);
  assert.match(copy.tiktok.caption, /Responda nos comentários: Você enfrentaria oito chefes sem pausa\?/);
  assert.match(copy.tiktok.caption, /Siga para acompanhar/);
  assert.match(copy.youtube.description, /Leia a matéria completa: https:\/\/orangebrick\.blog\/posts\/saros-zenith-chega-gratis-com-chefes-em-sequencia-e-new-game-plus\?utm_source=youtube&utm_medium=short&utm_campaign=reel/);
  assert.match(copy.youtube.description, /Inscreva-se no canal/);
  assert.doesNotMatch(copy.youtube.description, /Instagram: @ob\.labs/);
  assert.match(copy.youtube.description, /Responda nos comentários: Você enfrentaria oito chefes sem pausa\?/);
  assert.equal((copy.instagram.caption.match(/Saros: Zenith chega grátis ao PS5/g) || []).length, 1);
  assert.ok(copy.instagram.hashtags.includes("#Saros"));
  assert.ok(copy.tiktok.hashtags.includes("#saros"));
  assert.ok(copy.youtube.description.includes("#Saros"));
  assert.ok(copy.youtube.description.includes("#Shorts"));
  assert.ok(copy.youtube.tags.includes("Saros"));
  assert.ok(copy.youtube.tags.includes("Shorts"));
  assert.equal(copy.instagram.hashtags.length, 5);
  assert.equal(copy.tiktok.hashtags.length, 5);
  assert.equal((copy.youtube.description.match(/#[\p{L}\p{N}_]+/gu) || []).length, 5);
  assert.ok(copy.instagram.hashtags.includes("#PlayStation"));
  assert.ok(copy.instagram.hashtags.includes("#PlantaoOB"));
  assert.ok(copy.instagram.hashtags.includes("#OrangeBrick"));
  assert.ok(copy.tiktok.hashtags.includes("#plantaoob"));
  assert.ok(copy.tiktok.hashtags.includes("#orangebrick"));
  assert.doesNotMatch(`${copy.instagram.caption} ${copy.tiktok.caption} ${copy.youtube.description}`, /#(?:fyp|viral)\b/i);
  assert.doesNotMatch(`${copy.instagram.caption} ${copy.tiktok.caption} ${copy.youtube.description}`, /#(?:games|news)\b/i);

  const faraway = generate({
    title: "Faraway chega em 5 de novembro ao PS5, Xbox, Switch 2 e PC",
    summary: "Faraway estreia em 5 de novembro em consoles e PC; o arcade de constelações de Steph Thirion também terá 16 fases de quebra-cabeça.",
    slug: "faraway-ganha-data-de-lancamento-oficial-e-chega-em-novembro",
    category: "breaking",
    script: { ctaQuestion: "O que você acha dessa mudança?" },
  });

  assert.match(faraway.instagram.caption, /Responda nos comentários: Você pretende jogar Faraway no lançamento\?/);
  assert.match(faraway.tiktok.caption, /Matéria completa no link da bio\./);
  assert.match(faraway.youtube.description, /Inscreva-se no canal/);
  assert.ok(faraway.instagram.hashtags.includes("#Faraway"));
  assert.ok(faraway.instagram.hashtags.includes("#PlayStation"));
  assert.ok(faraway.instagram.hashtags.includes("#PlantaoOB"));
  assert.match(faraway.youtube.description, /#Shorts\b/);
  assert.ok(faraway.youtube.tags.includes("NintendoSwitch2"));
  assert.ok(faraway.youtube.tags.includes("Xbox"));
});

test("hashtags preserve subject, series and brand for every category and match each video's platforms", () => {
  const generate = loadGenerateSocialCopys();
  const seriesTags: Record<string, string> = {
    breaking: "#plantaoob",
    hardware: "#hardnewsob",
    industry: "#radarob",
    modding: "#gambiarraob",
    review: "#reviewob",
    opinion: "#opiniaoob",
  };
  for (const category of ["breaking", "hardware", "industry", "modding", "review", "opinion"]) {
    const copy = generate({ title: "Cyberpunk 2077 recebe novidades no PC", summary: "Cyberpunk 2077 recebe novidades no PC e na Steam.", slug: "cyberpunk-2077-novidades-pc", category });
    for (const hashtags of [copy.instagram.hashtags, copy.tiktok.hashtags]) {
      assert.equal(hashtags.length, 5);
      assert.equal(new Set(hashtags.map(tag => tag.toLowerCase())).size, hashtags.length);
      assert.ok(hashtags.some(tag => tag.toLowerCase() === "#cyberpunk2077"));
      assert.ok(hashtags.some(tag => tag.toLowerCase() === "#pcgaming"));
      assert.ok(hashtags.some(tag => tag.toLowerCase() === "#orangebrick"));
      assert.ok(hashtags.some(tag => tag.toLowerCase() === seriesTags[category]));
      assert.ok(!hashtags.some(tag => /^#(?:games|news)$/i.test(tag)));
      assert.ok(!hashtags.some(tag => /playstation|xbox|nintendo/i.test(tag)));
    }
    assert.match(copy.youtube.description, /#Shorts\b/);
    assert.match(copy.youtube.description, /#OrangeBrick\b/);
    assert.ok(copy.youtube.tags.includes("Shorts"));
    assert.ok(copy.youtube.tags.includes("Orange Brick"));
  }
  const series = generate({ title: "Cyberpunk Edgerunners ganha nova temporada", summary: "A série de animação terá novos episódios.", slug: "cyberpunk-edgerunners-nova-temporada", category: "breaking" });
  assert.ok(!series.instagram.hashtags.includes("#Cyberpunk2077"));
  assert.ok(series.instagram.hashtags.includes("#NoticiasDeGames"));
});

test("YouTube title prioritizes the hook without TTS attribution", () => {
  const generate = loadGenerateSocialCopys();
  const copy = generate({
    title: "Saros: Zenith chega grátis com chefes em sequência e New Game+",
    summary: "Saros: Zenith chega grátis ao PS5 com oito chefes em sequência, New Game+ e opções que tornam o combate mais acessível.",
    slug: "saros-zenith-chega-gratis-com-chefes-em-sequencia-e-new-game-plus",
    category: "breaking",
    script: {
      hook: "Saros: Zenith chega grátis ao PS5 com oito chefes em sequência e um New Game+ que muda o ritmo do combate.",
      ctaQuestion: "Você enfrentaria oito chefes sem pausa?",
      ttsProvider: "elevenlabs",
    },
  });
  assert.doesNotMatch(copy.youtube.title, /elevenlabs/i);
  assert.ok(Array.from(copy.youtube.title).length <= 70);
  assert.match(copy.youtube.description, /Narração: elevenlabs\.io/);
});

test("new reel scripts replace generic CTAs with a contextual question and comment prompt", async () => {
  const response = {
    hook: "Faraway chega em novembro.",
    headline: "FARAWAY CHEGA EM NOVEMBRO",
    subHeadline: "O ARCADE GANHA DATA",
    badge: "GAMES",
    narrationText: "Faraway estreia em novembro no PS5, Xbox, Switch 2 e PC. O jogo combina constelações e quebra-cabeças em dezesseis fases. A proposta é do criador Steph Thirion e transforma cada cenário em um desafio lógico. A chegada multiplataforma amplia o público do arcade e coloca o projeto no calendário de jogos independentes. O visual minimalista usa o céu como tabuleiro e cada constelação vira uma pista. A data foi confirmada para 5 de novembro, mas o preço ainda não foi revelado. Você pretende jogar Faraway no lançamento?",
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
