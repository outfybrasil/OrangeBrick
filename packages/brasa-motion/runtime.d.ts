import type { MotionMedia } from "./dist/index.js";

export function prepareMotionAssets(
  compositionDirectory: string,
  logoPath?: string,
): Promise<{ logoSrc?: string }>;

export function probeVideoDuration(file: string, options?: { ffprobe?: string }): number;

export function prepareAudioMezzanine(
  sourcePath: string,
  outputPath: string,
  options?: { ffmpeg?: string; sampleRate?: number; audioOnly?: boolean; timeoutMs?: number },
): Promise<{ outputPath: string; sampleRate: number; audioOnly: boolean; codec: "pcm_s16le" }>;

export function prepareMotionMedia(
  compositionDirectory: string,
  media: MotionMedia[],
  options?: { ffmpeg?: string; ffprobe?: string; fps?: number; width?: number },
): Promise<Array<MotionMedia & { poster?: string }>>;

export function inspectComposition(
  htmlPath: string,
  times: number[],
  options?: { chromium?: unknown; width?: number; height?: number },
): Promise<string[]>;
