import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadGenerateSocialCopys() {
  const source = ts.transpileModule(readFileSync(new URL("../src/lib/video/reel-service.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports: { generateSocialCopys?: (post: { title: string; summary: string; slug: string; category: string }) => { instagram: { caption: string }; youtube: { description: string } } } = {};
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

test("Instagram captions lead to the article and YouTube descriptions lead to Instagram", () => {
  const copy = loadGenerateSocialCopys()({
    title: "Notícia de games",
    summary: "Uma notícia importante para quem joga.",
    slug: "noticia-de-games",
    category: "breaking",
  });

  assert.match(copy.instagram.caption, /Leia a matéria completa no site: https:\/\/orangebrick\.blog\/posts\/noticia-de-games/);
  assert.doesNotMatch(copy.instagram.caption, /instagram\.com/);
  assert.match(copy.youtube.description, /Siga @ob\.labs no Instagram: https:\/\/www\.instagram\.com\/ob\.labs\//);
  assert.doesNotMatch(copy.youtube.description, /orangebrick\.blog/);
});
