import type { Post, PostCategory } from "@/lib/types/database";
import { youtubeVideoId } from "./youtube.ts";

export type EditorialBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string }
  | { id: string; type: "video"; url: string; title: string; channelName?: string; officialChannelConfirmed?: boolean };

export type EditorialSource = { name: string; url: string; is_official?: boolean };

export type EditorialInformationStatus = "confirmed" | "developing" | "rumor" | "updated" | "corrected";

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
  shortArticleReason?: string;
  absenceRegistered?: boolean;
  editorialMetadata?: {
    informationStatus: EditorialInformationStatus;
    quote?: { text: string; author: string; role: string; sourceUrl: string } | null;
    sources: EditorialSource[];
    correctionNote?: string | null;
  };
}

const hasCjk = (value: string) => /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(value);
const uncertainHeadlineClaim = /\b(?:vazou|vazamento|vazamentos|leaked|leak|insider|supost[oa]s?|não confirmado|nao confirmado|sem confirmação|sem confirmacao|rumores?\s+(?:aponta(?:m)?|indica(?:m)?|sugere(?:m)?|diz(?:em)?|prev(?:e|ê)(?:m)?)|would be|reportedly|allegedly)\b/iu;
export const isValidEditorialUrl = (value: string) => {
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\") && !value.split("?")[0].split("#")[0].split("/").includes("..");
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

function isValidHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const OFFICIAL_EDITORIAL_DOMAINS = [
  "nintendo.com", "nintendo.co.jp", "playstation.com", "xbox.com", "microsoft.com", "ea.com", "ubisoft.com",
  "capcom.com", "capcom-games.com", "sega.com", "bandainamcoent.com", "square-enix.com", "square-enix-games.com",
  "rockstargames.com", "bethesda.net", "activision.com", "blizzard.com", "epicgames.com", "cdprojektred.com", "konami.com",
];

const EDITORIAL_PUBLISHERS: Array<{ publisher: string; domains: string[] }> = [
  { publisher: "gematsu", domains: ["gematsu.com"] },
  { publisher: "ign", domains: ["ign.com", "ign.com.br"] },
  { publisher: "eurogamer", domains: ["eurogamer.net", "eurogamer.pt"] },
  { publisher: "vgc", domains: ["videogameschronicle.com"] },
  { publisher: "gamespot", domains: ["gamespot.com"] },
  { publisher: "kotaku", domains: ["kotaku.com"] },
  { publisher: "the-verge", domains: ["theverge.com"] },
  { publisher: "push-square", domains: ["pushsquare.com"] },
  { publisher: "pure-xbox", domains: ["purexbox.com"] },
  { publisher: "nintendo-life", domains: ["nintendolife.com"] },
];

const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  "ac.jp", "ac.nz", "ac.uk", "ac.za", "com.ar", "com.au", "com.br", "com.cn", "com.hk", "com.in", "com.mx", "com.my", "com.sg", "com.tr", "com.tw",
  "co.in", "co.jp", "co.kr", "co.nz", "co.uk", "co.za", "edu.au", "edu.br", "edu.cn", "firm.in", "gen.in", "gov.au", "gov.br", "gov.cn", "gov.in",
  "gov.uk", "govt.nz", "net.au", "net.br", "net.cn", "net.in", "net.nz", "net.uk", "net.za", "org.au", "org.br", "org.cn", "org.in", "org.nz", "org.uk", "org.za",
]);

export function editorialPublisherId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const entry of EDITORIAL_PUBLISHERS) {
      if (entry.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return entry.publisher;
    }
    if (!/^[a-z0-9.-]+$/.test(hostname) || hostname.includes("..")) return null;
    const labels = hostname.split(".");
    const suffix = labels.slice(-2).join(".");
    const suffixLength = MULTI_LABEL_PUBLIC_SUFFIXES.has(suffix) ? 2 : 1;
    if (labels.length <= suffixLength) return null;
    return labels.slice(-(suffixLength + 1)).join(".");
  } catch {
    return null;
  }
}

export function independentEditorialPublisherCount(sources: readonly { url: string }[]): number {
  return new Set(sources.map((source) => editorialPublisherId(source.url)).filter((publisher): publisher is string => Boolean(publisher))).size;
}

