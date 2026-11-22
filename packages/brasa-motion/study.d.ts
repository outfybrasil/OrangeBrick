export interface SilenceSpan {
  start: number | null;
  end: number | null;
  duration: number | null;
}

export interface VideoStudyReport {
  file: string;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  bitrateKbps: number | null;
  cuts: {
    count: number;
    cutsPer10s: number | null;
    firstCutSeconds: number | null;
    medianShotSeconds: number | null;
    longestStaticShotSeconds: number | null;
    timestamps: Array<number | null>;
  };
  audio: {
    hasAudio: boolean;
    integratedLufs: number | null;
    truePeakDbtp: number | null;
    loudnessRangeLu: number | null;
    silenceCount: number;
    silenceSeconds: number | null;
    silenceShare: number | null;
    longestSilenceSeconds: number | null;
    silences: SilenceSpan[];
  };
}

export interface StudyComparison {
  referenceFile: string;
  candidateFile: string;
  deltas: {
    cutsPer10s: number | null;
    integratedLufs: number | null;
    silenceShare: number | null;
  };
  warnings: string[];
  passed: boolean;
}

export function studyVideo(
  videoPath: string,
  options?: {
    ffmpeg?: string;
    ffprobe?: string;
    sceneThreshold?: number;
    silenceNoiseDb?: number;
    silenceMinDuration?: number;
  },
): VideoStudyReport;

export function compareStudy(reference: VideoStudyReport, candidate: VideoStudyReport): StudyComparison;
