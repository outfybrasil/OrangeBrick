import { colorFilter, validateEffects, type MotionMedia, type MotionTransition, type MotionFocus, type MotionGraphic, type MotionCaptionStyle } from "./effects.js";
export * from "./effects.js";

export interface MotionBrand {
  name: string;
  accent?: string;
  handle?: string;
  logoSrc?: string;
}

export type MotionSceneLayout = "image" | "detail" | "comparison" | "brief";

export interface MotionSceneComparison {
  imageIndex: number;
  label: string;
}

export interface MotionScene {
  id: string;
  headline: string;
  highlight: string;
  tag: string;
  pills?: string[];
  imageIndex: number;
  narrationAnchor?: string;
  layout?: MotionSceneLayout;
  comparison?: MotionSceneComparison[];
  start?: number;
  transition?: MotionTransition;
  focus?: MotionFocus;
  graphic?: MotionGraphic;
  motionBlur?: boolean;
  motionExit?: "cut" | "fade" | "lift";
}

export interface MotionScript {
  hook: string;
  headline: string;
  subHeadline: string;
  badge: string;
  narrationText: string;
  scenes: MotionScene[];
  ctaQuestion: string;
  ctaAction: string;
  ctaButton: string;
  ctaVariant?: "comment" | "follow";
}

export type MotionVisualStyle = "editorial" | "cinema" | "ruptura" | "game" | "manchete" | "neon_minimal";

export const MOTION_VISUAL_STYLES: MotionVisualStyle[] = ["editorial", "cinema", "ruptura", "game", "manchete", "neon_minimal"];

export interface NarrationSentence {
  text: string;
  start: number;
  end: number;
  duration: number;
}

export interface MotionWordTiming {
  word: string;
  start: number;
  end: number;
}

export interface MotionFrame {
  style?: "editorial" | "none";
  width?: number;
  radius?: number;
}

export interface MotionOptions {
  script: MotionScript;
  categoryLabel?: string;
  brand?: MotionBrand;
  frame?: MotionFrame;
  duration: number;
  variation?: number;
  style?: MotionVisualStyle | "random";
  sentences: NarrationSentence[];
  wordTimings?: MotionWordTiming[];
  imagePaths: string[];
  imageDescriptions?: string[];
  media?: MotionMedia[];
  captions?: MotionCaptionStyle;
}

export interface MotionEditScene {
  id: string;
  start: number;
  duration: number;
  imageIndex: number;
  headline: string;
  label: string;
  layout: "opening" | "image" | "detail" | "comparison" | "brief" | "closing";
  highlight: string;
  points: string[];
  comparison: MotionSceneComparison[];
  timing: "anchor" | "word" | "explicit" | "sentence" | "closing";
  transition?: MotionTransition;
  focus?: MotionFocus;
  focusStart?: number;
  graphic?: MotionGraphic;
  eventTimes?: number[];
  motionBlur?: boolean;
  motionExit?: "cut" | "fade" | "lift";
}

export function resolveVisualStyle(variation: number, requestedStyle?: MotionVisualStyle | "random"): MotionVisualStyle {
  if (requestedStyle && requestedStyle !== "random" && MOTION_VISUAL_STYLES.includes(requestedStyle)) return requestedStyle;
  if (requestedStyle === "random") return MOTION_VISUAL_STYLES[Math.abs(variation) % MOTION_VISUAL_STYLES.length];
  return "editorial";
}

function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function validSentences(sentences: NarrationSentence[], duration: number): NarrationSentence[] {
  let end = 0;
  return sentences.map((sentence) => {
    const valid = Boolean(sentence.text.trim()) && Number.isFinite(sentence.start) && Number.isFinite(sentence.end) && sentence.start >= end && sentence.start >= 0 && sentence.end > sentence.start && sentence.end <= duration;
    if (!valid) throw new Error("Tempos da narração inválidos; revise o áudio antes de renderizar.");
    end = sentence.end;
    return sentence;
  });
}

export function findNarrationAnchor(anchor: string, options: Pick<MotionOptions, "sentences" | "wordTimings">, after = -1): number | undefined {
  const wanted = normalizeText(anchor).split(" ").filter(Boolean);
  if (!wanted.length) return undefined;
  if (options.wordTimings?.length) {
    const words = options.wordTimings;
    for (let index = 0; index <= words.length - wanted.length; index++) {
      if (words[index].start > after && wanted.every((word, offset) => normalizeText(words[index + offset].word) === word)) return words[index].start;
    }
    return undefined;
  }
  return options.sentences.find(sentence => sentence.start > after && normalizeText(sentence.text).includes(normalizeText(anchor)))?.start;
}