export function unverifiedEditorialImageCaption(caption: string | undefined, fallback: string): string {
  const text = (caption || fallback)
    .trim()
    .replace(/\s*\(?\s*(?:(?:foto:\s*)?divulgação\s*\/\s*oficial|imagem ilustrativa)\s*\)?\s*\.?\s*$/iu, "")
    .trim();
  return `${text || fallback} (Imagem ilustrativa)`;
}

export function isOfficialEditorialSource(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return OFFICIAL_EDITORIAL_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isEditorialBlock(value: unknown): value is EditorialBlock {
  if (!isRecord(value) || typeof value.id !== "string") return false;
  if (value.type === "text") return typeof value.content === "string";
  if (value.type === "image") return typeof value.url === "string" && typeof value.alt === "string" && (value.caption === undefined || typeof value.caption === "string");
  return value.type === "video"
    && typeof value.url === "string"
    && typeof value.title === "string"
    && (value.channelName === undefined || typeof value.channelName === "string")
    && (value.officialChannelConfirmed === undefined || typeof value.officialChannelConfirmed === "boolean");
}

function textFromBlocks(blocks: EditorialBlock[]) {
  return blocks
    .filter((block): block is Extract<EditorialBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.content)
    .join("\n");
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function parseEditorialSources(value: string): EditorialSource[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("|");
      if (separator < 0) return { name: "Fonte", url: line, is_official: false };
      const [name = "", url = "", flag = ""] = line.split("|").map((part) => part.trim());
      return { name, url, is_official: flag.toLowerCase() === "oficial" };
    });
}

export function parseEditorialBlocks(value: string): EditorialBlock[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(isEditorialBlock)) return parsed;
  } catch {}
  return [{ id: "legacy-body", type: "text", content: value }];
}

