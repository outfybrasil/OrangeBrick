import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function prepareMotionAssets(compositionDirectory, logoPath) {
  const target = path.join(compositionDirectory, 'assets', 'motion');
  await fs.mkdir(target, { recursive: true });
  await fs.copyFile(require.resolve('gsap/dist/gsap.min.js'), path.join(target, 'gsap.min.js'));
  for (const name of ['outfit-regular.ttf', 'outfit-semibold.ttf', 'outfit-extrabold.ttf', 'OFL.txt']) {
    await fs.copyFile(path.join(packageDirectory, 'assets', 'fonts', name), path.join(target, name));
  }
  if (logoPath) {
    const extension = path.extname(logoPath).toLowerCase();
    if (!['.png', '.webp', '.jpg', '.jpeg', '.svg'].includes(extension)) throw new Error('Formato de logo não suportado.');
    await fs.copyFile(logoPath, path.join(target, `brand${extension}`));
    return { logoSrc: `assets/motion/brand${extension}` };
  }
  return {};
}

function probeDuration(ffprobe, file) {
  const result = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'format=duration', '-of', 'json', file], { encoding: 'utf8', timeout: 60000 });
  if (result.error || result.status !== 0) throw new Error(`Vídeo ilegível: ${result.error?.message || result.stderr.slice(-400)}`);
  const duration = Number(JSON.parse(result.stdout).format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('O vídeo não informa uma duração válida.');
  return duration;
}

export function probeVideoDuration(file, options = {}) {
  return probeDuration(options.ffprobe || process.env.FFPROBE_PATH || 'ffprobe', file);
}

/**
 * Prepares a seek-accurate PCM audio mezzanine (-c:v copy -c:a pcm_s16le or audio-only WAV)
 * to eliminate 30-70ms AAC seek drift before multi-segment cuts (heditor v2.16 lesson).
 */
export async function prepareAudioMezzanine(sourcePath, outputPath, options = {}) {
  const ffmpeg = options.ffmpeg || process.env.FFMPEG_PATH || 'ffmpeg';
  const sampleRate = options.sampleRate ?? 48000;
  const audioOnly = Boolean(options.audioOnly);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const args = audioOnly
    ? ['-loglevel', 'error', '-y', '-i', sourcePath, '-vn', '-ar', String(sampleRate), '-ac', '2', '-c:a', 'pcm_s16le', outputPath]
    : ['-loglevel', 'error', '-y', '-i', sourcePath, '-c:v', 'copy', '-ar', String(sampleRate), '-ac', '2', '-c:a', 'pcm_s16le', outputPath];
  const result = spawnSync(ffmpeg, args, { encoding: 'utf8', timeout: options.timeoutMs ?? 180000 });
  if (result.error || result.status !== 0) {
    throw new Error(`Falha ao gerar mezzanine PCM: ${result.error?.message || result.stderr.slice(-800)}`);
  }
  return { outputPath, sampleRate, audioOnly, codec: 'pcm_s16le' };
}

export async function prepareMotionMedia(compositionDirectory, media, options = {}) {
  const ffmpeg = options.ffmpeg || process.env.FFMPEG_PATH || 'ffmpeg';
  const ffprobe = options.ffprobe || process.env.FFPROBE_PATH || 'ffprobe';
  const fps = options.fps ?? 30;
  const width = options.width ?? 1080;
  const prepared = [];
  for (const [index, item] of media.entries()) {
    if (item.type !== 'video') {
      prepared.push(item);
      continue;
    }
    const source = path.resolve(compositionDirectory, item.path);
    const available = probeDuration(ffprobe, source);
    const start = item.in ?? 0;
    const end = item.out ?? available;
    const speed = item.speed ?? 1;
    if (![start, end, speed].every(Number.isFinite) || start < 0 || end <= start || end > available + .001 || speed < .25 || speed > 4) throw new Error(`Trecho inválido para o vídeo ${index}: o arquivo tem ${available.toFixed(2)}s; confira início, fim e velocidade.`);
    const directory = path.join(compositionDirectory, 'assets', 'clips');
    await fs.mkdir(directory, { recursive: true });
    const clipPath = path.join(directory, `clip-${index}.mp4`);
    const posterPath = path.join(directory, `clip-${index}.jpg`);
    const run = (args) => {
      const result = spawnSync(ffmpeg, ['-loglevel', 'error', '-y', ...args], { encoding: 'utf8', timeout: Math.ceil(Math.max(60000, (end - start) * 30000)) });
      if (result.error || result.status !== 0) throw new Error(`Falha ao preparar o vídeo ${index}: ${result.error?.message || result.stderr.slice(-800)}`);
    };
    run(['-ss', String(start), '-to', String(end), '-i', source, '-an', '-vf', `setpts=PTS/${speed},fps=${fps},scale=${width}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-g', String(fps), '-movflags', '+faststart', clipPath]);
    run(['-i', clipPath, '-frames:v', '1', '-q:v', '2', posterPath]);
    const relative = path.posix.join('assets', 'clips', `clip-${index}`);
    prepared.push({ ...item, clip: { path: `${relative}.mp4`, duration: probeDuration(ffprobe, clipPath) }, poster: `${relative}.jpg` });
  }
  return prepared;
}

export async function inspectComposition(htmlPath, times, options = {}) {
  const { chromium } = options.chromium ? { chromium: options.chromium } : await import('playwright');
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: options.width ?? 1080, height: options.height ?? 1920 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(htmlPath).href);
    await page.waitForFunction(() => typeof window.__seek === 'function' && typeof window.__layoutIssues === 'function', null, { timeout: 30000 });
    const issues = new Set();
    for (const at of times) {
      const found = await page.evaluate(async (time) => { await window.__seek(time); return window.__layoutIssues(); }, at);
      for (const issue of found) issues.add(`${at.toFixed(2)}s · ${issue}`);
    }
    for (const error of errors) issues.add(`Erro na página: ${error}`);
    return [...issues];
  } finally {
    await browser.close();
  }
}
