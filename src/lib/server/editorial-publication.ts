import { independentEditorialPublisherCount, isOfficialEditorialSource, validateStoredEditorialPost } from "../content-validation.ts";
import type { GeneratedDraftResult } from "../ai/gemini-news.ts";
import { isAllowedEditorialImageUrl } from "../ai/editorial-images.ts";

export function editorialPublicationBlockers(result: GeneratedDraftResult): string[] {
  const blockers = validateStoredEditorialPost(result.post);
  if (result.post.title.trim().length > 70) blockers.push("Título acima de 70 caracteres.");
  if (result.post.summary.trim().length > 180) blockers.push("Resumo acima de 180 caracteres.");
  if (result.wordCount < 750 || result.wordCount > 1000) blockers.push("Texto fora de 750 a 1.000 palavras.");

  let blocks: Array<{ type?: string; url?: string; alt?: string; caption?: string }> = [];
  try {
    const parsed: unknown = JSON.parse(result.post.body);
    if (Array.isArray(parsed)) {
      blocks = parsed.filter((block): block is { type?: string; url?: string; alt?: string; caption?: string } =>
        typeof block === "object" && block !== null,
      );
    }
  } catch {
    blockers.push("Blocos da matéria inválidos.");
  }

  const bodyImages = blocks.filter((block) => block.type === "image");
  const imageUrls = [result.post.image_url, ...bodyImages.map((block) => block.url)]
    .filter((url): url is string => typeof url === "string" && Boolean(url.trim()));
  if (!result.post.image_url || bodyImages.length < 2 || new Set(imageUrls).size < 3) {
    blockers.push("Capa e duas imagens internas distintas não foram validadas.");
  }
  if (!result.post.image_alt?.trim() || bodyImages.slice(0, 2).some((image) => !image.alt?.trim() || !image.caption?.trim())) {
    blockers.push("Texto alternativo ou legenda de imagem ausente.");
  }

  const publisherCount = independentEditorialPublisherCount(result.sources);
  const officialSource = result.sources.some((source) => isOfficialEditorialSource(source.url));
  if (publisherCount < 3 && !officialSource) {
    blockers.push("Menos de três editoras independentes confirmadas.");
  }

  const evidence = result.verifiedImages || [];
  if (imageUrls.length !== 3 || imageUrls.some((url) => !evidence.some((image) => image.url === url
    && isAllowedEditorialImageUrl(image.sourceUrl) && /^[a-f0-9]{64}$/.test(image.sha256)
    && image.alt.trim().length >= 20 && image.caption.trim().length >= 20))
    || new Set(evidence.map((image) => image.sha256)).size !== 3) {
    blockers.push("As três imagens precisam de origem oficial e correspondência visual comprovadas pelo seletor.");
  }

  return [...new Set(blockers)];
}
