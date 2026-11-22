export type SfxPresetId = "whoosh" | "pop" | "impact" | "click" | "riser" | "chime" | "tick" | "glitch";

export interface SfxPresetInfo {
  id: SfxPresetId;
  description: string;
  defaultDuration: number;
  defaultGainDb: number;
}

export interface RenderedSfx {
  preset: SfxPresetId;
  filePath: string;
  duration: number;
  gainDb: number;
  sampleRate: number;
  channels: number;
  sha256: string;
  synthetic: true;
  license: string;
}

export const SFX_PRESETS: readonly SfxPresetId[];
export function listSfxPresets(): SfxPresetInfo[];
export function renderSfxWav(
  presetId: SfxPresetId,
  outputPath: string,
  options?: { duration?: number; gainDb?: number; seed?: number },
): RenderedSfx;
