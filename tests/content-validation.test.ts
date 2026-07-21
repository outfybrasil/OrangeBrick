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

test("aceita uma matéria que cumpre o padrão editorial com ou sem imagem", () => {
  assert.deepEqual(validateEditorialContent(validContent), []);
  
  const textOnlyContent = {
    ...validContent,
    imageUrl: "",
    imageAlt: "",
    blocks: [{ id: "1", type: "text" as const, content: "Texto completo sem imagens na matéria." }],
  };
  assert.deepEqual(validateEditorialContent(textOnlyContent), []);
});

test("bloqueia imagens repetidas e caracteres CJK", () => {
  const invalid = {
    ...validContent,
    title: "Console \u5f15\u64ce",
    blocks: blocks.map((block) => block.id === "2" && block.type === "image" ? { ...block, url: validContent.imageUrl } : block),
  };
  const errors = validateEditorialContent(invalid);
  assert.ok(errors.some((error) => error.includes("repetidas")));
  assert.ok(errors.some((error) => error.includes("CJK")));
});

test("mantém as tags de autoria definidas por categoria", () => {
  assert.equal(AUTHOR_TAGS.breaking, "💣 Plantão");
  assert.equal(AUTHOR_TAGS.opinion, "🔥 Opinião");
});
