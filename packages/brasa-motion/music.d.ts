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
export function mixMusicBed(voicePath: string, outputPath: string, options: {
  track: MusicTrack;
  duration: number;
  ffmpeg?: string;
  gapLu?: number;
}): { id: string; title: string; artist: string; license: string; sourceUrl: string; gapLu: number; targetLufs: number; targetTruePeakDbtp: number; listeningReview: string };
