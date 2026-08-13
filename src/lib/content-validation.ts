import type { PostCategory } from "@/lib/types/database";
import { youtubeVideoId } from "./youtube.ts";

export type EditorialBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string }
  | { id: string; type: "video"; url: string; title: string };

export const AUTHOR_TAGS: Record<PostCategory, string> = {
  breaking: "Plantão",
  hardware: "Hard News",
  industry: "Radar",
  modding: "Gambiarra",
  review: "Review",
  opinion: "Opinião",
};

export function normalizeAuthorTag(value: string | null | undefined): string {
  return (value || "")
    .replace(/^(?:\u{1F4A3}|\u{1F6E0}\u{FE0F}?|\u{1F4E1}|\u{1F527}|\u{1F3AE}|\u{1F525}|\u{26A1})\s*/u, "")
    .trim();
}

interface EditorialContent {
  slug: string;
  title: string;
  summary: string;
  imageUrl: string;
  imageAlt: string;
  blocks: EditorialBlock[];
  editorialMetadata?: {
    informationStatus: "confirmed" | "developing" | "rumor" | "updated" | "corrected";
    quote?: { text: string; author: string; role: string; sourceUrl: string } | null;
    sources: Array<{ name: string; url: string }>;
    correctionNote?: string | null;
  };
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
  const videoBlocks = blocks.filter((block): block is Extract<EditorialBlock, { type: "video" }> => block.type === "video");

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

  if (videoBlocks.some((block) => !youtubeVideoId(block.url) || block.title.trim().length < 12)) {
    errors.push("Todo trailer precisa usar uma URL válida do YouTube e informar um título acessível.");
  }

  if (blocks.some((block, index) => block.type === "video" && blocks[index + 1]?.type !== "text")) {
    errors.push("Todo trailer precisa ser seguido imediatamente por um bloco de texto.");
  }

  const urls = [imageUrl, ...imageBlocks.map((block) => block.url)].filter(Boolean);
  if (urls.length > 1 && new Set(urls).size !== urls.length) {
    errors.push("As imagens do corpo e a capa não devem ter URLs repetidas.");
  }

  if (hasCjk(text)) {
    errors.push("O conteúdo contém caracteres CJK (chinês/japonês/coreano) e precisa ser traduzido.");
  }

  const metadata = content.editorialMetadata;
  if (metadata) {
    if (metadata.quote?.text && (!metadata.quote.author.trim() || !metadata.quote.role.trim() || !isValidImageUrl(metadata.quote.sourceUrl))) errors.push("A fala em destaque precisa de nome, cargo e URL HTTPS da fonte.");
    if (metadata.sources.some((source) => !source.name.trim() || !isValidImageUrl(source.url))) errors.push("Todas as fontes estruturadas precisam de nome e URL HTTPS.");
    if (metadata.informationStatus === "rumor" && metadata.sources.length === 0) errors.push("Uma matéria marcada como rumor precisa ter ao menos uma fonte estruturada.");
    if (metadata.informationStatus === "corrected" && !metadata.correctionNote?.trim()) errors.push("Explique a correção antes de publicar a matéria como corrigida.");
  }

  return errors;
}
