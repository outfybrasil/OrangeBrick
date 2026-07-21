import assert from "node:assert/strict";
import test from "node:test";
import { AUTHOR_TAGS, validateEditorialContent, type EditorialBlock } from "../src/lib/content-validation.ts";

const blocks: EditorialBlock[] = [
  { id: "1", type: "text", content: "Introdução factual da matéria." },
  { id: "2", type: "image", url: "https://example.com/body-1.jpg", alt: "Console atual exibido de frente no ambiente da matéria" },
  { id: "3", type: "text", content: "## Contexto\n\nDesenvolvimento dos fatos." },
  { id: "4", type: "image", url: "https://example.com/body-2.jpg", alt: "Mídia física atual exibida sob outro ângulo editorial" },
  { id: "5", type: "text", content: "Conclusão.\n\n**Fonte:** [Fonte oficial](https://example.com/source)" },
];

const validContent = {
  slug: "console-atual-mantem-midia-fisica",
  title: "Console atual mantém mídia física em nova geração",
  summary: "A fabricante confirmou a mídia física no console atual, decisão que preserva compras e coleções dos jogadores.",
  imageUrl: "https://example.com/cover.jpg",
  imageAlt: "Console da geração atual com leitor de mídia física em destaque",
  blocks,
};

test("aceita uma matéria que cumpre o padrão editorial", () => {
  assert.deepEqual(validateEditorialContent(validContent), []);
});

test("bloqueia imagens repetidas, CJK e ausência de fonte", () => {
  const invalid = {
    ...validContent,
    title: "Console \u5f15\u64ce",
    blocks: blocks.map((block) => block.id === "2" && block.type === "image" ? { ...block, url: validContent.imageUrl } : block).map((block) => block.id === "5" && block.type === "text" ? { ...block, content: "Conclusão sem fonte." } : block),
  };
  const errors = validateEditorialContent(invalid);
  assert.ok(errors.some((error) => error.includes("diferentes")));
  assert.ok(errors.some((error) => error.includes("Fonte")));
  assert.ok(errors.some((error) => error.includes("CJK")));
});

test("mantém as tags de autoria definidas por categoria", () => {
  assert.equal(AUTHOR_TAGS.breaking, "💣 Plantão");
  assert.equal(AUTHOR_TAGS.opinion, "🔥 Opinião");
});
