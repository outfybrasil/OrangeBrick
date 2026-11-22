import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 48000;
const CHANNELS = 2;

const PRESETS = {
  whoosh: {
    id: 'whoosh',
    description: 'Transição aérea suave com varredura filtrada para cortes de cena e cards.',
    defaultDuration: 0.34,
    defaultGainDb: -10,
  },
  pop: {
    id: 'pop',
    description: 'Estalo limpo e curto para entrada de legenda, selo ou destaque visual.',
    defaultDuration: 0.11,
    defaultGainDb: -9,
  },
  impact: {
    id: 'impact',
    description: 'Sub-grave seco de impacto para gancho inicial, revelação ou virada.',
    defaultDuration: 0.45,
    defaultGainDb: -7,
  },
  click: {
    id: 'click',
    description: 'Clique mecânico discreto para interface, lista ou troca de métrica.',
    defaultDuration: 0.06,
    defaultGainDb: -11,
  },
  riser: {
    id: 'riser',
    description: 'Crescente curto de tensão antes de um corte ou revelação.',
    defaultDuration: 0.75,
    defaultGainDb: -12,
  },
  chime: {
    id: 'chime',
    description: 'Nota cristalina curta para conclusão, confirmação ou dado positivo.',
    defaultDuration: 0.42,
    defaultGainDb: -12,
  },
  tick: {
    id: 'tick',
    description: 'Pulso de relógio/contador para timelines e números subindo.',
    defaultDuration: 0.045,
    defaultGainDb: -13,
  },
  glitch: {
    id: 'glitch',
    description: 'Micro-ruído digital controlado para cortes rápidos e erros/alertas.',
    defaultDuration: 0.16,
    defaultGainDb: -11,
  },
};

export const SFX_PRESETS = Object.freeze(Object.keys(PRESETS));

