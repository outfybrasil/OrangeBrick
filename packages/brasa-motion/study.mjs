import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function studyVideo(videoPath, options = {}) {
  fs.accessSync(videoPath);
  const ffmpeg = options.ffmpeg || process.env.FFMPEG_PATH || 'ffmpeg';
  const ffprobe = options.ffprobe || process.env.FFPROBE_PATH || 'ffprobe';
  const sceneThreshold = options.sceneThreshold ?? 0.28;
  const silenceNoiseDb = options.silenceNoiseDb ?? -38;
  const silenceMinDuration = options.silenceMinDuration ?? 0.6;

  // 1. Probe metadata
  const probe = spawnSync(
    ffprobe,
    ['-v', 'error', '-show_entries', 'format=duration,bit_rate,size:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', videoPath],
    { encoding: 'utf8', timeout: 60000 },
  );
  if (probe.error || probe.status !== 0) {
    throw new Error(`Falha ao inspecionar vídeo: ${probe.error?.message || probe.stderr.slice(-400)}`);
  }
  const meta = JSON.parse(probe.stdout);
  const duration = Number(meta.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Vídeo sem duração válida.');
  }
  const vStream = (meta.streams || []).find((s) => s.codec_type === 'video');
  const aStream = (meta.streams || []).find((s) => s.codec_type === 'audio');
  const [fpsNum, fpsDen] = String(vStream?.r_frame_rate || '30/1').split('/').map(Number);
  const fps = fpsDen ? fpsNum / fpsDen : fpsNum || 30;

  // 2. Scene cuts detection
  const cutsRun = spawnSync(
    ffmpeg,
    ['-hide_banner', '-i', videoPath, '-vf', `select='gt(scene,${sceneThreshold})',showinfo`, '-f', 'null', '-'],
    { encoding: 'utf8', timeout: Math.ceil(Math.max(60000, duration * 4000)) },
  );
  const cutTimes = [];
  for (const match of (cutsRun.stderr || '').matchAll(/pts_time:([\d.]+)/g)) {
    const t = Number(match[1]);
    if (Number.isFinite(t) && t > 0.05 && t < duration - 0.05) {
      if (!cutTimes.length || t - cutTimes.at(-1) >= 0.25) cutTimes.push(t);
    }
  }
  const boundaries = [0, ...cutTimes, duration];
  const shotLengths = boundaries.slice(1).map((end, idx) => end - boundaries[idx]);
  const sortedShots = [...shotLengths].sort((a, b) => a - b);
  const medianShot = sortedShots.length ? sortedShots[Math.floor(sortedShots.length / 2)] : duration;
  const longestShot = shotLengths.length ? Math.max(...shotLengths) : duration;

  // 3. Audio loudness + silences (if audio stream exists)
  let integratedLufs = null;
  let truePeakDbtp = null;
  let loudnessRangeLu = null;
  let silences = [];
  if (aStream) {
    const audioRun = spawnSync(
      ffmpeg,
      [
        '-hide_banner',
        '-i',
        videoPath,
        '-af',
        `silencedetect=n=${silenceNoiseDb}dB:d=${silenceMinDuration},ebur128=peak=true`,
        '-f',
        'null',
        '-',
      ],
      { encoding: 'utf8', timeout: Math.ceil(Math.max(60000, duration * 3000)) },
    );
    const stderr = audioRun.stderr || '';
    const summaryIdx = stderr.lastIndexOf('Summary:');
    const summary = summaryIdx >= 0 ? stderr.slice(summaryIdx) : stderr;
    const iMatch = summary.match(/I:\s+(-?[\d.]+)\s+LUFS/);
    const pMatch = summary.match(/Peak:\s+(-?[\d.]+)\s+dBFS/);
    const lraMatch = summary.match(/LRA:\s+(-?[\d.]+)\s+LU/);
    integratedLufs = iMatch ? Number(iMatch[1]) : null;
    truePeakDbtp = pMatch ? Number(pMatch[1]) : null;
    loudnessRangeLu = lraMatch ? Number(lraMatch[1]) : null;

    let currentStart = null;
    for (const line of stderr.split('\n')) {
      const s = line.match(/silence_start:\s*([\d.]+)/);
      if (s) currentStart = Number(s[1]);
      const e = line.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);
      if (e) {
        const end = Number(e[1]);
        const dur = Number(e[2]);
        silences.push({ start: round(currentStart ?? Math.max(0, end - dur)), end: round(end), duration: round(dur) });
        currentStart = null;
      }
    }
  }

  const silenceSeconds = silences.reduce((acc, s) => acc + (s.duration || 0), 0);
  const longestSilence = silences.length ? Math.max(...silences.map((s) => s.duration || 0)) : 0;

  return {
    file: videoPath,
    durationSeconds: round(duration),
    width: vStream?.width ?? null,
    height: vStream?.height ?? null,
    fps: round(fps),
    bitrateKbps: meta.format?.bit_rate ? Math.round(Number(meta.format.bit_rate) / 1000) : null,
    cuts: {
      count: cutTimes.length,
      cutsPer10s: round((cutTimes.length / duration) * 10),
      firstCutSeconds: cutTimes.length ? round(cutTimes[0]) : null,
      medianShotSeconds: round(medianShot),
      longestStaticShotSeconds: round(longestShot),
      timestamps: cutTimes.map((t) => round(t)),
    },
    audio: {
      hasAudio: Boolean(aStream),
      integratedLufs: round(integratedLufs),
      truePeakDbtp: round(truePeakDbtp),
      loudnessRangeLu: round(loudnessRangeLu),
      silenceCount: silences.length,
      silenceSeconds: round(silenceSeconds),
      silenceShare: round(silenceSeconds / duration, 3),
      longestSilenceSeconds: round(longestSilence),
      silences,
    },
  };
}

