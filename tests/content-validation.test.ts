import assert from "node:assert/strict";
import test from "node:test";
import { AUTHOR_TAGS, unverifiedEditorialImageCaption, validateEditorialContent, validateEditorialQuality, type EditorialBlock } from "../src/lib/content-validation.ts";

const longText = Array.from({ length: 700 }, (_, index) => "informacao" + index).join(" ");
const finalSource = "**Fonte:** [Fonte oficial](https://example.com/source)";

test("removes unverified official credits from generated image captions", () => {
  assert.equal(
    unverifiedEditorialImageCaption("Cena do jogo. (Foto: Divulgação/Oficial)", "Cena genérica."),
    "Cena do jogo. (Imagem ilustrativa)",
  );
  assert.equal(
    unverifiedEditorialImageCaption("(Foto: Divulgação/Oficial)", "Cena genérica."),
    "Cena genérica. (Imagem ilustrativa)",
  );
});

const blocks: EditorialBlock[] = [
  { id: "1", type: "text", content: longText },
  { id: "2", type: "image", url: "https://example.com/body-1.jpg", alt: "Console atual visto de frente durante a apresentação", caption: "O console atual foi apresentado no evento oficial." },
  { id: "3", type: "text", content: "## Contexto\n\nO anúncio amplia as opções de compra e preserva a biblioteca dos jogadores." },
  { id: "4", type: "image", url: "https://example.com/body-2.jpg", alt: "Disco físico ao lado do console da geração atual", caption: "A mídia física continua disponível para os consumidores." },
  { id: "5", type: "text", content: "Conclusão sobre o impacto para os jogadores.\n\n" + finalSource },
];

const validContent = {
  slug: "console-atual-mantem-midia-fisica",
  title: "Console atual mantém mídia física na nova geração",
  summary: "A fabricante confirmou a mídia física no console atual, decisão que preserva compras, coleções e o acesso dos jogadores.",
  imageUrl: "https://example.com/cover.jpg",
  imageAlt: "Console da geração atual com leitor de mídia física em destaque",
  blocks,
  absenceRegistered: true,
  editorialMetadata: {
    informationStatus: "confirmed" as const,
    sources: [
      { name: "Fonte A", url: "https://example.com/source" },
      { name: "Fonte B", url: "https://fonteb.com/b" },
      { name: "Fonte C", url: "https://fontec.com/c" },
    ],
  },
};

test("aceita matéria completa segundo os requisitos editoriais", () => {
  assert.deepEqual(validateEditorialContent(validContent), []);
});

test("bloqueia imagens repetidas, sem legenda, e caracteres CJK", () => {
  const invalid = {
    ...validContent,
    title: "Console \u5f15\u64ce",
    blocks: blocks.map((block) => block.id === "2" && block.type === "image"
      ? { ...block, url: validContent.imageUrl, caption: "" }
      : block),
  };
  const errors = validateEditorialContent(invalid);
  assert.ok(errors.some((error) => error.includes("repetidas")));
  assert.ok(errors.some((error) => error.includes("legenda")));
  assert.ok(errors.some((error) => error.includes("CJK")));
});

test("mantém as tags de autoria definidas por categoria", () => {
  assert.equal(AUTHOR_TAGS.breaking, "Plantão");
  assert.equal(AUTHOR_TAGS.opinion, "Opinião");
});

