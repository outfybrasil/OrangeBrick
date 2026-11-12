export type Mp4Sample = { data: Uint8Array; key: boolean };

const encoder = new TextEncoder();
const MATRIX = [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000];

function u8(value: number) { return Uint8Array.of(value & 0xff); }
function u16(value: number) { return Uint8Array.of((value >>> 8) & 0xff, value & 0xff); }
function u32(value: number) { return Uint8Array.of((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff); }
function zeros(length: number) { return new Uint8Array(length); }
function ascii(value: string) { return encoder.encode(value); }

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function box(type: string, ...parts: Uint8Array[]) {
  const body = concat(parts);
  return concat([u32(body.length + 8), ascii(type), body]);
}

function fullBox(type: string, version: number, flags: number, ...parts: Uint8Array[]) {
  return box(type, u8(version), u8(flags >>> 16), u8(flags >>> 8), u8(flags), ...parts);
}

function matrix() { return concat(MATRIX.map(u32)); }

export function muxH264Mp4(options: { width: number; height: number; fps: number; description: Uint8Array; samples: Mp4Sample[] }) {
  const { width, height, fps, description, samples } = options;
  if (!samples.length || !samples[0].key) throw new Error("O vídeo precisa começar por um quadro-chave.");
  const timescale = fps * 1000;
  const duration = samples.length * 1000;
  const milliseconds = Math.round(samples.length * 1000 / fps);
  const ftyp = box("ftyp", ascii("isom"), u32(0x200), ascii("isom"), ascii("iso2"), ascii("avc1"), ascii("mp41"));
  const moov = (chunkOffset: number) => box("moov",
    fullBox("mvhd", 0, 0, u32(0), u32(0), u32(1000), u32(milliseconds), u32(0x00010000), u16(0x0100), zeros(10), matrix(), zeros(24), u32(2)),
    box("trak",
      fullBox("tkhd", 0, 3, u32(0), u32(0), u32(1), zeros(4), u32(milliseconds), zeros(8), u16(0), u16(0), u16(0), zeros(2), matrix(), u32(width << 16), u32(height << 16)),
      box("mdia",
        fullBox("mdhd", 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u16(0x55c4), u16(0)),
        fullBox("hdlr", 0, 0, u32(0), ascii("vide"), zeros(12), ascii("VideoHandler"), zeros(1)),
        box("minf",
          fullBox("vmhd", 0, 1, zeros(8)),
          box("dinf", fullBox("dref", 0, 0, u32(1), fullBox("url ", 0, 1))),
          box("stbl",
            fullBox("stsd", 0, 0, u32(1), box("avc1", zeros(6), u16(1), zeros(16), u16(width), u16(height), u32(0x00480000), u32(0x00480000), zeros(4), u16(1), zeros(32), u16(0x18), u16(0xffff),
              box("avcC", description))),
            fullBox("stts", 0, 0, u32(1), u32(samples.length), u32(1000)),
            fullBox("stss", 0, 0, u32(samples.filter(sample => sample.key).length), ...samples.flatMap((sample, index) => sample.key ? [u32(index + 1)] : [])),
            fullBox("stsc", 0, 0, u32(1), u32(1), u32(samples.length), u32(1)),
            fullBox("stsz", 0, 0, u32(0), u32(samples.length), ...samples.map(sample => u32(sample.data.length))),
            fullBox("stco", 0, 0, u32(1), u32(chunkOffset)))))));
  const header = ftyp.length + moov(0).length + 8;
  const data = concat(samples.map(sample => sample.data));
  return concat([ftyp, moov(header), u32(data.length + 8), ascii("mdat"), data]);
}

export function readMp4Boxes(bytes: Uint8Array, start = 0, end = bytes.length) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxes: Array<{ type: string; start: number; size: number }> = [];
  for (let offset = start; offset + 8 <= end;) {
    const size = view.getUint32(offset);
    if (size < 8 || offset + size > end) break;
    boxes.push({ type: String.fromCharCode(...bytes.subarray(offset + 4, offset + 8)), start: offset, size });
    offset += size;
  }
  return boxes;
}

export function isFaststartH264Mp4(bytes: Uint8Array) {
  const top = readMp4Boxes(bytes);
  const types = top.map(item => item.type);
  if (types[0] !== "ftyp" || types.indexOf("moov") < 0 || types.indexOf("mdat") < types.indexOf("moov")) return false;
  if (top.reduce((sum, item) => sum + item.size, 0) !== bytes.length) return false;
  const moov = top[types.indexOf("moov")];
  const inside = new TextDecoder("latin1").decode(bytes.subarray(moov.start, moov.start + moov.size));
  return inside.includes("avc1") && inside.includes("avcC") && inside.includes("vide");
}
