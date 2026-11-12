import assert from "node:assert/strict";
import test from "node:test";
import { isFaststartH264Mp4, muxH264Mp4, readMp4Boxes } from "../src/lib/social/mp4.ts";
import { publishInstagramImages } from "../src/lib/social/instagram-graph.ts";
import { generateSocialDraft, validateSocialDraft, type SocialSourcePost } from "../src/lib/social/post-plan.ts";

const description = Uint8Array.of(1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 4, 0x67, 0x64, 0, 0x28, 1, 0, 4, 0x68, 0xee, 0x3c, 0x80);
const samples = Array.from({ length: 90 }, (_, index) => ({ data: Uint8Array.of(0, 0, 0, 2, index % 60 === 0 ? 0x65 : 0x41, index), key: index % 60 === 0 }));

function source(): SocialSourcePost {
  return { id: "00000000-0000-4000-8000-000000000001", slug: "gta-vi", title: "Rockstar divulga novas imagens de GTA VI", summary: "As capturas mostram Leonida.", image_url: "https://official.test/cover.jpg", image_alt: "Jason e Lucia em cena oficial.", updated_at: "2026-11-05T12:00:00Z", information_status: "confirmed", body: JSON.stringify([{ id: "t", type: "text", content: "A Rockstar mostrou novas regiões de Leonida." }, { id: "i", type: "image", url: "https://official.test/1.jpg", alt: "Vice City em imagem oficial.", caption: "Vice City. Crédito: Rockstar Games." }]) };
}

test("o MP4 da capa sai com moov antes dos dados, amostras e quadros-chave corretos", () => {
  const bytes = muxH264Mp4({ width: 1080, height: 1350, fps: 30, description, samples });
  const top = readMp4Boxes(bytes);
  assert.deepEqual(top.map(item => item.type), ["ftyp", "moov", "mdat"]);
  assert.ok(isFaststartH264Mp4(bytes));
  const text = new TextDecoder("latin1").decode(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  const stsz = text.indexOf("stsz");
  assert.equal(view.getUint32(stsz + 12), samples.length);
  const stss = text.indexOf("stss");
  assert.equal(view.getUint32(stss + 8), 2);
  assert.deepEqual([view.getUint32(stss + 12), view.getUint32(stss + 16)], [1, 61]);
  const stco = text.indexOf("stco");
  const mdat = top[2];
  assert.equal(view.getUint32(stco + 12), mdat.start + 8);
  assert.deepEqual([...bytes.subarray(mdat.start + 8, mdat.start + 14)], [...samples[0].data]);
  const mdhd = text.indexOf("mdhd");
  assert.equal(view.getUint32(mdhd + 16), 30_000);
  assert.equal(view.getUint32(mdhd + 20), 90_000);
});

test("o vídeo precisa começar por quadro-chave e arquivos estranhos são recusados", () => {
  assert.throws(() => muxH264Mp4({ width: 1080, height: 1350, fps: 30, description, samples: [{ data: Uint8Array.of(1), key: false }] }), /quadro-chave/);
  assert.equal(isFaststartH264Mp4(new TextEncoder().encode("não é vídeo")), false);
  const bytes = muxH264Mp4({ width: 1080, height: 1350, fps: 30, description, samples });
  assert.equal(isFaststartH264Mp4(bytes.subarray(0, bytes.length - 3)), false);
});

test("a capa animada só vale para carrossel e sobrevive à validação", () => {
  const carousel = { ...generateSocialDraft(source(), "carousel"), coverMotion: true };
  assert.equal(validateSocialDraft(carousel, source()).coverMotion, true);
  assert.equal("coverMotion" in validateSocialDraft({ ...carousel, coverMotion: false }, source()), false);
  const single = { ...generateSocialDraft(source(), "single"), coverMotion: true };
  assert.equal("coverMotion" in validateSocialDraft(single, source()), false);
  assert.throws(() => validateSocialDraft({ ...carousel, coverMotion: "sim" as unknown as boolean }, source()), /capa animada/);
});

test("a capa em vídeo vira item VIDEO do carrossel, sem texto alternativo de imagem", async () => {
  const created: Array<Record<string, string>> = [];
  await publishInstagramImages({
    account: { id: "123", username: "orangebrick" }, caption: "Legenda",
    images: [{ url: "https://storage.test/01.mp4", alt: "Capa", video: true }, { url: "https://storage.test/02.jpg", alt: "Segunda" }],
    beforePublish: async () => {}, pause: async () => {},
    call: async (endpoint, _method, body) => {
      if (endpoint.endsWith("/media") && body) { created.push(body); return { id: `c${created.length}` }; }
      if (endpoint.includes("media_publish")) return { id: "media" };
      return { status_code: "FINISHED" };
    },
  });
  assert.deepEqual(created[0], { media_type: "VIDEO", video_url: "https://storage.test/01.mp4", is_carousel_item: "true" });
  assert.equal(created[1].image_url, "https://storage.test/02.jpg");
  assert.equal(created[2].media_type, "CAROUSEL");
  await assert.rejects(publishInstagramImages({ account: { id: "123", username: "orangebrick" }, caption: "Legenda", images: [{ url: "https://storage.test/01.mp4", alt: "Capa", video: true }], beforePublish: async () => {}, call: async () => ({}) }), /dentro de um carrossel/);
});

test("o processamento do vídeo pode levar mais de 30 segundos antes do tempo limite", async () => {
  let checks = 0;
  await publishInstagramImages({
    account: { id: "123", username: "orangebrick" }, caption: "Legenda",
    images: [{ url: "https://storage.test/01.mp4", alt: "Capa", video: true }, { url: "https://storage.test/02.jpg", alt: "Segunda" }],
    beforePublish: async () => {}, pause: async () => {},
    call: async (endpoint, _method, body) => {
      if (endpoint.endsWith("/media") && body) return { id: body.media_type === "VIDEO" ? "video" : body.media_type === "CAROUSEL" ? "parent" : "image" };
      if (endpoint.includes("media_publish")) return { id: "media" };
      if (endpoint.startsWith("video")) return { status_code: ++checks < 25 ? "IN_PROGRESS" : "FINISHED" };
      return { status_code: "FINISHED" };
    },
  });
  assert.equal(checks, 25);
});
