import assert from "node:assert/strict";
import test from "node:test";
import { inspectPublicationImages, publicationImageAssets, publicationImageBlockers } from "../src/lib/server/manual-publication-images.ts";

function post(id = "post") {
  return { id, title: "Nintendo revela novos detalhes do Switch 2", summary: "Nintendo apresenta hardware e jogos do Nintendo Switch 2.", image_url: `https://playstation.com/${id}-cover.jpg`, image_alt: "Logo Nintendo Switch 2 com o console oficial", body: JSON.stringify([
    { id: "image-1", type: "image", url: `https://playstation.com/${id}-1.jpg`, alt: "Nintendo Switch 2 em outra vista", caption: "Vista oficial do Nintendo Switch 2." },
    { id: "image-2", type: "image", url: `https://playstation.com/${id}-2.jpg`, alt: "Nintendo Switch 2 tela ligada", caption: "O console Nintendo Switch 2 em uso." },
  ]) };
}
const probe = async (url: string) => ({ width: 1920, height: 1080, sha256: url });

test("image requirements do not block on text length or sources", async () => {
  const item = post();
  assert.deepEqual(publicationImageBlockers(item), []);
  const result = await inspectPublicationImages([item], [], [], probe);
  assert.deepEqual(result.get(item.id), []);
});

test("blocks missing, repeated, generic and unavailable images", async () => {
  assert(publicationImageBlockers({ ...post(), image_url: null }).some(error => error.includes("capa")));
  assert(publicationImageBlockers({ ...post(), body: "[]" }).some(error => error.includes("duas")));
  const item = post();
  const unavailable = await inspectPublicationImages([item], [], [], async () => { throw new Error("404"); });
  assert(unavailable.get(item.id)?.some(error => error.includes("HTTP 200")));
  const duplicate = await inspectPublicationImages([item], [], [], async () => ({ width: 1920, height: 1080, sha256: "same" }));
  assert(duplicate.get(item.id)?.some(error => error.includes("mesmo arquivo")));
  assert(publicationImageBlockers({ ...item, image_alt: "setup gamer genérico" }).some(error => error.includes("genérica")));
});

test("blocks low resolution, unverified origin and reuse in recent news", async () => {
  const item = post();
  const small = await inspectPublicationImages([item], [], [], async url => ({ width: 640, height: 360, sha256: url }));
  assert(small.get(item.id)?.some(error => error.includes("1200")));
  const unknown = { ...item, image_url: "https://unverified.invalid/cover.jpg" };
  const origin = await inspectPublicationImages([unknown], [], [], probe);
  assert(origin.get(item.id)?.some(error => error.includes("origem")));
  const older = { ...post("older"), image_url: item.image_url };
  const reused = await inspectPublicationImages([item], [], [older], probe);
  assert(reused.get(item.id)?.some(error => error.includes("recente")));
  const copied = { ...post("copy"), body: item.body };
  const batch = await inspectPublicationImages([item, copied], [], [], probe);
  assert(batch.get(copied.id)?.some(error => error.includes("lote")));
  assert.equal(publicationImageAssets(item).length, 3);
});
