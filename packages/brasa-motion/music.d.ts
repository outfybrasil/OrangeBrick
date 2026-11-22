export type MusicMood = "calm" | "electronic" | "game" | "ambient";
export type MusicIntensity = "low" | "medium" | "high";
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  file: string;
  filePath: string;
  sourceUrl: string;
  license: string;
  moods: MusicMood[];
  intensity: MusicIntensity;
  durationSeconds: number;
  loopable: boolean;
  sha256: string;
}
export interface MusicSelection {
  id?: string;
  mood?: MusicMood;
  intensity?: MusicIntensity;
  minDuration?: number;
  excludeIds?: string[];
  seed?: number;
}
export const musicDirectory: string;
export function listMusicTracks(options?: MusicSelection): MusicTrack[];
export function selectMusicTrack(options?: MusicSelection): MusicTrack;
export function selectMusicPlaylist(options: MusicSelection & { duration: number }): MusicTrack[];
import type { SfxPresetId } from "./sfx.js";

export interface MixSfxEvent {
  preset?: SfxPresetId;
  filePath?: string;
  at: number;
  duration?: number;
  gainDb?: number;
  seed?: number;
}

export interface AudioVacuumSpan {
  start: number;
  end: number;
  duckDb?: number;
}

export function mixMusicBed(voicePath: string, outputPath: string, options: {
  track?: MusicTrack;
  tracks?: MusicTrack[];
  duration: number;
  ffmpeg?: string;
  gapLu?: number;
  sfxEvents?: MixSfxEvent[];
  vacuums?: AudioVacuumSpan[];
}): { id: string; title: string; artist: string; license: string; sourceUrl: string; tracks: Array<Pick<MusicTrack, "id" | "title" | "artist" | "license" | "sourceUrl">>; sfx: Array<{ preset?: SfxPresetId; filePath?: string; at: number; sha256?: string; license?: string }>; vacuums: AudioVacuumSpan[]; gapLu: number; targetLufs: number; targetTruePeakDbtp: number; measuredLufs: number; measuredTruePeakDbtp: number; listeningReview: string };
