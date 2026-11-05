import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const musicDirectory = fileURLToPath(new URL('./assets/music/', import.meta.url));

export function listMusicTracks(options = {}) {
  const catalog = JSON.parse(fs.readFileSync(path.join(musicDirectory, 'catalog.json'), 'utf8'));
  if (options.mood && !catalog.moods.includes(options.mood)) throw new Error(`Clima de música desconhecido: ${options.mood}`);
  if (options.intensity && !['low', 'medium', 'high'].includes(options.intensity)) throw new Error('Intensidade de música inválida.');
  return catalog.tracks.filter((track) => (!options.mood || track.moods.includes(options.mood)) && (!options.intensity || track.intensity === options.intensity) && (!options.minDuration || track.loopable || track.durationSeconds >= options.minDuration)).map((track) => ({ ...track, filePath: path.join(musicDirectory, track.file) }));
}

export function selectMusicTrack(options = {}) {
  const tracks = listMusicTracks(options);
  if (options.id) {
    const track = tracks.find((item) => item.id === options.id);
    if (!track) throw new Error(`Faixa indisponível para os critérios solicitados: ${options.id}`);
    return track;
  }
  const excluded = new Set(options.excludeIds || []);
  const fresh = tracks.filter((track) => !excluded.has(track.id));
  const candidates = fresh.length ? fresh : tracks;
  if (!candidates.length) throw new Error('Nenhuma música atende ao clima, intensidade e duração solicitados.');
  const seed = Number(options.seed ?? 0);
  if (!Number.isFinite(seed)) throw new Error('Seed de música inválida.');
  return candidates[Math.abs(Math.trunc(seed)) % candidates.length];
}

export function mixMusicBed(voicePath, outputPath, options) {
  const { track, duration, ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg', gapLu = 21.5 } = options;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(gapLu) || gapLu < 6 || gapLu > 40) throw new Error('Duração ou diferença de volume inválida para a mixagem.');
  if (!track.loopable && track.durationSeconds < duration) throw new Error('A faixa é mais curta que o vídeo. Escolha outra música.');
  fs.accessSync(voicePath); fs.accessSync(track.filePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporary = fs.mkdtempSync(path.join(path.dirname(outputPath), 'brasa-mix-'));
  const raw = path.join(temporary, 'mix.wav');
  const run = (args) => {
    const result = spawnSync(ffmpeg, args, { encoding: 'utf8', timeout: Math.max(30000, duration * 3000) });
    if (result.error || result.status !== 0) throw new Error(`Falha na mixagem: ${result.error?.message || result.stderr.slice(-1600)}`);
    return result;
  };
  try {
    const fade = Math.min(1.2, duration / 4);
    const filters = `[0:a]aresample=48000,highpass=f=75,loudnorm=I=-16:TP=-3:LRA=7,aresample=48000,apad,atrim=duration=${duration}[voice];` +
      `[1:a]aresample=48000,atrim=duration=${duration},asetpts=PTS-STARTPTS,loudnorm=I=${-16-gapLu}:TP=-8:LRA=7,aresample=48000,afade=t=in:d=${Math.min(.5, fade)},afade=t=out:st=${duration-fade}:d=${fade}[music];` +
      '[voice][music]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mix]';
    run(['-loglevel', 'error', '-y', '-i', voicePath, '-stream_loop', '-1', '-i', track.filePath, '-filter_complex', filters, '-map', '[mix]', '-t', String(duration), '-c:a', 'pcm_s24le', raw]);
    const measured = run(['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-2:LRA=7:print_format=json', '-f', 'null', '-']);
    const blocks = measured.stderr.match(/\{[^{}]+\}/g);
    if (!blocks?.length) throw new Error('Não foi possível medir a mixagem.');
    const values = JSON.parse(blocks.at(-1));
    if (!Number.isFinite(Number(values.input_i))) throw new Error('A mixagem não contém sinal de áudio mensurável.');
    const filter = `loudnorm=I=-14:TP=-2:LRA=7:measured_I=${values.input_i}:measured_TP=${values.input_tp}:measured_LRA=${values.input_lra}:measured_thresh=${values.input_thresh}:offset=${values.target_offset}:linear=true,aresample=48000`;
    run(['-loglevel', 'error', '-y', '-i', raw, '-af', filter, '-c:a', 'pcm_s24le', outputPath]);
    return { id: track.id, title: track.title, artist: track.artist, license: track.license, sourceUrl: track.sourceUrl, gapLu, targetLufs: -14, targetTruePeakDbtp: -2, listeningReview: 'pending' };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
