import { muxH264Mp4, type Mp4Sample } from "./mp4";

const FPS = 30;
const CODEC = "avc1.640028";

function config(width: number, height: number): VideoEncoderConfig {
  return { codec: CODEC, width, height, bitrate: 3_000_000, framerate: FPS, latencyMode: "realtime", avc: { format: "avc" } };
}

export async function socialVideoSupported(width: number, height: number) {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return false;
  try { return Boolean((await VideoEncoder.isConfigSupported(config(width, height))).supported); } catch { return false; }
}

export async function encodeSocialVideo(canvas: HTMLCanvasElement, seconds: number, draw: (t: number) => void): Promise<Blob> {
  const { width, height } = canvas;
  if (!(await socialVideoSupported(width, height))) throw new Error("Este navegador não gera vídeo H.264. Use o Chrome, o Edge ou o Safari atualizados.");
  const samples: Mp4Sample[] = [];
  let description: Uint8Array | null = null;
  let failure: unknown = null;
  let lastTimestamp = -1;
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => {
      if (metadata?.decoderConfig?.description && !description) {
        const value = metadata.decoderConfig.description;
        description = ArrayBuffer.isView(value) ? new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)) : new Uint8Array(value.slice(0));
      }
      if (chunk.timestamp <= lastTimestamp) failure = new Error("O codificador reordenou os quadros. Tente novamente em outro navegador.");
      lastTimestamp = chunk.timestamp;
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      samples.push({ data, key: chunk.type === "key" });
    },
    error: cause => { failure = cause; },
  });
  encoder.configure(config(width, height));
  const frames = Math.round(seconds * FPS);
  for (let index = 0; index < frames; index++) {
    draw(index / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round(index * 1_000_000 / FPS), duration: Math.round(1_000_000 / FPS) });
    encoder.encode(frame, { keyFrame: index % (FPS * 2) === 0 });
    frame.close();
    if (encoder.encodeQueueSize > 8) await new Promise(resolve => setTimeout(resolve, 0));
    if (failure) break;
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure instanceof Error ? failure : new Error("Não foi possível gerar o vídeo.");
  if (!description || samples.length !== frames) throw new Error("O vídeo não foi gerado por completo. Tente novamente.");
  return new Blob([muxH264Mp4({ width, height, fps: FPS, description, samples }) as BlobPart], { type: "video/mp4" });
}
