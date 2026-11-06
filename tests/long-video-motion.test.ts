import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import sharp from "sharp";
import { createLongMotionRenderer, generateLongSceneHtml, resolveLongLayout } from "../src/lib/video/long-video-composition.mjs";
import { chooseEditorialVoice } from "../src/lib/video/video-voice.mjs";

const require = createRequire(import.meta.url);

test("a voz editorial usa Francisca e preserva outras escolhas explícitas", () => {
  assert.equal(chooseEditorialVoice("auto", "pt-BR-ThalitaMultilingualNeural"), "pt-BR-FranciscaNeural");
  assert.equal(chooseEditorialVoice("auto", "pt-BR-FranciscaNeural"), "pt-BR-ThalitaMultilingualNeural");
  assert.equal(chooseEditorialVoice("pt-BR-ThalitaMultilingualNeural"), "pt-BR-ThalitaMultilingualNeural");
  assert.equal(chooseEditorialVoice("pt-BR-AntonioNeural", "pt-BR-AntonioNeural"), "pt-BR-AntonioNeural");
  assert.throws(() => chooseEditorialVoice("auto", undefined, []), /Nenhuma voz/);
});

test("a montagem rejeita processos consecutivos e composições inexistentes", () => {
  assert.throws(() => resolveLongLayout({ layout: "process" }, "process"), /consecutivas/);
  assert.throws(() => resolveLongLayout({ layout: "inventado" }), /desconhecida/);
  assert.equal(resolveLongLayout({ layout: "evidence" }, "process"), "evidence");
});

test("o quadro permanece fixo e a animação interna é determinística", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const gsapSource = await readFile(require.resolve("gsap/dist/gsap.min.js"), "utf8");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const html = generateLongSceneHtml({ layout: "process", processKind: "download", headline: "O caminho dos dados", steps: ["Internet", "Dados", "Console"] }, { gsapSource, duration: 5 });
    await page.setContent(html);
    const seek = async (time: number) => page.evaluate((at) => {
      (window as typeof window & { __sceneTimeline: { seek: (time: number, events: boolean) => void } }).__sceneTimeline.seek(at, false);
    }, time);
    const header = { x: 96, y: 68, width: 1728, height: 42 };
    await seek(0);
    const firstHeader = await page.screenshot({ clip: header });
    const firstDiagram = await page.screenshot({ clip: { x: 490, y: 500, width: 510, height: 150 } });
    await seek(2);
    const laterHeader = await page.screenshot({ clip: header });
    const laterDiagram = await page.screenshot({ clip: { x: 490, y: 500, width: 510, height: 150 } });
    assert.deepEqual(firstHeader, laterHeader);
    assert.notDeepEqual(firstDiagram, laterDiagram);
    const stable = await page.screenshot();
    await seek(0.5);
    await seek(2);
    assert.deepEqual(stable, await page.screenshot());
    assert.equal(await page.locator(".stage").evaluate((element) => getComputedStyle(element).transform), "none");
    await page.setContent(html);
    await seek(1);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("o render mantém 30 fps e a duração completa depois que a animação termina", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "orangebrick-motion-"));
  const renderer = await createLongMotionRenderer(process.cwd(), "ffmpeg");
  try {
    const image = path.join(directory, "image.png");
    await sharp({ create: { width: 1200, height: 675, channels: 3, background: "#141210" } }).png().toFile(image);
    const output = path.join(directory, "hold.mp4");
    const verification = await renderer.render({ layout: "bars", headline: "Exemplo de transferência", localRawPath: image, bars: [{ label: "100 Mb/s", value: "≈ 4h43", ratio: 1 }] }, 4, output);
    assert.equal(verification.frames, 120);
    assert.ok("animated_frames" in verification && verification.animated_frames < verification.frames);
    const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=nb_read_frames,r_frame_rate", "-show_entries", "format=duration", "-of", "json", output], { encoding: "utf8" }));
    assert.equal(probe.streams[0].nb_read_frames, "120");
    assert.equal(probe.streams[0].r_frame_rate, "30/1");
    assert.equal(Number(probe.format.duration), 4);
    assert.deepEqual(await renderer.render({ layout: "bars", headline: "Exemplo de transferência", localRawPath: image, bars: [{ label: "100 Mb/s", value: "≈ 4h43", ratio: 1 }] }, 4, output), verification);
  } finally {
    await renderer.close();
    await rm(directory, { recursive: true, force: true });
  }
});
