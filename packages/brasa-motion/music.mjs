import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { renderSfxWav } from './sfx.mjs';

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

const CROSSFADE_SECONDS = 3;

export function selectMusicPlaylist(options = {}) {
  const { duration } = options;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Informe a duração para montar a trilha.');
  const tracks = listMusicTracks({ mood: options.mood, intensity: options.intensity });
  if (!tracks.length) throw new Error('Nenhuma música atende ao clima e à intensidade solicitados.');
  const excluded = new Set(options.excludeIds || []);
  const ordered = [...tracks.filter((track) => !excluded.has(track.id)), ...tracks.filter((track) => excluded.has(track.id))];
  const seed = Math.abs(Math.trunc(Number(options.seed ?? 0))) % ordered.length;
  const rotation = [...ordered.slice(seed), ...ordered.slice(0, seed)];
  const playlist = [];
  let total = 0;
  for (let index = 0; total < duration; index++) {
    const track = rotation[index % rotation.length];
    if (playlist.at(-1)?.id === track.id && rotation.length > 1) continue;
    if (track.loopable && !playlist.length) return [track];
    playlist.push(track);
    total += track.durationSeconds - (playlist.length > 1 ? CROSSFADE_SECONDS : 0);
    if (playlist.length > 60) throw new Error('A trilha precisaria de faixas demais para esta duração.');
  }
  return playlist;
}

