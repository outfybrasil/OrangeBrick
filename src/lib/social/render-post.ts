import type { SocialPostSlide } from "../types/database";

export type SocialRenderResources = { logo: HTMLImageElement; image?: HTMLImageElement; backdrop?: HTMLImageElement; font: string };

export async function loadSocialImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

let fontPromise: Promise<string> | null = null;

export function socialRenderFont(): Promise<string> {
  if (!fontPromise) fontPromise = (async () => {
    const faces = [
      new FontFace("OrangeBrickSocial", 'url("/fonts/outfit-social-extrabold.ttf")', { weight: "900" }),
      new FontFace("OrangeBrickSocial", 'url("/fonts/outfit-social-regular.ttf")', { weight: "400" }),
    ];
    for (const face of await Promise.all(faces.map(face => face.load()))) document.fonts.add(face);
    return "OrangeBrickSocial";
  })().catch(() => {
    fontPromise = null;
    throw new Error("A fonte da marca não carregou. Tente preparar a prévia novamente.");
  });
  return fontPromise;
}

function linesFor(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (ctx.measureText([line, word].filter(Boolean).join(" ")).width > width && line) { lines.push(line); line = ""; }
      for (const character of (line ? " " : "") + word) {
        if (ctx.measureText(line + character).width > width && line) { lines.push(line); line = ""; }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

export const SOCIAL_SLIDE_WIDTH = 1080;
export const SOCIAL_SLIDE_HEIGHT = 1350;
const MARGIN = 64;
const CONTENT_WIDTH = SOCIAL_SLIDE_WIDTH - MARGIN * 2;

function drawText(ctx: CanvasRenderingContext2D, text: string, box: { x: number; y: number; width: number; height: number }, font: string, size: number, weight: number, color: string, minSize: number, label: string, align: CanvasTextAlign = "left") {
  if (!text) return;
  let lines: string[] = [];
  for (; size >= minSize; size--) {
    ctx.font = `${weight} ${size}px ${font}`;
    lines = linesFor(ctx, text, box.width);
    if (lines.length * size * 1.12 <= box.height) break;
  }
  if (size < minSize) throw new Error(`${label} não cabe no slide com letra legível no celular. Encurte o texto antes de baixar.`);
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = align;
  const x = align === "right" ? box.x + box.width : box.x;
  lines.forEach((line, index) => ctx.fillText(line, x, box.y + index * size * 1.12));
  ctx.textAlign = "left";
}

const BG = "#0d0e12";
const ORANGE = "#ff5e00";
const MUTED = "#c7c8cd";
const COVER_FADE_TOP = 560;
const CONTENT_IMAGE_HEIGHT = 860;

function drawPhoto(ctx: CanvasRenderingContext2D, image: HTMLImageElement, box: { x: number; y: number; width: number; height: number }, positionX = 50, positionY = 50) {
  const scale = Math.max(box.width / image.width, box.height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.width, box.height); ctx.clip();
  ctx.drawImage(image, box.x + (box.width - w) * positionX / 100, box.y + (box.height - h) * positionY / 100, w, h);
  ctx.restore();
}

function fade(ctx: CanvasRenderingContext2D, from: number, to: number, reverse = false) {
  const gradient = ctx.createLinearGradient(0, from, 0, to);
  gradient.addColorStop(0, reverse ? "rgba(13,14,18,0.78)" : "rgba(13,14,18,0)");
  if (!reverse) gradient.addColorStop(0.55, "rgba(13,14,18,0.86)");
  gradient.addColorStop(1, reverse ? "rgba(13,14,18,0)" : BG);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, from, SOCIAL_SLIDE_WIDTH, to - from);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, image?: HTMLImageElement) {
  if (!image) return;
  ctx.save();
  ctx.filter = "blur(22px)";
  drawPhoto(ctx, image, { x: -60, y: -60, width: SOCIAL_SLIDE_WIDTH + 120, height: SOCIAL_SLIDE_HEIGHT + 120 });
  ctx.restore();
  ctx.fillStyle = "rgba(13,14,18,0.68)";
  ctx.fillRect(0, 0, SOCIAL_SLIDE_WIDTH, SOCIAL_SLIDE_HEIGHT);
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, y: number, font: string, color = ORANGE) {
  ctx.font = `900 26px ${font}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(text.toLocaleUpperCase("pt-BR"), MARGIN, y);
}

export function renderSocialSlide(canvas: HTMLCanvasElement, slide: SocialPostSlide, index: number, total: number, resources: SocialRenderResources) {
  canvas.width = SOCIAL_SLIDE_WIDTH;
  canvas.height = SOCIAL_SLIDE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não oferece suporte à prévia. Tente outro navegador.");
  const { logo, image, backdrop, font } = resources;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SOCIAL_SLIDE_WIDTH, SOCIAL_SLIDE_HEIGHT);
  const title = slide.title;
  if (slide.kind === "cover" && image) {
    drawPhoto(ctx, image, { x: 0, y: 0, width: SOCIAL_SLIDE_WIDTH, height: SOCIAL_SLIDE_HEIGHT }, slide.positionX, slide.positionY);
    fade(ctx, 0, 240, true);
    fade(ctx, COVER_FADE_TOP, SOCIAL_SLIDE_HEIGHT);
    ctx.fillStyle = ORANGE; ctx.fillRect(MARGIN, 812, 90, 8);
    drawText(ctx, title, { x: MARGIN, y: 846, width: CONTENT_WIDTH, height: slide.text ? 250 : 320 }, font, 92, 900, "#ffffff", 54, "A manchete");
    drawText(ctx, slide.text, { x: MARGIN, y: 1110, width: CONTENT_WIDTH, height: 84 }, font, 36, 400, MUTED, 30, "O texto da capa");
    if (total > 1) drawLabel(ctx, "Deslize para entender →", 1266, font);
  } else if (slide.kind === "content" && image) {
    drawPhoto(ctx, image, { x: 0, y: 0, width: SOCIAL_SLIDE_WIDTH, height: CONTENT_IMAGE_HEIGHT }, slide.positionX, slide.positionY);
    fade(ctx, 0, 240, true);
    fade(ctx, CONTENT_IMAGE_HEIGHT - 300, CONTENT_IMAGE_HEIGHT);
    ctx.fillStyle = ORANGE; ctx.fillRect(MARGIN, 868, 90, 6);
    drawText(ctx, title, { x: MARGIN, y: 896, width: CONTENT_WIDTH, height: 136 }, font, 58, 900, "#ffffff", 40, "O título do slide");
    drawText(ctx, slide.text, { x: MARGIN, y: 1046, width: CONTENT_WIDTH, height: 170 }, font, 38, 400, MUTED, 30, "O texto do slide");
  } else if (slide.kind === "cta") {
    drawBackdrop(ctx, image || backdrop);
    drawLabel(ctx, "Sua vez", 250, font);
    drawText(ctx, title, { x: MARGIN, y: 300, width: CONTENT_WIDTH, height: 600 }, font, 92, 900, "#ffffff", 54, "A pergunta do CTA");
    if (slide.text) {
      ctx.fillStyle = ORANGE;
      ctx.beginPath(); ctx.roundRect(MARGIN, 990, CONTENT_WIDTH, 170, 10); ctx.fill();
      drawText(ctx, slide.text, { x: MARGIN + 44, y: 1036, width: CONTENT_WIDTH - 88, height: 84 }, font, 52, 900, BG, 34, "O texto do CTA");
    }
  } else {
    drawBackdrop(ctx, image || backdrop);
    ctx.fillStyle = ORANGE; ctx.fillRect(MARGIN, 270, 90, 8);
    drawText(ctx, title, { x: MARGIN, y: 310, width: CONTENT_WIDTH, height: 330 }, font, 84, 900, "#ffffff", 50, "O título do slide");
    if (slide.text) {
      ctx.fillStyle = "rgba(22,24,30,0.92)";
      ctx.beginPath(); ctx.roundRect(MARGIN, 690, CONTENT_WIDTH, 500, 10); ctx.fill();
      ctx.fillStyle = ORANGE; ctx.fillRect(MARGIN, 690, 10, 500);
      drawText(ctx, slide.text, { x: MARGIN + 50, y: 740, width: CONTENT_WIDTH - 100, height: 400 }, font, 46, 400, "#e5e5e5", 32, "O texto do slide");
    }
  }
  ctx.drawImage(logo, MARGIN, 52, 250, 250 * logo.height / logo.width);
  drawText(ctx, `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`, { x: SOCIAL_SLIDE_WIDTH - MARGIN - 160, y: 58, width: 160, height: 34 }, font, 28, 400, MUTED, 24, "O contador", "right");
  if (slide.kind !== "cover" || !image) {
    ctx.fillStyle = "#36383f"; ctx.fillRect(MARGIN, 1236, CONTENT_WIDTH, 1);
    drawText(ctx, slide.kind === "cta" ? "ORANGE BRICK • NOTÍCIAS DE GAMES" : "ORANGE BRICK • CRÉDITOS NA LEGENDA", { x: MARGIN, y: 1254, width: CONTENT_WIDTH, height: 30 }, font, 24, 400, MUTED, 24, "O rodapé");
  }
}

export const SOCIAL_MOTION_SECONDS = 5;
export const SOCIAL_STORY_HEIGHT = 1920;

function wave(t: number, period: number) {
  return Math.sin(Math.PI * ((t % period) / period)) ** 2;
}

export function renderSocialCoverMotion(canvas: HTMLCanvasElement, slide: SocialPostSlide, total: number, resources: SocialRenderResources, t: number) {
  renderSocialSlide(canvas, slide, 0, total, resources);
  const ctx = canvas.getContext("2d");
  if (!ctx || !resources.image) return;
  const image = { y: 0, height: SOCIAL_SLIDE_HEIGHT };
  ctx.fillStyle = ORANGE;
  ctx.fillRect(MARGIN + 90, 812, 150 * wave(t, SOCIAL_MOTION_SECONDS / 2), 8);
  const shine = Math.min(1, Math.max(0, (t - 0.8) / 1.4));
  if (shine > 0 && shine < 1) {
    const x = -500 + shine * (SOCIAL_SLIDE_WIDTH + 1000);
    const gradient = ctx.createLinearGradient(x - 220, 0, x + 220, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.16)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.beginPath(); ctx.rect(0, image.y, SOCIAL_SLIDE_WIDTH, COVER_FADE_TOP); ctx.clip();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, image.y, SOCIAL_SLIDE_WIDTH, COVER_FADE_TOP);
    ctx.restore();
  }
  const pill = { width: 236, height: 60 };
  const x = SOCIAL_SLIDE_WIDTH - MARGIN - pill.width;
  const y = COVER_FADE_TOP + 120;
  ctx.fillStyle = "rgba(13,14,18,0.88)";
  ctx.beginPath(); ctx.roundRect(x, y, pill.width, pill.height, 30); ctx.fill();
  ctx.font = `900 26px ${resources.font}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("ARRASTE", x + 26, y + pill.height / 2 + 1);
  ctx.font = `900 44px ${resources.font}`;
  const step = (t * 2) % 1.5;
  for (let index = 0; index < 3; index++) {
    const lit = Math.max(0, 1 - Math.abs(step - index * 0.4) * 2.2);
    ctx.fillStyle = `rgba(255,94,0,${0.35 + 0.65 * lit})`;
    ctx.fillText("›", x + 150 + index * 22, y + pill.height / 2 - 3);
  }
}

export function renderSocialStory(canvas: HTMLCanvasElement, slide: SocialPostSlide, resources: SocialRenderResources) {
  canvas.width = SOCIAL_SLIDE_WIDTH;
  canvas.height = SOCIAL_STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não oferece suporte à prévia. Tente outro navegador.");
  const { logo, image, font } = resources;
  ctx.fillStyle = "#0d0e12";
  ctx.fillRect(0, 0, SOCIAL_SLIDE_WIDTH, SOCIAL_STORY_HEIGHT);
  ctx.drawImage(logo, MARGIN, 270, 340, 340 * logo.height / logo.width);
  drawText(ctx, "NOVO NO FEED", { x: SOCIAL_SLIDE_WIDTH - MARGIN - 300, y: 272, width: 300, height: 34 }, font, 28, 900, "#ff5e00", 24, "O selo", "right");
  ctx.fillStyle = "#ff5e00";
  ctx.fillRect(MARGIN, 380, 90, 6);
  drawText(ctx, slide.title.toLocaleUpperCase("pt-BR"), { x: MARGIN, y: 414, width: CONTENT_WIDTH, height: 400 }, font, 100, 900, "#ffffff", 56, "A manchete do story");
  if (image) {
    const box = { x: 0, y: 860, width: SOCIAL_SLIDE_WIDTH, height: 608 };
    const scale = Math.max(box.width / image.width, box.height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.width, box.height); ctx.clip();
    ctx.drawImage(image, box.x + (box.width - w) * slide.positionX / 100, box.y + (box.height - h) * slide.positionY / 100, w, h);
    ctx.restore();
  }
  drawText(ctx, "Toque no link para ler a matéria completa.", { x: MARGIN, y: 1500, width: CONTENT_WIDTH, height: 90 }, font, 38, 400, "#e5e5e5", 34, "O convite do story");
}

export function socialCanvasJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível exportar o slide.")), "image/jpeg", 0.96));
}
