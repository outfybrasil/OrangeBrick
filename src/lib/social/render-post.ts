import type { SocialPostSlide } from "../types/database";

export type SocialRenderResources = { logo: HTMLImageElement; image?: HTMLImageElement; font: string };

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

export function renderSocialSlide(canvas: HTMLCanvasElement, slide: SocialPostSlide, index: number, total: number, resources: SocialRenderResources) {
  canvas.width = SOCIAL_SLIDE_WIDTH;
  canvas.height = SOCIAL_SLIDE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não oferece suporte à prévia. Tente outro navegador.");
  const { logo, image, font } = resources;
  const cover = slide.kind === "cover";
  ctx.fillStyle = "#0d0e12";
  ctx.fillRect(0, 0, SOCIAL_SLIDE_WIDTH, SOCIAL_SLIDE_HEIGHT);
  ctx.drawImage(logo, MARGIN, 60, 320, 320 * logo.height / logo.width);
  drawText(ctx, `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`, { x: SOCIAL_SLIDE_WIDTH - MARGIN - 160, y: 60, width: 160, height: 34 }, font, 28, 400, "#c7c8cd", 24, "O contador", "right");
  const title = slide.title.toLocaleUpperCase("pt-BR");
  if (image) {
    const box = { x: 0, y: 140, width: SOCIAL_SLIDE_WIDTH, height: 608 };
    const scale = slide.fit === "cover" ? Math.max(box.width / image.width, box.height / image.height) : Math.min(box.width / image.width, box.height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.width, box.height); ctx.clip();
    ctx.drawImage(image, box.x + (box.width - w) * slide.positionX / 100, box.y + (box.height - h) * slide.positionY / 100, w, h);
    ctx.restore();
    ctx.fillStyle = "#ff5e00";
    ctx.fillRect(MARGIN, 784, 90, 6);
    if (cover) {
      drawText(ctx, title, { x: MARGIN, y: 816, width: CONTENT_WIDTH, height: slide.text ? 290 : 390 }, font, 96, 900, "#ff5e00", 56, "A manchete");
      drawText(ctx, slide.text, { x: MARGIN, y: 1120, width: CONTENT_WIDTH, height: 90 }, font, 38, 400, "#e5e5e5", 34, "O texto da capa");
    } else {
      drawText(ctx, title, { x: MARGIN, y: 816, width: CONTENT_WIDTH, height: 140 }, font, 58, 900, "#ffffff", 40, "O título do slide");
      drawText(ctx, slide.text, { x: MARGIN, y: 976, width: CONTENT_WIDTH, height: 236 }, font, 40, 400, "#e5e5e5", 34, "O texto do slide");
    }
  } else {
    ctx.fillStyle = "#ff5e00"; ctx.fillRect(MARGIN, 300, 90, 6);
    drawText(ctx, title, { x: MARGIN, y: 350, width: CONTENT_WIDTH, height: 400 }, font, 100, 900, slide.kind === "cta" ? "#ff5e00" : "#ffffff", 56, "O título do slide");
    drawText(ctx, slide.text, { x: MARGIN, y: 790, width: CONTENT_WIDTH, height: 420 }, font, slide.kind === "cta" ? 44 : 48, 400, "#e5e5e5", 34, "O texto do slide");
  }
  ctx.fillStyle = "#36383f"; ctx.fillRect(MARGIN, 1236, CONTENT_WIDTH, 1);
  drawText(ctx, slide.kind === "cta" ? "ORANGE BRICK • NOTÍCIAS DE GAMES" : "ORANGE BRICK • CRÉDITOS NA LEGENDA", { x: MARGIN, y: 1254, width: CONTENT_WIDTH, height: 30 }, font, 24, 400, "#c7c8cd", 24, "O rodapé");
}

export function socialCanvasJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível exportar o slide.")), "image/jpeg", 0.96));
}