export function validateEditorialContent(content: EditorialContent): string[] {
  const errors: string[] = [];
  const { slug, title, summary, imageUrl, imageAlt, blocks, shortArticleReason, absenceRegistered } = content;
  const text = [title, summary, imageAlt, JSON.stringify(blocks)].join("\n");
  const imageBlocks = blocks.filter((block): block is Extract<EditorialBlock, { type: "image" }> => block.type === "image");
  const textBlocks = blocks.filter((block): block is Extract<EditorialBlock, { type: "text" }> => block.type === "text");
  const videoBlocks = blocks.filter((block): block is Extract<EditorialBlock, { type: "video" }> => block.type === "video");

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push("O slug deve usar apenas letras minúsculas, números e hífens.");
  if (!title.trim() || title.trim().length > 70) errors.push("O título deve ter entre 1 e 70 caracteres.");
  if (summary.trim().length < 80 || summary.trim().length > 180) errors.push("O resumo deve ter entre 80 e 180 caracteres.");
  if (!imageUrl.trim() || !isValidEditorialUrl(imageUrl)) errors.push("A capa precisa de uma URL HTTPS válida ou caminho interno.");
  if (imageAlt.trim().length < 3) errors.push("Informe o texto alternativo da imagem de capa.");

  if (textBlocks.length === 0 || !textBlocks.some((b) => b.content.trim().length > 0)) {
    errors.push("Adicione pelo menos um bloco de texto com conteúdo no corpo da matéria.");
  }

  if (imageBlocks.some((block) => block.url.trim() && !isValidEditorialUrl(block.url))) {
    errors.push("Todas as imagens do corpo precisam ter URLs válidas (HTTPS ou caminho interno).");
  }

  const uniqueBodyImageUrls = new Set(imageBlocks.map((block) => block.url.trim()).filter(Boolean));
  if (uniqueBodyImageUrls.size < 2) errors.push("A matéria precisa de duas imagens internas distintas.");
  if (imageBlocks.some((block) => block.alt.trim().length < 3 || !block.caption?.trim())) {
    errors.push("Cada imagem interna precisa de texto alternativo e legenda específicos.");
  }

  if (videoBlocks.some((block) => !youtubeVideoId(block.url) || block.title.trim().length < 12 || (block.channelName?.trim().length ?? 0) < 2 || !block.officialChannelConfirmed)) {
    errors.push("Todo trailer precisa de URL, título acessível, canal oficial identificado e confirmação de disponibilidade.");
  }

  if (blocks.some((block, index) => block.type === "video" && blocks[index + 1]?.type !== "text")) {
    errors.push("Todo trailer precisa ser seguido imediatamente por um bloco de texto.");
  }

  const urls = [imageUrl, ...imageBlocks.map((block) => block.url)].map((url) => url.trim()).filter(Boolean);
  if (urls.length > 1 && new Set(urls).size !== urls.length) {
    errors.push("As imagens do corpo e a capa não devem ter URLs repetidas.");
  }

  const articleText = textFromBlocks(blocks);
  const count = wordCount(articleText);
  if (count < 700 && (shortArticleReason?.trim().length ?? 0) < 20) {
    errors.push("Matérias com menos de 700 palavras precisam de uma justificativa editorial de pelo menos 20 caracteres.");
  }
  const finalTextBlock = [...blocks].reverse().find((block) => block.type === "text");
  const finalCitation = finalTextBlock?.type === "text"
    ? finalTextBlock.content.match(/\*\*Fonte:\*\*\s*\[[^\]]+\]\((https:\/\/[^)]+)\)/i)?.[1]
    : null;
  if (!finalCitation) {
    errors.push("Inclua a fonte principal no final da matéria usando o formato **Fonte:** [Nome](https://...)");
  }

  if (hasCjk(text)) {
    errors.push("O conteúdo contém caracteres CJK (chinês/japonês/coreano) e precisa ser traduzido.");
  }

  const metadata = content.editorialMetadata;
  if (metadata) {
    if (!["confirmed", "developing", "rumor", "updated", "corrected"].includes(metadata.informationStatus)) errors.push("Defina um estado válido para a informação.");
    if (metadata.informationStatus === "confirmed" && uncertainHeadlineClaim.test(`${title} ${summary}`)) errors.push("Revise o estado da informação: a manchete ou o resumo apresenta uma alegação incerta como confirmada.");
    if (metadata.quote?.text && (!metadata.quote.author.trim() || !metadata.quote.role.trim() || !isValidHttpsUrl(metadata.quote.sourceUrl))) errors.push("A fala em destaque precisa de nome, cargo e URL HTTPS da fonte.");
    if (metadata.quote?.text && !articleText.includes(metadata.quote.text.trim())) errors.push("Inclua no corpo a fala registrada nos metadados, com atribuição e contexto.");
    if (metadata.sources.some((source) => !source.name.trim() || !isValidHttpsUrl(source.url))) errors.push("Todas as fontes estruturadas precisam de nome e URL HTTPS.");
    const validSources = metadata.sources.filter((source) => source.name.trim() && isValidHttpsUrl(source.url));
    if (independentEditorialPublisherCount(validSources) < 3 && !validSources.some((source) => source.is_official || isOfficialEditorialSource(source.url))) errors.push("Inclua três editoras independentes ou uma fonte oficial.");
    if (finalCitation && !validSources.some((source) => source.url.trim() === finalCitation)) errors.push("A fonte citada no final também precisa constar nas fontes estruturadas.");
    if (metadata.informationStatus === "rumor" && validSources.length === 0) errors.push("Uma matéria marcada como rumor precisa ter ao menos uma fonte estruturada.");
    if (metadata.informationStatus === "corrected" && !metadata.correctionNote?.trim()) errors.push("Explique a correção antes de publicar a matéria como corrigida.");
    if (!metadata.quote?.text && !absenceRegistered) errors.push("Registre uma fala verificada ou a ausência de declaração pública relevante.");
  } else {
    errors.push("Complete os metadados editoriais antes de publicar.");
  }

  return errors;
}