export function listSfxPresets() {
  return Object.values(PRESETS).map((item) => ({ ...item }));
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dbToLinear(db) {
  return 10 ** (db / 20);
}

function synthesizeSamples(presetId, duration, seed) {
  const totalFrames = Math.max(1, Math.round(duration * SAMPLE_RATE));
  const left = new Float32Array(totalFrames);
  const right = new Float32Array(totalFrames);
  const rand = mulberry32(seed);
  let lpL = 0;
  let lpR = 0;
  let phase = 0;

  for (let i = 0; i < totalFrames; i++) {
    const t = i / SAMPLE_RATE;
    const u = i / totalFrames;
    let sL = 0;
    let sR = 0;

    if (presetId === 'whoosh') {
      const env = Math.sin(Math.PI * Math.pow(u, 0.85));
      const cutoff = 0.015 + 0.24 * Math.sin(Math.PI * u);
      const nL = rand() * 2 - 1;
      const nR = rand() * 2 - 1;
      lpL += cutoff * (nL - lpL);
      lpR += cutoff * (nR - lpR);
      const pan = 0.35 + 0.3 * u;
      sL = lpL * env * (1.15 - pan * 0.4);
      sR = lpR * env * (0.75 + pan * 0.4);
    } else if (presetId === 'pop') {
      const env = Math.exp(-t * 42) * Math.min(1, t / 0.004);
      const freq = 520 - 340 * Math.pow(u, 0.65);
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const tone = Math.sin(phase) * env;
      sL = tone;
      sR = tone;
    } else if (presetId === 'impact') {
      const env = Math.exp(-t * 7.8) * Math.min(1, t / 0.005);
      const freq = 140 * Math.exp(-t * 10) + 42;
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const sub = Math.sin(phase) * env;
      const punch = (rand() * 2 - 1) * Math.exp(-t * 55) * 0.38;
      sL = Math.tanh((sub + punch) * 1.45);
      sR = Math.tanh((sub + punch * 0.92) * 1.45);
    } else if (presetId === 'click') {
      const env = Math.exp(-t * 110) * Math.min(1, t / 0.0015);
      const body = Math.sin(2 * Math.PI * 1850 * t) * 0.55 + Math.sin(2 * Math.PI * 3600 * t) * 0.3;
      const transient = (rand() * 2 - 1) * Math.exp(-t * 220) * 0.45;
      sL = (body + transient) * env;
      sR = sL;
    } else if (presetId === 'riser') {
      const env = Math.pow(u, 1.8) * Math.min(1, (1 - u) / 0.06);
      const freq = 180 + 760 * Math.pow(u, 2.1);
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const n = rand() * 2 - 1;
      lpL += (0.02 + 0.25 * u) * (n - lpL);
      const sig = (Math.sin(phase) * 0.45 + lpL * 0.7) * env;
      sL = sig * (1 - 0.15 * u);
      sR = sig * (0.85 + 0.15 * u);
    } else if (presetId === 'chime') {
      const env = Math.exp(-t * 6.5) * Math.min(1, t / 0.008);
      const f1 = Math.sin(2 * Math.PI * 880 * t);
      const f2 = Math.sin(2 * Math.PI * 1318.5 * t) * 0.55;
      const f3 = Math.sin(2 * Math.PI * 1760 * t) * 0.25;
      sL = (f1 + f2 + f3) * 0.5 * env;
      sR = (f1 + f2 * 0.95 + f3 * 1.05) * 0.5 * env;
    } else if (presetId === 'tick') {
      const env = Math.exp(-t * 145) * Math.min(1, t / 0.001);
      const tone = Math.sin(2 * Math.PI * 2400 * t) * 0.7 + (rand() * 2 - 1) * 0.3;
      sL = tone * env;
      sR = sL;
    } else if (presetId === 'glitch') {
      const gate = Math.floor(u * 10) % 2 === 0 ? 1 : 0.25;
      const env = gate * Math.sin(Math.PI * u);
      const stepFreq = 260 + Math.floor(u * 8) * 190;
      const sq = Math.sin(2 * Math.PI * stepFreq * t) >= 0 ? 0.5 : -0.5;
      const nL = rand() * 2 - 1;
      const nR = rand() * 2 - 1;
      sL = (sq * 0.45 + nL * 0.55) * env;
      sR = (sq * 0.45 + nR * 0.55) * env;
    }

    left[i] = sL;
    right[i] = sR;
  }

  // Normalize peak to -1 dBFS before applying target gainDb
  let peak = 0;
  for (let i = 0; i < totalFrames; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const scale = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < totalFrames; i++) {
    left[i] *= scale;
    right[i] *= scale;
  }
  return { left, right, totalFrames };
}

function encodeStereoWav16(left, right, gainLinear) {
  const frames = left.length;
  const dataBytes = frames * CHANNELS * 2;
  const buf = Buffer.allocUnsafe(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(CHANNELS, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * CHANNELS * 2, 28);
  buf.writeUInt16LE(CHANNELS * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, left[i] * gainLinear));
    const r = Math.max(-1, Math.min(1, right[i] * gainLinear));
    buf.writeInt16LE(Math.round(l * 32767), offset);
    buf.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }
  return buf;
}

export function renderSfxWav(presetId, outputPath, options = {}) {
  const preset = PRESETS[presetId];
  if (!preset) {
    throw new Error(`Preset SFX desconhecido: ${presetId}. Disponíveis: ${SFX_PRESETS.join(', ')}`);
  }
  const duration = options.duration ?? preset.defaultDuration;
  const gainDb = options.gainDb ?? preset.defaultGainDb;
  const seed = Number.isFinite(Number(options.seed)) ? Math.trunc(Number(options.seed)) : 42;
  if (!Number.isFinite(duration) || duration < 0.02 || duration > 5) {
    throw new Error(`Duração inválida para SFX (${duration}s). Use entre 0.02s e 5s.`);
  }
  if (!Number.isFinite(gainDb) || gainDb < -40 || gainDb > 0) {
    throw new Error(`Ganho inválido para SFX (${gainDb} dB). Use entre -40 e 0 dB.`);
  }

  const { left, right } = synthesizeSamples(presetId, duration, seed);
  const wav = encodeStereoWav16(left, right, dbToLinear(gainDb));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, wav);
  const sha256 = crypto.createHash('sha256').update(wav).digest('hex');

  return {
    preset: presetId,
    filePath: outputPath,
    duration,
    gainDb,
    sampleRate: SAMPLE_RATE,
    channels: CHANNELS,
    sha256,
    synthetic: true,
    license: 'Procedural (Brasa Motion)',
  };
}
