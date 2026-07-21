import type { PostCategory } from "@/lib/types/database";

export type EditorialBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string };

export const AUTHOR_TAGS: Record<PostCategory, string> = {
  breaking: "💣 Plantão",
  hardware: "🛠️ Hard News",
  industry: "📡 Radar",
  modding: "🔧 Gambiarra",
  review: "🎮 Review",
  opinion: "🔥 Opinião",
};

interface EditorialContent {
  slug: string;
  title: string;
  summary: string;
  imageUrl: string;
  imageAlt: string;
  blocks: EditorialBlock[];
}

const hasCjk = (value: string) => /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(value);
const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export function validateEditorialContent(content: EditorialContent): string[] {
  const errors: string[] = [];
  const { slug, title, summary, imageUrl, imageAlt, blocks } = content;
  const text = [title, summary, imageAlt, JSON.stringify(blocks)].join("\n");
  const imageBlocks = blocks.filter((block): block is Extract<EditorialBlock, { type: "image" }> => block.type === "image");
  const textBlocks = blocks.filter((block): block is Extract<EditorialBlock, { type: "text" }> => block.type === "text");

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push("O slug deve usar apenas letras minúsculas, números e hífens.");
  if (!title.trim() || title.length > 70) errors.push("O título deve ter entre 1 e 70 caracteres.");
  if (summary.trim().length < 80 || summary.length > 180) errors.push("O resumo deve ter entre 80 e 180 caracteres e ficar próximo de 140.");
  if (!isHttpsUrl(imageUrl)) errors.push("A capa precisa ter uma URL HTTPS válida.");
  if (imageAlt.trim().length < 20) errors.push("O alt text da capa deve descrever a imagem e o contexto da matéria.");
  if (blocks.length < 5 || blocks[0]?.type !== "text" || blocks.at(-1)?.type !== "text") {
    errors.push("Use a estrutura texto, imagem, texto, imagem e texto.");
  }
  if (imageBlocks.length < 2) errors.push("Inclua pelo menos duas imagens no corpo.");
  if (imageBlocks.some((block) => !isHttpsUrl(block.url))) errors.push("Todas as imagens do corpo precisam ter URLs HTTPS válidas.");
  if (imageBlocks.some((block) => block.alt.trim().length < 20)) errors.push("Cada imagem do corpo precisa de alt text contextual.");

  const urls = [imageUrl, ...imageBlocks.map((block) => block.url)].filter(Boolean);
  if (new Set(urls).size !== urls.length) errors.push("A capa e as imagens do corpo devem ser diferentes.");

  const finalText = textBlocks.at(-1)?.content || "";
  if (!/\*\*Fonte:\*\*\s*\[[^\]]+\]\(https:\/\/[^)]+\)/i.test(finalText)) {
    errors.push("O último bloco deve citar a fonte no formato **Fonte:** [Nome](URL).");
  }
  if (hasCjk(text)) errors.push("O conteúdo contém caracteres CJK e precisa ser revisado.");

  return errors;
}
