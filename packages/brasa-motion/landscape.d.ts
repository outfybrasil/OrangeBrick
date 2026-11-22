export const LONG_SCENE_LAYOUTS: string[];

export interface LandscapeBrand {
  name: string;
  accent?: string;
  logoPath?: string;
}

export interface LandscapeScene {
  layout?: string;
  headline?: string;
  highlight?: string;
  beats?: number[];
  [field: string]: unknown;
}

export interface LandscapeRenderVerification {
  fingerprint: string;
  bytes: number;
  layout: string;
  fps: number;
  frames: number;
  animated_frames?: number;
  camera: string;
  fixed_frame_verified: boolean;
  static_hold_sec: number;
  [field: string]: unknown;
}

export function resolveLongLayout(scene: LandscapeScene, previousLayout?: string): string;
export function validateLongScene(scene: LandscapeScene): string;
export function validateLayoutSequence(scenes: LandscapeScene[], maxRun?: number): void;
export function summarizeLayouts(scenes: LandscapeScene[]): { counts: Record<string, number>; dominant?: string; dominantShare: number };
export interface LandscapeCaption {
  text: string;
  start: number;
  end: number;
}

export function revealTimes(count: number, beats?: number[]): number[];
export function countableValue(value: unknown): { prefix: string; suffix: string; to: number; decimals: number; style: "pt" | "dot"; text: string } | null;
export function isWideMedia(scene: LandscapeScene): boolean;
export function generateCaptionOverlayHtml(caption: LandscapeCaption, fonts?: string): string;
export function resolveLandscapeBrand(brand: LandscapeBrand & { logoSrc?: string }): { name: string; accent: string; accentSoft: string; logoSrc?: string };
export function generateLongSceneHtml(scene: LandscapeScene, options?: { mediaSrc?: string; gsapSource?: string; fonts?: string; duration?: number; brand: LandscapeBrand & { logoSrc?: string }; captions?: LandscapeCaption[] }): string;
export function createLandscapeRenderer(options: { ffmpeg?: string; brand: LandscapeBrand; workers?: number; chromium?: unknown }): Promise<{
  render(scene: LandscapeScene, duration: number, output: string, captions?: LandscapeCaption[]): Promise<LandscapeRenderVerification>;
  renderAll<Job extends { scene: LandscapeScene; duration: number; output: string; captions?: LandscapeCaption[] }>(jobs: Job[], onDone?: (job: Job, verification: LandscapeRenderVerification, completed: number) => void): Promise<LandscapeRenderVerification[]>;
  workers: number;
  close(): Promise<void>;
}>;