export function validateStoredEditorialPost(post: Pick<Post, "slug" | "title" | "summary" | "body" | "image_url" | "image_alt" | "information_status" | "featured_quote" | "editorial_sources" | "short_article_reason" | "correction_note">): string[] {
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(post.body);
  } catch {
    return ["Converta o corpo para blocos de texto, imagens e vídeos antes de publicar."];
  }
  if (!Array.isArray(parsedBody) || !parsedBody.every(isEditorialBlock)) {
    return ["O corpo contém blocos inválidos e precisa ser revisado no editor."];
  }

  const sources: EditorialSource[] = Array.isArray(post.editorial_sources)
    ? post.editorial_sources.filter((source): source is EditorialSource => isRecord(source) && typeof source.name === "string" && typeof source.url === "string" && (source.is_official === undefined || typeof source.is_official === "boolean"))
    : [];
  const quote = isRecord(post.featured_quote) ? post.featured_quote : null;
  const quoteText = typeof quote?.text === "string" ? quote.text : "";
  const informationStatus = ["confirmed", "developing", "rumor", "updated", "corrected"].includes(post.information_status)
    ? post.information_status
    : "confirmed";
  const metadataErrors = ["confirmed", "developing", "rumor", "updated", "corrected"].includes(post.information_status)
    ? []
    : ["Defina um estado válido para a informação."];

  return [
    ...metadataErrors,
    ...validateEditorialContent({
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      imageUrl: post.image_url || "",
      imageAlt: post.image_alt || "",
      blocks: parsedBody,
      shortArticleReason: post.short_article_reason || "",
      absenceRegistered: quote?.absence_registered === true,
      editorialMetadata: {
        informationStatus,
        quote: quoteText
          ? {
              text: quoteText,
              author: typeof quote?.author === "string" ? quote.author : "",
              role: typeof quote?.role === "string" ? quote.role : "",
              sourceUrl: typeof quote?.source_url === "string" ? quote.source_url : "",
            }
          : null,
        sources,
        correctionNote: post.correction_note,
      },
    }),
  ];
}

export interface EditorialQualityItem {
  id: number;
  label: string;
  complete: boolean;
  detail?: string;
}

export interface EditorialQualityInput {
  title?: string;
  summary: string;
  imageUrl?: string;
  imageAlt?: string;
  body: EditorialBlock[];
  sourcesText: string;
  quoteText: string;
  quoteAuthor: string;
  quoteRole?: string;
  quoteSourceUrl: string;
  absenceRegistered?: boolean;
  informationStatus?: EditorialInformationStatus;
  correctionNote?: string;
  shortArticleReason?: string;
}