export function buildEditPlan(options: MotionOptions): MotionEditScene[] {
  const { script, duration, imagePaths } = options;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Duração inválida para o vídeo.");
  if (!imagePaths.length) throw new Error("O vídeo precisa de material visual válido antes da renderização.");
  const sentences = validSentences(options.sentences, duration);
  if (!sentences.length) throw new Error("O vídeo precisa dos tempos da narração para planejar as cenas.");
  const ctaText = normalizeText(script.ctaQuestion || "");
  const closingIndex = ctaText ? sentences.findIndex((sentence, index) => index > 0 && normalizeText(sentence.text).includes(ctaText)) : -1;
  const content = closingIndex > 0 ? sentences.slice(0, closingIndex) : sentences;
  const expanded = script.scenes.length > content.length && script.scenes.slice(1).every(scene => scene.start !== undefined || (scene.narrationAnchor && options.wordTimings?.length));
  const count = expanded ? script.scenes.length : Math.min(script.scenes.length, content.length);
  if (!count) throw new Error("O roteiro não possui cenas editoriais.");
  const starts = [0];
  if (options.wordTimings) buildCaptions(options.sentences, duration, options.wordTimings, options.captions);
  for (const scene of script.scenes) {
    validateEffects(scene.transition, scene.focus, scene.graphic);
    if (scene.motionExit && !["cut", "fade", "lift"].includes(scene.motionExit)) throw new Error("Animação de saída inválida.");
  }
  const timings: MotionEditScene["timing"][] = ["sentence"];
  let previousIndex = 0;
  for (let index = 1; index < count; index++) {
    const maxIndex = content.length - (count - index);
    const target = Math.max(previousIndex + 1, Math.min(maxIndex, Math.round(index * content.length / count)));
    const anchor = normalizeText(script.scenes[index]?.narrationAnchor || "");
    const matched = anchor ? content.findIndex((sentence, sentenceIndex) => sentenceIndex > previousIndex && sentenceIndex <= maxIndex && normalizeText(sentence.text).includes(anchor)) : -1;
    const selected = matched >= 0 ? matched : target;
    const explicit = script.scenes[index].start;
    const wordStart = anchor && options.wordTimings ? findNarrationAnchor(anchor, options, starts[index - 1] + .15) : undefined;
    if (expanded && explicit === undefined && wordStart === undefined) throw new Error("Cenas adicionais precisam de uma âncora real de palavra ou início explícito.");
    const at = explicit ?? (wordStart !== undefined && wordStart < (closingIndex > 0 ? sentences[closingIndex].start : sentences.at(-1)!.end) ? wordStart : content[Math.max(0, Math.min(content.length - 1, selected))].start);
    if (!Number.isFinite(at) || at <= starts[index - 1] + .15 || at >= (closingIndex > 0 ? sentences[closingIndex].start : sentences.at(-1)!.end)) throw new Error("O início das cenas precisa seguir a ordem da narração.");
    starts.push(at);
    timings.push(explicit !== undefined ? "explicit" : wordStart === at ? "word" : matched >= 0 ? "anchor" : "sentence");
    previousIndex = Math.max(0, Math.min(content.length - 1, selected));
  }
  const closingStart = closingIndex > 0 ? sentences[closingIndex].start : ctaText ? sentences[sentences.length - 1].end : duration;
  if (script.scenes[0].start !== undefined && script.scenes[0].start !== 0) throw new Error("A primeira cena precisa começar em zero.");
  const scenes = starts.map((start, index): MotionEditScene => {
    const scene = script.scenes[index];
    const requestedImage = scene.imageIndex;
    const comparison = (scene.comparison || []).filter((item) => Number.isInteger(item.imageIndex) && item.imageIndex >= 0 && item.imageIndex < imagePaths.length && item.label?.trim()).slice(0, 2);
    const identity = (index: number) => {
      const media = options.media?.[index];
      return media ? `${media.type}:${media.path}:${media.type === "video" ? `${media.in ?? 0}:${media.out ?? ""}:${media.speed ?? 1}` : ""}` : imagePaths[index];
    };
    const canCompare = comparison.length === 2 && identity(comparison[0].imageIndex) !== identity(comparison[1].imageIndex);
    const highlight = normalizeText(scene.highlight || "") !== normalizeText(scene.headline) ? scene.highlight || "" : "";
    const points = [...new Set(scene.pills || [])].filter((point) => point.trim() && normalizeText(point) !== normalizeText(scene.headline)).slice(0, 3);
    const requestedLayout = scene.layout;
    const fallback = points.length >= 2 ? "brief" : highlight && index % 2 === 0 ? "detail" : "image";
    const layout = requestedLayout === "comparison" ? canCompare ? "comparison" : "image"
      : requestedLayout === "brief" ? points.length ? "brief" : fallback
      : requestedLayout === "detail" ? highlight ? "detail" : "image"
      : requestedLayout === "image" ? "image" : fallback;
    const imageIndex = Number.isInteger(requestedImage) && requestedImage >= 0 && requestedImage < imagePaths.length ? requestedImage : index % imagePaths.length;
    return {
      id: `scene${index + 1}`, start,
      duration: (starts[index + 1] ?? closingStart) - start,
      imageIndex,
      headline: index === 0 ? script.headline : scene.headline,
      label: scene.tag || script.badge,
      layout: index === 0 ? "opening" : layout,
      highlight, points, comparison: canCompare ? comparison : [],
      timing: timings[index], transition: scene.transition, focus: scene.focus, graphic: scene.graphic, motionBlur: scene.motionBlur, motionExit: scene.motionExit,
      focusStart: scene.focus?.anchor ? findNarrationAnchor(scene.focus.anchor, options, start - .001) : start + .7,
      eventTimes: scene.graphic?.items?.map((item, itemIndex) => item.anchor ? findNarrationAnchor(item.anchor, options, start - .001) ?? start + itemIndex * .5 : start + itemIndex * .5),
    };
  }).filter((scene) => scene.duration > 0);
  for (const scene of scenes) {
    const source = script.scenes[Number(scene.id.slice(5)) - 1];
    if (source.focus?.anchor && scene.focusStart === undefined) throw new Error("Âncora da região de foco não encontrada na narração.");
    if (source.graphic?.items?.some(item => item.anchor && findNarrationAnchor(item.anchor, options, scene.start - .001) === undefined)) throw new Error("Âncora do gráfico não encontrada na narração.");
    if ((scene.focusStart !== undefined && scene.focusStart >= scene.start + scene.duration) || scene.eventTimes?.some(time => time < scene.start || time >= scene.start + scene.duration)) throw new Error("Evento visual fora da cena correspondente.");
  }
  if (closingStart < duration) scenes.push({
    id: "closing", start: closingStart, duration: duration - closingStart,
    imageIndex: scenes[scenes.length - 1].imageIndex,
    headline: script.ctaQuestion, label: script.ctaVariant === "follow" ? "ACOMPANHE" : "A CONVERSA CONTINUA",
    layout: "closing", timing: "closing", highlight: "", points: [], comparison: [],
  });
  return scenes;
}

