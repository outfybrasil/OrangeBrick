import {
  buildEditPlan,
  buildCaptions,
  generateCompositionHtml as generateMotionHtml,
  resolveVisualStyle,
  MOTION_VISUAL_STYLES,
  type MotionOptions,
  type MotionEditScene,
  type MotionVisualStyle,
  type NarrationSentence,
} from "@brasa/motion";
import { CATEGORY_CONFIG, type PostCategory } from "../types/database.ts";

export type ReelVisualStyle = MotionVisualStyle;
export type ReelEditScene = MotionEditScene;
export type { NarrationSentence };
export const REEL_VISUAL_STYLES = MOTION_VISUAL_STYLES;
export { resolveVisualStyle };

export interface CompositionOptions extends MotionOptions {
  category: PostCategory;
}

function orangeBrickOptions(options: CompositionOptions): MotionOptions {
  return {
    ...options,
    categoryLabel: CATEGORY_CONFIG[options.category]?.label || "Games",
    brand: {
      name: "ORANGE BRICK",
      accent: "#ff7a36",
      handle: "@ob.labs",
      logoSrc: "assets/motion/brand.png",
      ...options.brand,
    },
  };
}

export function buildReelEditPlan(options: CompositionOptions): ReelEditScene[] {
  return buildEditPlan(orangeBrickOptions(options));
}

export function getReelSceneStarts(options: CompositionOptions): number[] {
  return buildReelEditPlan(options).map((scene) => scene.start);
}

export const buildReelCaptions = buildCaptions;

export function generateCompositionHtml(options: CompositionOptions): string {
  return generateMotionHtml(orangeBrickOptions(options));
}
