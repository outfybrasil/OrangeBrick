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

function drawText(ctx: CanvasRenderingContext2D, text: string, box: { x: number; y: number; width: number; height: number }, font: string, size: number, weight: number, color: string) {
  if (!text) return;
  let lines: string[] = [];
  for (; size >= 16; size--) {
    ctx.font = `${weight} ${size}px ${font}`;
    lines = linesFor(ctx, text, box.width);
    if (lines.length * size * 1.12 <= box.height) break;
  }
  if (size < 16) throw new Error("O texto ultrapassa o espaço do slide. Reduza o conteúdo antes de baixar.");
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  lines.forEach((line, index) => ctx.fillText(line, box.x, box.y + index * size * 1.12));
}

export function renderSocialSlide(canvas: HTMLCanvasElement, slide: SocialPostSlide, index: number, total: number, resources: SocialRenderResources) {
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não oferece suporte à prévia. Tente outro navegador.");
  const { logo, image, font } = resources;
  ctx.fillStyle = "#0d0e12";
  ctx.fillRect(0, 0, 1080, 1080);
  const cover = slide.kind === "cover";
  const inset = cover ? 162 : 54;
  const contentWidth = 1080 - inset * 2;
  ctx.drawImage(logo, inset, 36, 310, 310 * logo.height / logo.width);
  drawText(ctx, `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`, { x: cover ? 806 : 914, y: 44, width: 112, height: 32 }, font, 23, 400, "#c7c8cd");
  if (image) {
    const box = { x: 0, y: 110, width: 1080, height: 530 };
    const scale = slide.fit === "cover" ? Math.max(box.width / image.width, box.height / image.height) : Math.min(box.width / image.width, box.height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.width, box.height); ctx.clip();
    ctx.drawImage(image, box.x + (box.width - w) * slide.positionX / 100, box.y + (box.height - h) * slide.positionY / 100, w, h);
    ctx.restore();
    ctx.fillStyle = "#ff5e00";
    ctx.fillRect(inset, 658, 90, 6);
    drawText(ctx, slide.title.toLocaleUpperCase("pt-BR"), { x: inset, y: 690, width: contentWidth, height: slide.kind === "cover" ? 230 : 130 }, font, slide.kind === "cover" ? 88 : 52, 900, slide.kind === "cover" ? "#ff5e00" : "#ffffff");
    drawText(ctx, slide.text, { x: inset, y: slide.kind === "cover" ? 940 : 840, width: contentWidth, height: slide.kind === "cover" ? 66 : 170 }, font, slide.kind === "cover" ? 24 : 30, 400, "#e5e5e5");
  } else {
    ctx.fillStyle = "#ff5e00"; ctx.fillRect(54, 210, 90, 6);
    drawText(ctx, slide.title.toLocaleUpperCase("pt-BR"), { x: 54, y: 260, width: 972, height: 310 }, font, 94, 900, slide.kind === "cta" ? "#ff5e00" : "#ffffff");
    drawText(ctx, slide.text, { x: 54, y: 610, width: 972, height: 340 }, font, slide.kind === "cta" ? 32 : 43, 400, "#e5e5e5");
  }
  ctx.fillStyle = "#36383f"; ctx.fillRect(inset, 1026, contentWidth, 1);
  drawText(ctx, slide.kind === "cta" ? "ORANGE BRICK • NOTÍCIAS DE GAMES" : "ORANGE BRICK • CONFIRA OS CRÉDITOS NA LEGENDA", { x: inset, y: 1040, width: contentWidth, height: 24 }, font, 17, 400, "#c7c8cd");
}

export function socialCanvasJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível exportar o slide.")), "image/jpeg", 0.96));
}