export function validateEditorialQuality(input: EditorialQualityInput): EditorialQualityItem[] {
  const { title, summary, imageUrl, imageAlt, body, sourcesText, quoteText, quoteAuthor, quoteRole, quoteSourceUrl, absenceRegistered, informationStatus, correctionNote, shortArticleReason } = input;

  const textContent = textFromBlocks(body);
  const count = wordCount(textContent);
  const imageBlocks = body.filter((block): block is Extract<EditorialBlock, { type: "image" }> => block.type === "image");
  const videoBlocks = body.map((block, index) => ({ block, index })).filter((entry): entry is { block: Extract<EditorialBlock, { type: "video" }>; index: number } => entry.block.type === "video");
  const sources = parseEditorialSources(sourcesText);
  const validSources = sources.filter((source) => source.name && isValidHttpsUrl(source.url));
  const sourcePublisherCount = independentEditorialPublisherCount(validSources);
  const hasQuote = Boolean(quoteText.trim());
  const quoteComplete = hasQuote
    ? Boolean(quoteAuthor.trim() && quoteRole?.trim() && isValidHttpsUrl(quoteSourceUrl.trim()))
    : false;
  const hasOfficialSource = validSources.some((source) => source.is_official || isOfficialEditorialSource(source.url));
  const finalTextBlock = [...body].reverse().find((block) => block.type === "text");
  const finalSourceUrl = finalTextBlock?.type === "text"
    ? finalTextBlock.content.match(/\*\*Fonte:\*\*\s*\[[^\]]+\]\((https:\/\/[^)]+)\)/i)?.[1]
    : null;
  const finalSourcePresent = Boolean(finalSourceUrl && validSources.some((source) => source.url === finalSourceUrl));

  return [
    {
      id: 1,
      label: "Título com até 70 caracteres",
      complete: Boolean(title?.trim() && title.trim().length <= 70),
      detail: title?.trim() ? `${title.trim().length} caracteres` : "Título ausente",
    },
    {
      id: 2,
      label: "Resumo entre 80 e 180 caracteres",
      complete: summary.trim().length >= 80 && summary.trim().length <= 180,
      detail: summary.trim().length > 0
        ? `${summary.trim().length} caracteres`
        : undefined,
    },
    {
      id: 3,
      label: "Capa e texto alternativo válidos",
      complete: Boolean(imageUrl && isValidEditorialUrl(imageUrl) && imageAlt?.trim().length && imageAlt.trim().length >= 3),
      detail: imageUrl ? "Imagem e descrição preenchidas" : "Capa ausente",
    },
    {
      id: 4,
      label: "Corpo com 700 palavras ou justificativa para matéria curta",
      complete: count >= 700 || (count > 0 && (shortArticleReason?.trim().length ?? 0) >= 20),
      detail: count < 700 && (shortArticleReason?.trim().length ?? 0) >= 20
        ? `${count} palavras; exceção registrada`
        : `${count} palavras${count < 700 ? "; falta justificativa" : ""}`,
    },
    {
      id: 5,
      label: "Duas imagens internas distintas",
      complete: new Set(imageBlocks.map((block) => block.url.trim()).filter(Boolean)).size >= 2,
      detail: `${new Set(imageBlocks.map((block) => block.url.trim()).filter(Boolean)).size} imagens distintas`,
    },
    {
      id: 6,
      label: "Alt text e legenda nas imagens internas",
      complete: imageBlocks.length >= 2 && imageBlocks.every((block) => block.alt.trim().length >= 3 && Boolean(block.caption?.trim())),
      detail: `${imageBlocks.filter((block) => block.alt.trim().length >= 3 && Boolean(block.caption?.trim())).length} de ${imageBlocks.length} imagens descritas`,
    },
    {
      id: 7,
      label: "Três fontes ou uma fonte oficial",
      complete: sourcePublisherCount >= 3 || hasOfficialSource,
      detail: hasOfficialSource ? "Fonte oficial identificada" : `${sourcePublisherCount} de 3 editoras distintas`,
    },
    {
      id: 8,
      label: "Fonte citada no final do texto",
      complete: finalSourcePresent,
    },
    {
      id: 9,
      label: "Estado da informação definido",
      complete: Boolean(informationStatus),
    },
    {
      id: 10,
      label: "Fala verificada ou ausência registrada",
      complete: hasQuote ? quoteComplete : Boolean(absenceRegistered),
      detail: hasQuote
        ? quoteComplete
          ? "Fala com autoria, cargo e fonte"
          : "Fala incompleta (falta autor, cargo ou URL)"
        : absenceRegistered
          ? "Ausência registrada"
          : "Nenhuma fala ou registro de ausência",
    },
    {
      id: 11,
      label: "Nota de correção preenchida quando necessário",
      complete: informationStatus !== "corrected" || Boolean(correctionNote?.trim()),
      detail: informationStatus === "corrected" && !correctionNote?.trim() ? "Nota obrigatória" : undefined,
    },
    {
      id: 12,
      label: "URLs das imagens válidas e sem repetição",
      complete: Boolean(imageUrl && isValidEditorialUrl(imageUrl))
        && imageBlocks.every((block) => isValidEditorialUrl(block.url))
        && new Set([imageUrl || "", ...imageBlocks.map((block) => block.url.trim())].filter(Boolean)).size === imageBlocks.length + 1,
    },
    {
      id: 13,
      label: "Trailer de canal oficial validado quando aplicável",
      complete: videoBlocks.every(({ block, index }) => Boolean(
        youtubeVideoId(block.url)
        && block.title.trim().length >= 12
        && (block.channelName?.trim().length ?? 0) >= 2
        && block.officialChannelConfirmed
        && body[index + 1]?.type === "text",
      )),
      detail: videoBlocks.length === 0 ? "Sem trailer incorporado" : `${videoBlocks.length} trailer${videoBlocks.length === 1 ? "" : "s"} verificado${videoBlocks.length === 1 ? "" : "s"}`,
    },
  ];
}