test("aceita uma fonte identificada como oficial e exige contexto verificável da fala", () => {
  const officialSource = validateEditorialContent({
    ...validContent,
    editorialMetadata: {
      informationStatus: "confirmed",
      sources: [{ name: "Comunicado oficial", url: "https://example.com/source", is_official: true }],
    },
  });
  assert.deepEqual(officialSource, []);

  const repeatedDomains = validateEditorialContent({
    ...validContent,
    editorialMetadata: {
      informationStatus: "confirmed",
      sources: [
        { name: "Fonte A", url: "https://example.com/source" },
        { name: "Fonte B", url: "https://example.com/article-b" },
        { name: "Fonte C", url: "https://example.com/article-c" },
      ],
    },
  });
  assert.ok(repeatedDomains.some((error) => error.includes("editoras independentes")));

  const invalidQuote = validateEditorialContent({
    ...validContent,
    editorialMetadata: {
      informationStatus: "confirmed",
      sources: validContent.editorialMetadata.sources,
      quote: { text: "Declaração importante", author: "Asha Sharma", role: "", sourceUrl: "" },
    },
  });
  assert.ok(invalidQuote.some((error) => error.includes("fala em destaque")));
});

test("permite matéria curta somente com justificativa editorial", () => {
  const shortBlocks: EditorialBlock[] = [
    { id: "1", type: "text", content: "Texto curto com os fatos principais.\n\n" + finalSource },
    { id: "2", type: "image", url: "https://example.com/body-1.jpg", alt: "Console atual visto de frente", caption: "O console na apresentação oficial." },
    { id: "3", type: "image", url: "https://example.com/body-2.jpg", alt: "Disco físico ao lado do console", caption: "A mídia física continua no catálogo." },
  ];
  const withoutReason = validateEditorialContent({ ...validContent, blocks: shortBlocks });
  assert.ok(withoutReason.some((error) => error.includes("justificativa editorial")));

  assert.deepEqual(validateEditorialContent({
    ...validContent,
    blocks: shortBlocks,
    shortArticleReason: "Comunicado oficial objetivo sem contexto adicional disponível.",
  }), []);
});

test("exige trailer válido seguido imediatamente por texto", () => {
  const withTrailer = {
    ...validContent,
    blocks: [{ id: "6", type: "video" as const, url: "https://www.youtube.com/watch?v=aOU7KOPGVYU", title: "Phantom Blade Zero — trailer oficial de pré-venda", channelName: "PlayStation Brasil", officialChannelConfirmed: true }, ...blocks],
  };
  assert.deepEqual(validateEditorialContent(withTrailer), []);

  const unverifiedTrailer = {
    ...validContent,
    blocks: [{ id: "6", type: "video" as const, url: "https://www.youtube.com/watch?v=aOU7KOPGVYU", title: "Trailer oficial do jogo", channelName: "Canal informado", officialChannelConfirmed: false }, ...blocks],
  };
  assert.ok(validateEditorialContent(unverifiedTrailer).some((error) => error.includes("canal oficial")));

  const invalidTrailer = {
    ...validContent,
    blocks: [...blocks, { id: "6", type: "video" as const, url: "https://example.com/video", title: "" }],
  };
  assert.ok(validateEditorialContent(invalidTrailer).some((error) => error.includes("trailer")));

  const trailerBeforeImage = {
    ...validContent,
    blocks: [{ id: "6", type: "video" as const, url: "https://www.youtube.com/watch?v=aOU7KOPGVYU", title: "Trailer oficial do jogo", channelName: "Publisher oficial", officialChannelConfirmed: true }, blocks[1], blocks[0]],
  };
  assert.ok(validateEditorialContent(trailerBeforeImage).some((error) => error.includes("seguido imediatamente")));
});

test("checklist exibe os mesmos critérios usados no bloqueio de publicação", () => {
  const items = validateEditorialQuality({
    title: validContent.title,
    summary: validContent.summary,
    imageUrl: validContent.imageUrl,
    imageAlt: validContent.imageAlt,
    body: blocks,
    sourcesText: "Fonte A|https://example.com/source\nFonte B|https://fonteb.com/b\nFonte C|https://fontec.com/c",
    quoteText: "",
    quoteAuthor: "",
    quoteRole: "",
    quoteSourceUrl: "",
    absenceRegistered: true,
    informationStatus: "confirmed",
  });
  assert.ok(items.every((item) => item.complete));
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
});
