export interface MotionColor {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
}

export interface MotionMedia {
  type: "image" | "video";
  path: string;
  description: string;
  in?: number;
  out?: number;
  speed?: number;
  fit?: "contain" | "cover";
  position?: { x: number; y: number };
  endBehavior?: "error" | "hold" | "loop";
  sourceAudio?: { gainDb: number; fade?: number };
  color?: MotionColor;
  analysis?: { frozen: { start: number; end: number }[] };
  frames?: { pattern: string; count: number; fps: number; duration: number };
}

export interface MotionTransition {
  type: "cut" | "dissolve" | "wipe" | "match";
  duration?: number;
  direction?: "left" | "right";
}

export interface MotionFocus {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom?: number;
  dim?: number;
  label: string;
  anchor?: string;
}

export interface MotionGraphic {
  type: "timeline" | "calendar" | "number" | "quote";
  withMedia?: boolean;
  items?: { label: string; detail: string; anchor?: string }[];
  number?: { from: number; to: number; decimals?: number; prefix?: string; suffix?: string };
  quote?: { text: string; name: string; role: string; source: string };
}

export interface MotionCaptionStyle {
  maxWords?: number;
  maxChars?: number;
  emphasis?: string[];
  position?: "bottom" | "upper";
  scenePositions?: Record<string, "bottom" | "upper">;
}

export function colorFilter(color?: MotionColor): string {
  if (!color) return "none";
  const { exposure = 0, contrast = 1, saturation = 1, temperature = 0 } = color;
  if (![exposure, contrast, saturation, temperature].every(Number.isFinite) || Math.abs(exposure) > 2 || contrast < .5 || contrast > 1.8 || saturation < 0 || saturation > 2 || Math.abs(temperature) > 1) throw new Error("Correção de cor fora dos limites permitidos.");
  return `brightness(${2 ** exposure}) contrast(${contrast}) saturate(${saturation}) sepia(${Math.abs(temperature) * .15}) hue-rotate(${temperature * 8}deg)`;
}

export function validateEffects(transition?: MotionTransition, focus?: MotionFocus, graphic?: MotionGraphic): void {
  if (transition && (!["cut", "dissolve", "wipe", "match"].includes(transition.type) || !Number.isFinite(transition.duration ?? .35) || (transition.duration ?? .35) < .08 || (transition.duration ?? .35) > 1 || (transition.direction !== undefined && !["left", "right"].includes(transition.direction)))) throw new Error("Transição inválida.");
  if (focus && (![focus.x, focus.y, focus.width, focus.height, focus.zoom ?? 1.6, focus.dim ?? .45].every(Number.isFinite) || focus.x < 0 || focus.y < 0 || focus.width <= 0 || focus.height <= 0 || focus.x + focus.width > 1 || focus.y + focus.height > 1 || (focus.zoom ?? 1.6) < 1 || (focus.zoom ?? 1.6) > 3 || (focus.dim ?? .45) < 0 || (focus.dim ?? .45) > .8 || !focus.label?.trim())) throw new Error("Região de foco inválida; use coordenadas normalizadas dentro da imagem.");
  if (!graphic) return;
  if (graphic.withMedia && graphic.type !== "number") throw new Error("Mídia de apoio está disponível para o gráfico de número.");
  if (!["timeline", "calendar", "number", "quote"].includes(graphic.type)) throw new Error("Gráfico editorial desconhecido.");
  if (["timeline", "calendar"].includes(graphic.type) && (!graphic.items?.length || graphic.items.length > 4 || graphic.items.some(item => !item.label?.trim() || !item.detail?.trim()))) throw new Error("A linha do tempo precisa de 1 a 4 eventos identificados.");
  if (graphic.type === "number" && (!graphic.number || ![graphic.number.from, graphic.number.to].every(Number.isFinite) || !Number.isInteger(graphic.number.decimals ?? 0) || (graphic.number.decimals ?? 0) < 0 || (graphic.number.decimals ?? 0) > 3)) throw new Error("Número animado inválido.");
  if (graphic.type === "quote" && (!graphic.quote || [graphic.quote.text, graphic.quote.name, graphic.quote.role, graphic.quote.source].some(value => !value?.trim()))) throw new Error("A declaração precisa de texto, pessoa, cargo e fonte.");
}
