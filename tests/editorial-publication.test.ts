import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedDraftResult } from "../src/lib/ai/gemini-news.ts";
import { editorialPublicationBlockers } from "../src/lib/server/editorial-publication.ts";
import { independentEditorialPublisherCount } from "../src/lib/content-validation.ts";

function validDraft(): GeneratedDraftResult {
  const source = { name: "Nintendo", url: "https://www.nintendo.com/news/console-announcement", is_official: true, source_verified: true };
  const text = `${"contexto jornalístico confirmado ".repeat(250)}\n\n**Fonte:** [Nintendo](${source.url})`;
  return {
    post: {
      id: "post-1",
      slug: "anuncio-nintendo",
      title: "NINTENDO CONFIRMA NOVO ANÚNCIO",
      summary: "A Nintendo confirmou um novo anúncio e detalhou o impacto da decisão para jogadores e para o mercado de games.",
      body: JSON.stringify([
        { id: "intro", type: "text", content: "A Nintendo confirmou um novo anúncio para o público." },
        { id: "image-1", type: "image", url: "https://assets.nintendo.com/news/story-1-console-announcement.jpg", alt: "Cena oficial relacionada ao anúncio da Nintendo.", caption: "Imagem oficial relacionada ao anúncio." },
        { id: "development", type: "text", content: text },
        { id: "image-2", type: "image", url: "https://assets.nintendo.com/news/story-2-console-announcement.jpg", alt: "Outro ângulo oficial do anúncio da Nintendo.", caption: "Segundo material oficial do anúncio." },
        { id: "source", type: "text", content: `**Fonte:** [Nintendo](${source.url})` },
      ]),
      category: "breaking",
      image_url: "https://assets.nintendo.com/news/cover-console-announcement.jpg",
      image_alt: "Arte oficial que identifica o anúncio da Nintendo.",
      author_name: "Orange Brick",
      author_tag: "Plantão",
      is_published: false,
      published_at: null,
      created_at: "2026-09-25T12:00:00.000Z",
      updated_at: "2026-09-25T12:00:00.000Z",
      topic_id: null,
      information_status: "confirmed",
      featured_quote: { absence_registered: true },
      editorial_sources: [source],
      short_article_reason: null,
      correction_note: null,
    },
    wordCount: 750,
    sources: [source],
    groundingSources: [],
    verifiedImages: ["cover", "story-1", "story-2"].map((name, index) => ({
      url: `https://assets.nintendo.com/news/${name}-console-announcement.jpg`,
      sourceUrl: source.url,
      sha256: String(index + 1).repeat(64),
      alt: "Imagem do assunto confirmado pela análise visual.",
      caption: "Material do assunto que contextualiza o anúncio.",
    })),
  };
}

function setSources(draft: GeneratedDraftResult, sources: GeneratedDraftResult["sources"]) {
  draft.sources = sources;
  draft.post.editorial_sources = sources;
  const blocks = JSON.parse(draft.post.body) as Array<{ type: string; content?: string }>;
  const finalTextBlock = [...blocks].reverse().find((block) => block.type === "text");
  const firstSource = sources[0];
  if (finalTextBlock && firstSource) finalTextBlock.content = `${"contexto jornalístico confirmado ".repeat(250)}\n\n**Fonte:** [${firstSource.name}](${firstSource.url})`;
  draft.post.body = JSON.stringify(blocks);
}

test("automatic publication requires visual evidence for every image", () => {
  const draft = validDraft();
  assert.deepEqual(editorialPublicationBlockers(draft), []);
  draft.verifiedImages = [];
  assert.ok(editorialPublicationBlockers(draft).some((blocker) => blocker.includes("correspondência visual")));
});

test("image evidence cannot approve another URL or repeated image bytes", () => {
  const draft = validDraft();
  draft.verifiedImages![1].sha256 = draft.verifiedImages![0].sha256;
  assert.ok(editorialPublicationBlockers(draft).some((blocker) => blocker.includes("correspondência visual")));
  const another = validDraft();
  another.verifiedImages![0].url = "https://assets.nintendo.com/unrelated.jpg";
  assert.ok(editorialPublicationBlockers(another).some((blocker) => blocker.includes("correspondência visual")));
});

test("subdomains of one publisher count as a single source", () => {
  const sources = [
    { name: "IGN Brasil", url: "https://br.ign.com/noticias/console-announcement", source_verified: true },
    { name: "IGN", url: "https://www.ign.com/news/console-announcement", source_verified: true },
    { name: "IGN Mobile", url: "https://m.ign.com/news/console-announcement", source_verified: true },
  ];
  const draft = validDraft();
  setSources(draft, sources);

  assert.equal(independentEditorialPublisherCount(sources), 1);
  assert.ok(editorialPublicationBlockers(draft).some((blocker) => blocker.startsWith("Menos de três editoras")));
});

test("distinct recognized publishers satisfy the source cross-check with verified images", () => {
  const sources = [
    { name: "Gematsu", url: "https://www.gematsu.com/news/console-announcement", source_verified: true },
    { name: "IGN", url: "https://www.ign.com/news/console-announcement", source_verified: true },
    { name: "VGC", url: "https://www.videogameschronicle.com/news/console-announcement", source_verified: true },
  ];
  const draft = validDraft();
  setSources(draft, sources);
  const blockers = editorialPublicationBlockers(draft);

  assert.equal(independentEditorialPublisherCount(sources), 3);
  assert.ok(!blockers.some((blocker) => blocker.startsWith("Menos de três editoras")));
  assert.deepEqual(blockers, []);
});

test("blocks malformed word count, repeated body images and missing source evidence", () => {
  const draft = validDraft();
  draft.wordCount = 749;
  draft.sources = [];
  draft.post.editorial_sources = [];
  draft.post.body = JSON.stringify([
    { id: "intro", type: "text", content: "Introdução." },
    { id: "image-1", type: "image", url: draft.post.image_url, alt: "Capa repetida no corpo.", caption: "Imagem repetida." },
    { id: "image-2", type: "image", url: draft.post.image_url, alt: "Capa repetida novamente.", caption: "Outra imagem repetida." },
    { id: "source", type: "text", content: "**Fonte:** [Fonte](https://example.com/news)" },
  ]);

  const blockers = editorialPublicationBlockers(draft);

  assert.ok(blockers.some((blocker) => blocker.includes("750 a 1.000 palavras")));
  assert.ok(blockers.some((blocker) => blocker.includes("imagens internas distintas")));
  assert.ok(blockers.some((blocker) => blocker.includes("editoras independentes")));
});