export function mixMusicBed(voicePath, outputPath, options) {
  const { duration, ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg', gapLu = 21.5 } = options;
  const tracks = options.tracks || [options.track];
  const track = tracks[0];
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(gapLu) || gapLu < 6 || gapLu > 40) throw new Error('Duração ou diferença de volume inválida para a mixagem.');
  if (!track) throw new Error('Escolha ao menos uma música.');
  const available = tracks.reduce((sum, item, index) => sum + item.durationSeconds - (index ? CROSSFADE_SECONDS : 0), 0);
  if (!(tracks.length === 1 && track.loopable) && available < duration) throw new Error('A trilha é mais curta que o vídeo. Escolha outra música ou monte uma sequência.');
  fs.accessSync(voicePath); tracks.forEach((item) => fs.accessSync(item.filePath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporary = fs.mkdtempSync(path.join(path.dirname(outputPath), 'brasa-mix-'));
  const raw = path.join(temporary, 'mix.wav');
  const run = (args) => {
    const result = spawnSync(ffmpeg, args, { encoding: 'utf8', timeout: Math.ceil(Math.max(30000, duration * 3000)) });
    if (result.error || result.status !== 0) throw new Error(`Falha na mixagem: ${result.error?.message || result.stderr.slice(-1600)}`);
    return result;
  };
  try {
    const fade = Math.min(1.2, duration / 4);
    const vacuums = Array.isArray(options.vacuums) ? options.vacuums.filter((v) => Number.isFinite(v?.start) && Number.isFinite(v?.end) && v.end > v.start) : [];
    const vacuumFilter = vacuums.length
      ? ',' + vacuums.map((v) => {
          const gain = Math.pow(10, (Number.isFinite(v.duckDb) ? v.duckDb : -22) / 20).toFixed(4);
          return `volume=${gain}:enable='between(t,${v.start.toFixed(3)},${v.end.toFixed(3)})'`;
        }).join(',')
      : '';

    const sfxInputEntries = [];
    const sfxMeta = [];
    const rawSfxEvents = Array.isArray(options.sfxEvents) ? options.sfxEvents : [];
    for (let i = 0; i < rawSfxEvents.length; i++) {
      const ev = rawSfxEvents[i];
      if (!Number.isFinite(ev?.at) || ev.at < 0 || ev.at >= duration) continue;
      let filePath = ev.filePath;
      let provenance = null;
      if (!filePath && ev.preset) {
        const wavPath = path.join(temporary, `sfx-${i}-${ev.preset}.wav`);
        provenance = renderSfxWav(ev.preset, wavPath, { duration: ev.duration, gainDb: ev.gainDb, seed: ev.seed ?? (42 + i) });
        filePath = wavPath;
      }
      if (!filePath) continue;
      fs.accessSync(filePath);
      sfxInputEntries.push({ filePath, at: ev.at, gainDb: ev.filePath && Number.isFinite(ev.gainDb) ? ev.gainDb : 0 });
      sfxMeta.push(provenance ? { preset: provenance.preset, at: ev.at, sha256: provenance.sha256, license: provenance.license } : { filePath, at: ev.at });
    }

    const sequence = tracks.length === 1 ? '[1:a]aresample=48000,aformat=channel_layouts=stereo[bed];'
      : tracks.map((_, index) => `[${index + 1}:a]aresample=48000,aformat=channel_layouts=stereo[t${index}];`).join('') +
        tracks.slice(1).map((_, index) => `[${index ? `x${index}` : 't0'}][t${index + 1}]acrossfade=d=${CROSSFADE_SECONDS}:c1=tri:c2=tri[${index === tracks.length - 2 ? 'bed' : `x${index + 1}`}];`).join('');
    const sfxBaseIndex = 1 + tracks.length;
    const sfxChains = sfxInputEntries.map((ev, idx) => {
      const delayMs = Math.max(0, Math.round(ev.at * 1000));
      const vol = ev.gainDb ? `,volume=${ev.gainDb}dB` : '';
      return `[${sfxBaseIndex + idx}:a]aresample=48000,aformat=channel_layouts=stereo${vol},adelay=${delayMs}|${delayMs},apad,atrim=duration=${duration}[sfx${idx}];`;
    }).join('');
    const mixInputs = ['[voice]', '[music]', ...sfxInputEntries.map((_, idx) => `[sfx${idx}]`)];
    const filters = `[0:a]aresample=48000,highpass=f=75,loudnorm=I=-16:TP=-3:LRA=7,aresample=48000,apad,atrim=duration=${duration}[voice];` + sequence +
      `[bed]atrim=duration=${duration},asetpts=PTS-STARTPTS,loudnorm=I=${-16-gapLu}:TP=-8:LRA=7,aresample=48000,afade=t=in:d=${Math.min(.5, fade)},afade=t=out:st=${duration-fade}:d=${fade}${vacuumFilter}[music];` +
      sfxChains +
      `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0:normalize=0[mix]`;
    const musicInputs = tracks.length === 1 ? ['-stream_loop', '-1', '-i', track.filePath] : tracks.flatMap((item) => ['-i', item.filePath]);
    const sfxInputs = sfxInputEntries.flatMap((ev) => ['-i', ev.filePath]);
    run(['-loglevel', 'error', '-y', '-i', voicePath, ...musicInputs, ...sfxInputs, '-filter_complex', filters, '-map', '[mix]', '-t', String(duration), '-c:a', 'pcm_s24le', raw]);
    const measured = run(['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-2:LRA=7:print_format=json', '-f', 'null', '-']);
    const blocks = measured.stderr.match(/\{[^{}]+\}/g);
    if (!blocks?.length) throw new Error('Não foi possível medir a mixagem.');
    const values = JSON.parse(blocks.at(-1));
    if (!Number.isFinite(Number(values.input_i))) throw new Error('A mixagem não contém sinal de áudio mensurável.');
    const filter = `loudnorm=I=-14:TP=-2:LRA=7:measured_I=${values.input_i}:measured_TP=${values.input_tp}:measured_LRA=${values.input_lra}:measured_thresh=${values.input_thresh}:offset=${values.target_offset}:linear=true,aresample=48000,asetpts=N/SR/TB,apad=whole_dur=${duration},atrim=end=${duration}`;
    run(['-loglevel', 'error', '-y', '-i', raw, '-af', filter, '-c:a', 'pcm_s24le', outputPath]);
    const final = run(['-hide_banner', '-i', outputPath, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
    const summary = final.slice(final.lastIndexOf('Summary:'));
    const measuredLufs = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
    const measuredTruePeakDbtp = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
    if (!Number.isFinite(measuredLufs) || !Number.isFinite(measuredTruePeakDbtp)) throw new Error('Não foi possível medir o áudio final.');
    if (Math.abs(measuredLufs + 14) > 1 || measuredTruePeakDbtp > -1) throw new Error(`Áudio final fora do alvo: ${measuredLufs} LUFS e ${measuredTruePeakDbtp} dBTP.`);
    return { id: tracks.map((item) => item.id).join('+'), title: tracks.map((item) => item.title).join(' → '), artist: [...new Set(tracks.map((item) => item.artist))].join(', '), license: [...new Set(tracks.map((item) => item.license))].join(', '), sourceUrl: tracks.map((item) => item.sourceUrl).join(' '), tracks: tracks.map(({ id, title, artist, license, sourceUrl }) => ({ id, title, artist, license, sourceUrl })), sfx: sfxMeta, vacuums, gapLu, targetLufs: -14, targetTruePeakDbtp: -2, measuredLufs, measuredTruePeakDbtp, listeningReview: 'pending' };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
