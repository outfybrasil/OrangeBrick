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
const isValidImageUrl = (value: string) => {
  if (value.startsWith("/")) return true;
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
  if (!title.trim() || title.length > 120) errors.push("O título deve ter entre 1 e 120 caracteres.");
  if (summary.trim().length < 20 || summary.length > 300) errors.push("O resumo deve ter entre 20 e 300 caracteres.");

  if (imageUrl && !isValidImageUrl(imageUrl)) {
    errors.push("A capa precisa ter uma URL de imagem válida (HTTPS ou caminho interno).");
  }
  if (imageUrl && imageAlt.trim().length < 3) {
    errors.push("Informe o texto alternativo (Alt text) da imagem de capa.");
  }

  if (textBlocks.length === 0 || !textBlocks.some((b) => b.content.trim().length > 0)) {
    errors.push("Adicione pelo menos um bloco de texto com conteúdo no corpo da matéria.");
  }

  if (imageBlocks.some((block) => block.url.trim() && !isValidImageUrl(block.url))) {
    errors.push("Todas as imagens do corpo precisam ter URLs válidas (HTTPS ou caminho interno).");
  }

  const urls = [imageUrl, ...imageBlocks.map((block) => block.url)].filter(Boolean);
  if (urls.length > 1 && new Set(urls).size !== urls.length) {
    errors.push("As imagens do corpo e a capa não devem ter URLs repetidas.");
  }

  if (hasCjk(text)) {
    errors.push("O conteúdo contém caracteres CJK (chinês/japonês/coreano) e precisa ser traduzido.");
  }

  return errors;
}
