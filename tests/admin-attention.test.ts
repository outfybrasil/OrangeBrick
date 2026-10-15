import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminAttention, type AttentionPost } from "../src/lib/admin-attention.ts";

function post(id: string, published = false): AttentionPost {
  return { id, title: "Nintendo revela novos detalhes do Switch 2", summary: "Nintendo apresenta hardware e jogos do Nintendo Switch 2.", image_url: `https://playstation.com/${id}-cover.jpg`, image_alt: "Logo Nintendo Switch 2 com o console oficial", body: JSON.stringify([
    { id: "image-1", type: "image", url: `https://playstation.com/${id}-1.jpg`, alt: "Nintendo Switch 2 em outra vista", caption: "Vista oficial do Nintendo Switch 2." },
    { id: "image-2", type: "image", url: `https://playstation.com/${id}-2.jpg`, alt: "Nintendo Switch 2 tela ligada", caption: "O console Nintendo Switch 2 em uso." },
  ]), is_published: published, updated_at: "2026-10-15T16:00:00Z" };
}

test("resolved and outdated jobs do not reappear as current failures", () => {
  const item = post("draft");
  const reviews = [
    { id: "new", post_id: item.id, status: "completed", expected_updated_at: item.updated_at, report: null },
    { id: "old", post_id: item.id, status: "failed", expected_updated_at: item.updated_at, report: null },
  ];
  assert.deepEqual(buildAdminAttention([item], reviews, [{id:"new",post_id:item.id,status:"ready"},{id:"old",post_id:item.id,status:"failed"}], []), []);
  assert.deepEqual(buildAdminAttention([item], [{ ...reviews[1], expected_updated_at: "2026-10-14T16:00:00Z" }], [], []), []);
  assert.deepEqual(buildAdminAttention([{...item,is_published:true}], [reviews[1]], [], []), []);
});

test("published image failures, missing assets and unknown upload outcomes remain actionable", () => {
  const live = post("live", true);
  const draft = { ...post("draft"), image_url: null };
  const items = buildAdminAttention([draft, live], [], [], [{ id:"upload",post_id:live.id,status:"unknown" }], new Map([[live.id,["Capa: imagem não retornou HTTP 200."]]]));
  assert.equal(items[0].kind, "image");
  assert.equal(items[0].title, live.title);
  assert.equal(items[0].urgent, true);
  assert.equal(items.find(item=>item.id === "image:draft")?.urgent, false);
  assert.match(items.find(item=>item.kind === "publication")!.message, /antes de tentar novamente/);
  assert.equal(new Set(items.map(item=>item.id)).size, items.length);
});


test("AI changes saved by a completed review keep its remaining issues visible", () => {
  const item = post("draft");
  const job = { id:"review",post_id:item.id,status:"needs_review",expected_updated_at:"2026-10-15T15:00:00Z",finished_at:"2026-10-15T16:00:01Z",report:{remaining:["Conferir fonte oficial."]} };
  assert.match(buildAdminAttention([item],[job],[],[])[0].message,/Conferir fonte oficial/);
  assert.deepEqual(buildAdminAttention([{...item,updated_at:"2026-10-15T17:00:00Z"}],[job],[],[]),[]);
});