export function compareStudy(reference, candidate) {
  const warnings = [];
  const cutsDelta =
    reference.cuts.cutsPer10s != null && candidate.cuts.cutsPer10s != null
      ? round(candidate.cuts.cutsPer10s - reference.cuts.cutsPer10s)
      : null;
  const lufsDelta =
    reference.audio.integratedLufs != null && candidate.audio.integratedLufs != null
      ? round(candidate.audio.integratedLufs - reference.audio.integratedLufs)
      : null;
  const silenceShareDelta =
    reference.audio.silenceShare != null && candidate.audio.silenceShare != null
      ? round(candidate.audio.silenceShare - reference.audio.silenceShare, 3)
      : null;

  if (candidate.audio.integratedLufs != null && (candidate.audio.integratedLufs < -17 || candidate.audio.integratedLufs > -12.5)) {
    warnings.push(`Loudness fora da faixa ideal (-17 a -12.5 LUFS): ${candidate.audio.integratedLufs} LUFS.`);
  }
  if (candidate.audio.truePeakDbtp != null && candidate.audio.truePeakDbtp > -0.8) {
    warnings.push(`True peak alto (risco de clipping): ${candidate.audio.truePeakDbtp} dBTP.`);
  }
  if (candidate.audio.longestSilenceSeconds != null && candidate.audio.longestSilenceSeconds > 2.2) {
    warnings.push(`Silêncio longo detectado (${candidate.audio.longestSilenceSeconds}s).`);
  }
  if (cutsDelta != null && cutsDelta < -1.2) {
    warnings.push(`Ritmo visual mais lento que a referência (${candidate.cuts.cutsPer10s} vs ${reference.cuts.cutsPer10s} cortes/10s).`);
  }

  return {
    referenceFile: reference.file,
    candidateFile: candidate.file,
    deltas: {
      cutsPer10s: cutsDelta,
      integratedLufs: lufsDelta,
      silenceShare: silenceShareDelta,
    },
    warnings,
    passed: warnings.length === 0,
  };
}