export function getSceneStarts(options: MotionOptions): number[] {
  return buildEditPlan(options).map((scene) => scene.start);
}

export function buildCaptions(sentences: NarrationSentence[], duration: number, wordTimings?: MotionWordTiming[], style?: MotionCaptionStyle): Array<{ text: string; start: number; end: number }> {
  const valid = validSentences(sentences, duration);
  const maxWords = style?.maxWords ?? 5;
  const maxChars = style?.maxChars ?? 32;
  if (!Number.isInteger(maxWords) || maxWords < 2 || maxWords > 8 || !Number.isInteger(maxChars) || maxChars < 16 || maxChars > 48 || (style?.position && !["bottom", "upper"].includes(style.position)) || Object.values(style?.scenePositions || {}).some(position => !["bottom", "upper"].includes(position))) throw new Error("Estilo de legendas inválido.");
  if (wordTimings) {
    const expected = valid.flatMap((sentence) => sentence.text.trim().split(/\s+/u));
    if (expected.length !== wordTimings.length) throw new Error("As marcas de palavras não correspondem ao roteiro.");
    let previousEnd = 0;
    wordTimings.forEach((word, index) => {
      if (normalizeText(word.word) !== normalizeText(expected[index]) || !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 || word.start < previousEnd - 0.002 || word.end <= word.start || word.end > duration) {
        throw new Error("Marcas de palavras inválidas; revise a sincronização.");
      }
      previousEnd = word.end;
    });
  }
  let wordCursor = 0;
  return valid.flatMap((sentence) => {
    const words = sentence.text.trim().split(/\s+/u);
    const groups: string[] = [];
    const connectors = new Set(["a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "com", "por", "para", "pra", "pro", "e", "ou", "que", "se", "ao", "aos", "pelo", "pela", "pelos", "pelas", "ate", "seu", "sua", "seus", "suas", "esse", "essa", "esses", "essas", "este", "esta", "estes", "estas", "mesmo", "mesma", "mesmos", "mesmas"]);
    let cursor = 0;
    while (cursor < words.length) {
      let end = cursor + 1;
      while (end < words.length && end - cursor < maxWords && words.slice(cursor, end + 1).join(" ").length <= maxChars && !(/[,:;.!?]$/.test(words[end - 1]) && end - cursor >= 2)) end++;
      if (words.length - end === 1 && end - cursor >= 4) end--;
      if (end < words.length) while (end - cursor > 2 && connectors.has(normalizeText(words[end - 1]))) end--;
      groups.push(words.slice(cursor, end).join(" "));
      cursor = end;
    }
    const sentenceWordStart = wordCursor;
    wordCursor += words.length;
    let groupWordOffset = 0;
    const weight = groups.reduce((total, text) => total + text.length, 0);
    let offset = 0;
    return groups.map((text) => {
      const count = text.split(/\s+/u).length;
      if (wordTimings) {
        const first = wordTimings[sentenceWordStart + groupWordOffset];
        const last = wordTimings[sentenceWordStart + groupWordOffset + count - 1];
        groupWordOffset += count;
        if (first.start < sentence.start - 0.001 || last.end > sentence.end + 0.001) throw new Error("Marcas de palavras fora da frase correspondente.");
        const next = wordTimings[sentenceWordStart + groupWordOffset];
        return { text, start: first.start, end: Math.min(last.end, next?.start ?? last.end) };
      }
      const start = sentence.start + (sentence.end - sentence.start) * offset / weight;
      offset += text.length;
      return { text, start, end: sentence.start + (sentence.end - sentence.start) * offset / weight };
    });
  });
}

function escapeHtml(value: string): string {
  const escapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (character) => escapes[character]);
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function titleWords(text: string): string {
  return text.split(/\s+/u).map((word) => `<span class="word-mask"><span class="title-word">${escapeHtml(word)}</span></span>`).join(" ");
}

export function generateCompositionHtml(options: MotionOptions): string {
  const { script, duration, imagePaths } = options;
  const scenes = buildEditPlan(options);
  const captions = buildCaptions(options.sentences, duration, options.wordTimings, options.captions);
  const style = resolveVisualStyle(options.variation ?? 0, options.style);
  const categoryLabel = options.categoryLabel || "";
  const brand = options.brand || { name: "Brasa Motion" };
  const brandColor = brand.accent || "#ff7a36";
  if (!/^#[0-9a-f]{6}$/i.test(brandColor)) throw new Error("A cor da marca deve usar seis dígitos hexadecimais.");
  const accent = style === "cinema" ? "#e8bb79" : style === "game" ? "#b8e986" : brandColor;
  const frame = { style: "editorial", width: 3, radius: 18, ...options.frame };
  if (!["editorial", "none"].includes(frame.style) || !Number.isFinite(frame.width) || frame.width < 1 || frame.width > 6 || !Number.isFinite(frame.radius) || frame.radius < 0 || frame.radius > 40) {
    throw new Error("Moldura inválida: use largura de 1 a 6 e raio de 0 a 40.");
  }
  const frameHtml = frame.style === "none" ? "" : '<div class="composition-frame" aria-hidden="true"></div>';
  const follow = script.ctaVariant === "follow";
  const image = (index: number, className = "", moving = true, background = false) => {
    const media = options.media?.[index];
    const position = media?.position || { x: .5, y: .5 };
    if (![position.x, position.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error("Posição da mídia inválida.");
    const filter = colorFilter(media?.color);
    return `<img class="${className}" src="${escapeHtml(imagePaths[index])}" ${moving && media?.frames ? `data-video="${index}"` : ""} style="object-fit:${background || media?.fit === "cover" ? "cover" : "contain"};object-position:${position.x * 100}% ${position.y * 100}%;filter:${background ? "grayscale(1)" : filter}" alt="${escapeHtml(media?.description || options.imageDescriptions?.[index] || "Imagem da matéria")}" />`;
  };
  const sceneHtml = scenes.map((scene, index) => {
    const paper = scene.layout === "brief" || scene.layout === "comparison";
    const focus = scene.focus;
    const mainImage = `<figure class="media${focus ? " has-focus" : ""}"><div class="focus-surface"${focus ? ` style="transform-origin:${(focus.x + focus.width / 2) * 100}% ${(focus.y + focus.height / 2) * 100}%"` : ""}>${image(scene.imageIndex)}${focus ? `<span class="focus-outline" style="left:${focus.x * 100}%;top:${focus.y * 100}%;width:${focus.width * 100}%;height:${focus.height * 100}%;box-shadow:0 0 0 2000px rgba(0,0,0,${focus.dim ?? .45})"></span>` : ""}</div>${focus ? `<span class="focus-label" data-safe>${escapeHtml(focus.label)}</span>` : ""}<span class="media-edge"></span></figure>`;
    const note = scene.highlight ? `<aside class="note" data-safe><span class="note-rule"></span><p>${escapeHtml(scene.highlight)}</p></aside>` : "";
    let visual = mainImage;
    if (scene.layout === "opening") {
      visual = `${mainImage}${scene.highlight ? `<div class="opening-note" data-safe>${escapeHtml(scene.highlight)}</div>` : ""}`;
    } else if (scene.layout === "comparison") {
      visual = `<div class="comparison-grid" data-safe>${scene.comparison.map((item) => `<figure class="compare-item"><div class="compare-photo">${image(item.imageIndex)}</div><figcaption>${escapeHtml(item.label)}</figcaption></figure>`).join("")}<span class="compare-divider"></span></div>`;
    } else if (scene.layout === "brief") {
      visual = `${mainImage}<div class="brief-points" data-safe>${scene.points.map((point, pointIndex) => `<div class="brief-point"><span class="point-index">${String(pointIndex + 1).padStart(2, "0")}</span><p>${escapeHtml(point)}</p><span class="point-line"></span></div>`).join("")}</div>`;
    } else if (scene.layout === "detail") {
      visual = `<div class="fact-card" data-safe><div class="fact-label">${escapeHtml(scene.label)}</div><p class="fact-text" data-fit="54">${escapeHtml(scene.highlight)}</p><span class="fact-line"></span></div>${mainImage}`;
    } else if (scene.layout === "closing") {
      visual = `<div class="closing-stack">${image(scene.imageIndex, "stack-main")}${image((scene.imageIndex + 1) % imagePaths.length, "stack-secondary")}</div><p class="closing-action" data-safe>${escapeHtml(follow ? brand.handle ? `Siga ${brand.handle}` : "Acompanhe o projeto" : "Deixe sua resposta nos comentários")}<span class="action-arrow">↗</span></p>`;
    } else {
      visual = `${mainImage}${note}`;
    }
    if (scene.graphic) {
      const graphic = scene.graphic;
      if (graphic.type === "timeline" || graphic.type === "calendar") {
        visual = `<div class="editorial-graphic ${graphic.type}" data-safe>${graphic.items!.map((item, itemIndex) => `<div class="graphic-event" data-event="${itemIndex}"><span class="event-marker">${String(itemIndex + 1).padStart(2, "0")}</span><div><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.detail)}</p></div></div>`).join("")}</div>`;
      } else if (graphic.type === "number") {
        visual = `${graphic.withMedia ? mainImage.replace('class="media', 'class="media number-support') : ""}<div class="editorial-graphic number-graphic${graphic.withMedia ? " with-media" : ""}" data-safe><p class="animated-number" data-from="${graphic.number!.from}" data-to="${graphic.number!.to}">${escapeHtml(graphic.number!.prefix || "")}<span>${graphic.number!.from.toFixed(graphic.number!.decimals ?? 0)}</span>${escapeHtml(graphic.number!.suffix || "")}</p><p class="number-context">${escapeHtml(scene.highlight)}</p></div>`;
      } else {
        const quote = graphic.quote!;
        visual = `<div class="quote-portrait">${image(scene.imageIndex)}</div><blockquote class="editorial-graphic quote-graphic" data-safe><p>“${escapeHtml(quote.text)}”</p><footer><strong>${escapeHtml(quote.name)}</strong><span>${escapeHtml(quote.role)}</span><cite>${escapeHtml(quote.source)}</cite></footer></blockquote>`;
      }
    }
    return `<section id="${scene.id}" class="scene ${scene.layout}${paper ? " paper" : ""}"${scene.start === 0 ? ' style="visibility:visible"' : ""} data-start="${scene.start}" data-duration="${scene.duration}" data-layout="${scene.layout}">
      <div class="scene-background">${image(scene.imageIndex, "", false, true)}</div>
      ${frameHtml}
      <div class="scene-topline"><span>${escapeHtml(scene.label)}</span><span>${String(index + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}</span></div>
      <div class="story" data-safe><h${index === 0 ? "1" : "2"} data-fit="60">${titleWords(scene.headline)}</h${index === 0 ? "1" : "2"}></div>
      ${visual}
    </section>`;
  }).join("\n");
  const mediaData = options.media || [];
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<title>${escapeHtml(script.headline)} — ${escapeHtml(brand.name)}</title>
<script src="assets/motion/gsap.min.js"></script>
<style>
@font-face{font-family:Outfit;src:url('assets/motion/outfit-regular.ttf') format('truetype');font-weight:400;font-display:block}
@font-face{font-family:Outfit;src:url('assets/motion/outfit-semibold.ttf') format('truetype');font-weight:600;font-display:block}
@font-face{font-family:Outfit;src:url('assets/motion/outfit-extrabold.ttf') format('truetype');font-weight:800;font-display:block}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#151613;color:#faf8f3;font-family:Outfit,sans-serif}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;--accent:${accent};--content-inset:76px;--frame-inset:24px}
.scene{position:absolute;inset:0;visibility:hidden;overflow:hidden;background:#151613}
.scene.paper{background:#f2eee4;color:#1c1e19}
.composition-frame{position:absolute;inset:96px var(--frame-inset) 346px;border:${frame.width}px solid #faf8f34d;border-radius:${frame.radius}px;pointer-events:none;z-index:10}
.paper .composition-frame{border-color:#1c1e194d}
.composition-frame:before,.composition-frame:after{content:"";position:absolute;width:46px;height:46px;border-color:var(--accent);border-style:solid}
.composition-frame:before{top:-${frame.width}px;left:-${frame.width}px;border-width:${frame.width}px 0 0 ${frame.width}px;border-top-left-radius:${frame.radius}px}
.composition-frame:after{right:-${frame.width}px;bottom:-${frame.width}px;border-width:0 ${frame.width}px ${frame.width}px 0;border-bottom-right-radius:${frame.radius}px}
.scene-background{position:absolute;inset:0;opacity:.12;overflow:hidden}
.scene-background img{width:100%;height:100%;object-fit:cover;filter:grayscale(1)}
.scene-background:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#151613 16%,transparent 42%,#151613 84%)}
.paper .scene-background{display:none}
.brand{position:absolute;top:118px;left:var(--content-inset);right:var(--content-inset);display:flex;align-items:center;gap:15px;z-index:20;font-size:25px;font-weight:600;letter-spacing:1px;color:#faf8f3;background:#151613;padding:14px 20px;border-radius:6px}
.brand img{width:59px;height:34px;object-fit:contain}.category{margin-left:auto;font-size:23px;color:#d6d2c9;font-weight:400}
.scene-topline{position:absolute;top:230px;left:var(--content-inset);right:var(--content-inset);display:flex;justify-content:space-between;font-size:23px;line-height:1.3;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--accent)}
.paper .scene-topline{color:#89401d}
.story{position:absolute;top:312px;left:var(--content-inset);right:var(--content-inset);height:248px;text-align:center}.story h1,.story h2{max-height:100%;overflow:visible}
h1,h2{font-size:78px;line-height:1.05;letter-spacing:-2.2px;font-weight:800;text-wrap:balance;overflow-wrap:break-word}
.word-mask{display:inline-block;overflow:clip;vertical-align:top;padding-bottom:6px;margin-bottom:-6px}.title-word{display:inline-block}
.media{position:absolute;left:var(--content-inset);right:var(--content-inset);top:720px;height:500px;overflow:hidden;border-radius:8px;background:#22251f;border:1px solid rgba(250,248,243,.22);box-shadow:0 24px 70px rgba(0,0,0,.18)}
.media img{width:100%;height:100%;object-fit:contain}.focus-surface{position:absolute;inset:0}.focus-outline{position:absolute;border:3px solid var(--accent);opacity:0}.focus-label{position:absolute;left:24px;bottom:24px;padding:10px 16px;background:#151613;color:#faf8f3;font-size:30px;opacity:0;max-width:calc(100% - 48px)}.media-edge{position:absolute;inset:0;border:1px solid rgba(250,248,243,.12);border-radius:8px;pointer-events:none}
.opening .story{top:312px;height:306px}.opening h1{font-size:94px}.opening .media{top:680px;height:540px;transform:rotate(-1.2deg)}
.opening-note{position:absolute;top:1230px;left:var(--content-inset);right:var(--content-inset);width:max-content;max-width:790px;margin-inline:auto;text-align:center;padding:18px 24px;background:var(--accent);color:#151613;font-size:33px;font-weight:600;line-height:1.15;transform:rotate(-1.2deg);border:1px solid #151613}
.image .media{top:640px;height:540px}
.note{position:absolute;left:var(--content-inset);right:var(--content-inset);top:1230px;display:flex;align-items:stretch;gap:22px;min-height:64px}.note-rule{width:4px;background:var(--accent);flex-shrink:0;transform-origin:top}.note p{font-size:37px;line-height:1.18;font-weight:400;text-wrap:balance}
.detail .media{top:1000px;left:215px;right:215px;height:365.625px;transform:none}
.fact-card{position:absolute;top:620px;left:var(--content-inset);right:var(--content-inset);height:340px;padding:28px 38px;border:1px solid rgba(250,248,243,.24);border-radius:8px;background:#20231c}
.fact-label{text-align:center;font-size:23px;font-weight:400;letter-spacing:2px;text-transform:uppercase;color:#cfccc3;margin-bottom:18px}
.fact-text{text-align:center;height:174px;font-size:78px;line-height:1.04;font-weight:800;letter-spacing:-2px;color:var(--accent);text-wrap:balance;overflow-wrap:break-word}
.fact-line{position:absolute;bottom:0;left:0;right:0;height:5px;background:var(--accent);transform-origin:left}
.brief .media{top:620px;height:393.75px;left:190px;right:190px;transform:rotate(1deg)}
.brief-points{position:absolute;left:var(--content-inset);right:var(--content-inset);top:1060px;display:grid;gap:12px}
.brief-point{position:relative;min-height:76px;display:flex;align-items:center;gap:24px;background:#e5dfd2;padding:12px 20px;overflow:hidden}
.point-index{font-size:30px;color:#a34a1d;font-weight:800}.brief-point p{font-size:35px;line-height:1.15;font-weight:600}.point-line{position:absolute;left:0;top:0;bottom:0;width:4px;background:#b65120;transform-origin:top}
.comparison-grid{position:absolute;left:var(--content-inset);right:var(--content-inset);top:740px;display:grid;grid-template-columns:1fr 1fr;gap:28px}
.compare-item{position:relative}.compare-photo{height:400px;background:#ddd7c8;border:1px solid #bcb5a7;border-radius:5px;overflow:hidden;display:flex;align-items:center}.compare-photo img{width:100%;height:100%;object-fit:contain}
.compare-item figcaption{text-align:center;padding-top:24px;font-size:38px;line-height:1.15;font-weight:600;overflow-wrap:break-word;text-wrap:balance}
.compare-divider{position:absolute;left:calc(50% - 1px);top:10px;width:2px;height:370px;background:#a85227;transform-origin:top}
.closing .story{top:945px;height:270px}.closing h2{font-size:78px}
.closing-stack{position:absolute;top:380px;left:var(--content-inset);right:var(--content-inset);height:390px}
.closing-stack img{position:absolute;width:690px;height:390px;object-fit:contain;background:#252820;border:6px solid #f2eee4;border-radius:4px;box-shadow:0 20px 60px #0005}
.stack-main{left:calc(50% - 410px);top:0;transform:rotate(-3deg)}.stack-secondary{left:calc(50% - 280px);top:65px;transform:rotate(3deg)}
.closing-action{position:absolute;top:1260px;left:var(--content-inset);right:var(--content-inset);font-size:36px;font-weight:600;line-height:1.2;padding-top:20px;border-top:1px solid #ffffff3b;display:flex;align-items:center;justify-content:space-between;gap:20px}.action-arrow{font-size:48px;color:var(--accent)}
.captions{position:absolute;left:120px;right:120px;top:0;height:1920px;z-index:30;pointer-events:none}
.caption{position:absolute;top:1380px;left:0;right:0;width:max-content;max-width:100%;margin-inline:auto;visibility:hidden;padding:14px 22px;background:#151613;color:#fff;font-size:56px;font-weight:600;line-height:1.12;text-align:center;text-wrap:balance;overflow-wrap:break-word;border-radius:4px}.caption em{font-style:normal;color:var(--accent)}
.note,.opening-note,.fact-card,.brief-point{opacity:0}
.fact-line{transform:scaleX(0)}.compare-divider{transform:scaleY(0)}
.progress{position:absolute;left:var(--content-inset);right:var(--content-inset);top:1550px;height:4px;background:#81817744;z-index:30;overflow:hidden}.progress-fill{width:100%;height:100%;background:var(--accent);transform-origin:left}
.caption[data-position="upper"]{top:550px}
.editorial-graphic{position:absolute;left:var(--content-inset);right:var(--content-inset);top:620px;min-height:480px}.graphic-event{display:flex;gap:28px;padding:24px 0;border-bottom:1px solid #ffffff30;opacity:0}.event-marker{font-size:32px;font-weight:600;color:var(--accent);min-width:60px}.graphic-event h3{font-size:46px;line-height:1.1;margin-bottom:12px}.graphic-event p{font-size:32px;line-height:1.25;color:#d6d2c9}.timeline .event-marker{position:relative}.timeline .graphic-event:not(:last-child) .event-marker:after{content:"";position:absolute;left:18px;top:48px;bottom:-16px;width:2px;background:var(--accent);opacity:.5}.scene:has(.editorial-graphic) .scene-background{opacity:.035}.calendar .event-marker{border:1px solid var(--accent);padding:12px;align-self:flex-start}.number-graphic{text-align:center;display:flex;flex-direction:column;justify-content:center;gap:32px}.animated-number{font-size:140px;font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums}.number-context{font-size:40px;line-height:1.2}.number-graphic.with-media{top:600px;min-height:0;height:300px}.media.number-support{top:940px;left:215px;right:215px;height:365.625px;transform:none}.quote-portrait{position:absolute;left:300px;right:300px;top:600px;height:270px;overflow:hidden}.quote-portrait img{width:100%;height:100%;object-fit:contain}.quote-graphic{top:920px;min-height:0}.quote-graphic>p{font-size:46px;line-height:1.2;text-align:center}.quote-graphic footer{margin-top:24px;text-align:center;display:grid;gap:8px}.quote-graphic strong{font-size:32px}.quote-graphic span,.quote-graphic cite{font-size:24px;font-style:normal;color:#cfccc3}.paper .graphic-event p{color:#3a3e35}.paper .graphic-event{border-color:#1c1e1930}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920">
${sceneHtml}
<header class="brand" data-safe>${brand.logoSrc ? `<img src="${escapeHtml(brand.logoSrc)}" alt="" />` : ""}<span>${escapeHtml(brand.name)}</span><span class="category">${escapeHtml(categoryLabel)}</span></header>
<div class="captions">${captions.map((caption, index) => {
    const words = caption.text.split(" ");
    const scene = scenes.find(item => caption.start >= item.start && caption.start < item.start + item.duration);
    const position = options.captions?.scenePositions?.[scene?.id || ""] || options.captions?.position || "bottom";
    const emphasis = options.captions?.emphasis?.map(normalizeText);
    const content = words.map((word, wordIndex) => (emphasis ? emphasis.includes(normalizeText(word)) : wordIndex === words.length - 1) ? `<em>${escapeHtml(word)}</em>` : escapeHtml(word)).join(" ");
    return `<div id="caption-${index}" class="caption" data-safe data-position="${position}"${caption.start === 0 ? ' style="visibility:visible"' : ""}>${content}</div>`;
  }).join("")}</div>
<div class="progress"><div class="progress-fill"></div></div>
</div>
<script>
window.__timelines=window.__timelines||{};
document.fonts.ready.then(()=>{
  document.querySelectorAll('[data-fit]').forEach(element=>{
    const minimum=Number(element.dataset.fit);
    let size=parseFloat(getComputedStyle(element).fontSize);
    const available=element.classList.contains('fact-text')?element.clientHeight:element.parentElement.clientHeight;
    while(size>minimum&&(element.scrollHeight>available+1||element.scrollWidth>element.clientWidth+1)){
      size-=2;element.style.fontSize=size+'px';
    }
  });
document.querySelectorAll(".media.has-focus").forEach(figure=>{
  const surface=figure.querySelector(".focus-surface");
  const image=surface.querySelector("img");
  const ratio=image.naturalWidth/image.naturalHeight;
  const cover=getComputedStyle(image).objectFit==="cover";
  const width=cover?Math.max(figure.clientWidth,figure.clientHeight*ratio):Math.min(figure.clientWidth,figure.clientHeight*ratio);
  const height=width/ratio;
  const position=getComputedStyle(image).objectPosition.split(" ").map(value=>parseFloat(value)/100);
  Object.assign(surface.style,{inset:"auto",left:(figure.clientWidth-width)*position[0]+"px",top:(figure.clientHeight-height)*position[1]+"px",width:width+"px",height:height+"px"});
});
const tl=gsap.timeline({paused:true});
function animate(selector,from,to,at){
  const targets=document.querySelectorAll(selector);
  if(targets.length)tl.fromTo(targets,from,to,at);
}
const scenes=${scriptJson(scenes)};
scenes.forEach((scene,index)=>{
  const selector="#"+scene.id;
  const entry=Math.min(.42,scene.duration*.16);
  const settle=Math.min(1.1,scene.duration*.3);
  tl.set(selector,{visibility:"visible"},scene.start);
  const nextTransition=scenes[index+1]?.transition;
  const overlap=nextTransition&&nextTransition.type!=="cut"?Math.min(nextTransition.duration??.35,(scenes[index+1]?.duration||1)*.2):0;
  tl.set(selector,{visibility:"hidden"},scene.start+scene.duration+overlap);
  const transition=scene.transition;
  if(index>0&&transition&&transition.type!=="cut"){
    const length=Math.min(transition.duration??.35,scene.duration*.2);
    if(transition.type==="dissolve")animate(selector,{opacity:0},{opacity:1,duration:length,ease:"sine.inOut",immediateRender:false},scene.start);
    if(transition.type==="wipe")animate(selector,{clipPath:transition.direction==="right"?"inset(0 0 0 100%)":"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0%)",duration:length,ease:"power2.inOut",immediateRender:false},scene.start);
    if(transition.type==="match")animate(selector+" .media",{x:transition.direction==="right"?48:-48,opacity:0},{x:0,opacity:1,duration:length,ease:"power3.out",immediateRender:false},scene.start);
  }
  if(index>0){
    animate(selector+" .title-word",{yPercent:110,filter:scene.motionBlur?"blur(6px)":"blur(0px)"},{yPercent:0,filter:"blur(0px)",duration:entry,stagger:.025,ease:"power3.out",immediateRender:false},scene.start);
    animate(selector+" .media, "+selector+" .compare-item:first-child",{y:45,opacity:.25},{y:0,opacity:1,duration:settle,ease:"power3.out",immediateRender:false},scene.start);
  }
  if(scene.motionExit&&scene.motionExit!=="cut"){
    const exitLength=Math.min(.2,scene.duration*.15);
    const targets=document.querySelectorAll(selector+" .story, "+selector+" .media, "+selector+" .editorial-graphic, "+selector+" .comparison-grid, "+selector+" .brief-points, "+selector+" .note, "+selector+" .opening-note, "+selector+" .fact-card");
    if(targets.length)tl.to(targets,{opacity:0,...(scene.motionExit==="lift"?{y:-18}:{}),duration:exitLength,ease:"power2.in"},scene.start+scene.duration-exitLength);
  }
  const noteTime=scene.start+Math.min(1.15,scene.duration*.28);
  animate(selector+" .note, "+selector+" .opening-note",{y:18,opacity:0},{y:0,opacity:1,duration:entry,ease:"power2.out",immediateRender:false},noteTime);
  animate(selector+" .fact-card",{y:30,scale:.97,opacity:.4},{y:0,scale:1,opacity:1,duration:settle,ease:"power3.out",immediateRender:false},scene.start+.18);
  animate(selector+" .fact-line, "+selector+" .compare-divider",{scaleX:0,scaleY:0},{scaleX:1,scaleY:1,duration:Math.min(1,scene.duration*.3),ease:"power2.out",immediateRender:false},scene.start+.4);
  animate(selector+" .brief-point",{x:-35,opacity:0},{x:0,opacity:1,duration:entry,stagger:Math.min(.55,scene.duration*.12),ease:"power3.out",immediateRender:false},scene.start+.5);
  if(scene.focus){
    const at=Math.max(scene.start,scene.focusStart??scene.start+.7);
    animate(selector+" .focus-surface",{scale:1},{scale:scene.focus.zoom??1.6,duration:Math.min(.65,scene.duration*.2),ease:"power2.inOut",immediateRender:false},at);
    animate(selector+" .focus-outline, "+selector+" .focus-label",{opacity:0},{opacity:1,duration:.25,immediateRender:false},at);
  }
  (scene.eventTimes||[]).forEach((at,eventIndex)=>animate(selector+' [data-event="'+eventIndex+'"]',{opacity:0,y:18},{opacity:1,y:0,duration:entry,ease:"power3.out",immediateRender:false},at));
  if(scene.layout==="comparison"){
    animate(selector+" .compare-item:nth-child(2)",{opacity:0,y:18},{opacity:1,y:0,duration:entry,ease:"power3.out",immediateRender:false},scene.start+Math.min(.7,scene.duration*.2));
  }
  animate(selector+" .stack-secondary",{x:55,rotation:10},{x:0,rotation:3,duration:settle,ease:"power3.out",immediateRender:false},scene.start);
});
const captions=${scriptJson(captions)};
captions.forEach((caption,index)=>{
  tl.set("#caption-"+index,{visibility:"visible"},caption.start);
  tl.set("#caption-"+index,{visibility:"hidden"},caption.end);
});
tl.fromTo(".progress-fill",{scaleX:0},{scaleX:1,duration:${duration},ease:"none"},0);
tl.to({}, {duration:${duration}},0);tl.seek(0);window.__timelines.main=tl;
const media=${scriptJson(mediaData)};
window.__seekMedia=async(at)=>{
  scenes.filter(scene=>scene.graphic?.type==="number").forEach(scene=>{
    const number=scene.graphic.number;
    const progress=Math.min(1,Math.max(0,(at-scene.start-.15)/Math.min(1.4,scene.duration*.45)));
    const value=number.from+(number.to-number.from)*(1-Math.pow(1-progress,3));
    document.querySelector("#"+scene.id+" .animated-number span").textContent=value.toLocaleString("pt-BR",{minimumFractionDigits:number.decimals??0,maximumFractionDigits:number.decimals??0});
  });
  const pending=[];
  document.querySelectorAll("img[data-video]").forEach(element=>{
    const section=element.closest(".scene");
    if(getComputedStyle(section).visibility!=="visible")return;
    const item=media[Number(element.dataset.video)];
    const sequence=item.frames;
    const local=Math.max(0,at-Number(section.dataset.start));
    let frame=Math.floor(local*sequence.fps+0.00001);
    if(item.endBehavior==="loop")frame%=sequence.count;
    frame=Math.min(sequence.count-1,frame);
    const source=sequence.pattern.replace("%06d",String(frame+1).padStart(6,"0"));
    if(element.getAttribute("src")!==source){element.src=source;pending.push(element.decode());}
  });
  await Promise.all(pending);
};
window.__seek=async(at)=>{tl.seek(Math.min(${duration}-.00001,Math.max(0,at)));await window.__seekMedia(at);};
});
</script></body></html>`;
}
