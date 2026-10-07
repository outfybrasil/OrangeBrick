import { independentEditorialPublisherCount, isOfficialEditorialSource, isSpecificEditorialSource, validateStoredEditorialPost } from "../content-validation.ts";
import type { GeneratedDraftResult } from "../ai/gemini-news.ts";
import { isVerifiedEditorialImageEvidenceUrl } from "../ai/editorial-images.ts";
import { generateFactualAltText, isGenericOrProhibitedImage } from "../editorial-cover.ts";

export function editorialPublicationBlockers(result: GeneratedDraftResult): string[] {
  if (result.post.image_url && (!result.post.image_alt || result.post.image_alt.trim().length < 3)) {
    result.post.image_alt = generateFactualAltText(result.post);
  }

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

  if (!result.post.image_url || !result.post.image_url.trim()) {
    blockers.push("A imagem de capa é obrigatória para a publicação.");
  }

  if (new Set(imageUrls).size !== imageUrls.length) {
    blockers.push("As imagens internas distintas e a capa não podem ter URLs repetidas.");
  }

  if (bodyImages.some((image) => !image.alt?.trim() || !image.caption?.trim())) {
    blockers.push("Texto alternativo ou legenda de imagem ausente.");
  }

  if (
    isGenericOrProhibitedImage(result.post.image_alt || "") ||
    isGenericOrProhibitedImage(result.post.image_url || "")
  ) {
    blockers.push("A imagem de capa selecionada é genérica ou não possui relação editorial comprovada.");
  }

  const sourceCandidates = result.sources.filter((source) => isSpecificEditorialSource(source.url));
  const specificSources = sourceCandidates.filter((source) => source.source_verified === true);
  if (result.sources.length > 0 && sourceCandidates.length === 0) {
    blockers.push("As fontes apontam para homepages, não para páginas específicas.");
  }
  if (sourceCandidates.some((source) => source.source_verified !== true)) {
    blockers.push("Uma ou mais fontes não foram consultadas e verificadas quanto à relevância.");
  }
  const publisherCount = independentEditorialPublisherCount(specificSources);
  const officialSource = specificSources.some((source) => source.is_official || isOfficialEditorialSource(source.url));
  if (publisherCount < 3 && !officialSource) {
    blockers.push("Menos de três editoras independentes confirmadas.");
  }

  const evidence = result.verifiedImages || [];
  if (
    imageUrls.length === 0 ||
    imageUrls.some(
      (url) =>
        !evidence.some(
          (image) =>
            image.url === url &&
            isVerifiedEditorialImageEvidenceUrl(image.sourceUrl) &&
            /^[a-f0-9]{64}$/.test(image.sha256) &&
            image.alt.trim().length >= 20 &&
            image.caption.trim().length >= 20 &&
            !isGenericOrProhibitedImage(image.alt),
        ),
    ) ||
    new Set(
      imageUrls
        .map((url) => evidence.find((image) => image.url === url)?.sha256)
        .filter(Boolean),
    ).size !== imageUrls.length
  ) {
    blockers.push("A capa e as imagens incluídas precisam de origem oficial e correspondência visual comprovadas pelo seletor.");
  }

  return [...new Set(blockers)];
}
