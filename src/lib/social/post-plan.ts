import { socialCommentPrompt, generateSocialCopys } from "./social-copy.ts";
import { parseEditorialBlocks } from "../content-validation.ts";
import type { Post, SocialPostAsset, SocialPostDraft, SocialPostSlide } from "../types/database.ts";

export type SocialSourcePost = Pick<Post, "id" | "slug" | "title" | "summary" | "body" | "image_url" | "image_alt" | "updated_at" | "information_status"> & Partial<Pick<Post, "category">> & { imageSources?: Record<string, string>; siteUrl?: string };

export function socialPlainText(value: string) {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*#_`]/g, "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

function excerpt(value: string, max: number) {
  const text = socialPlainText(value);
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function summarizeSocialText(value: string, max = 300): string {
  const text = socialPlainText(value);
  if (!text) return "";
  const sentences = [...new Intl.Segmenter("pt-BR", { granularity: "sentence" }).segment(text)].map(part => part.segment.trim()).filter(sentence => sentence && !/(?:…|\.\.\.)["”’')\]]*$/.test(sentence));
  const selected: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    if (length + (selected.length ? 1 : 0) + sentence.length > max) continue;
    selected.push(sentence);
    length += sentence.length + (selected.length > 1 ? 1 : 0);
  }
  if (!selected.length) throw new Error(`Não há uma frase completa que caiba em ${max} caracteres. Resuma este trecho da matéria antes de gerar o post.`);
  return selected.join(" ");
}

function slideHeading(value: string, fallback: string, max: number) {
  const text = socialPlainText(value);
  return text.length <= max ? text : fallback;
}

export function socialPostAssets(post: SocialSourcePost): SocialPostAsset[] {
  const blocks = parseEditorialBlocks(post.body);
  const candidates = [
    { url: post.image_url || "", alt: post.image_alt || "", caption: "" },
    ...blocks.filter(block => block.type === "image").map(block => ({ url: block.url, alt: block.alt, caption: block.caption || "" })),
  ];
  return candidates.filter((asset, index) => asset.url && candidates.findIndex(other => other.url === asset.url) === index).map(asset => {
    const origin = post.imageSources?.[asset.url] || (/^https:\/\//i.test(asset.url) && !/\/storage\/v1\//i.test(asset.url) ? asset.url : `${post.siteUrl || "https://orangebrick.blog"}/posts/${encodeURIComponent(post.slug)}`);
    let attributionUrl = `${post.siteUrl || "https://orangebrick.blog"}/posts/${encodeURIComponent(post.slug)}`;
    try { const originUrl = new URL(origin); attributionUrl = origin.length > 280 ? originUrl.origin : origin; } catch {}
    const description = asset.caption.trim() || asset.alt.trim() || `Imagem utilizada na matéria: ${post.title}`;
    const hasAttribution = /(?:cr[eé]ditos?|fonte(?: da imagem)?|origem)\s*[:—-]|©/i.test(description);
    return { ...asset, caption: hasAttribution ? description : `${excerpt(description, 480 - attributionUrl.length)}\nOrigem: ${attributionUrl}` };
  });
}

export function generateSocialDraft(post: SocialSourcePost, format: SocialPostDraft["format"]): SocialPostDraft {
  const assets = socialPostAssets(post);
  const slide = (kind: SocialPostSlide["kind"], index: number, title: string, text: string, asset?: SocialPostAsset): SocialPostSlide => ({
    id: `${kind}-${index}`, kind, title, text, imageUrl: asset?.url || "", alt: asset?.alt || "", caption: asset?.caption || "", fit: "contain", positionX: 50, positionY: 50,
  });
  const qualifier = post.information_status === "rumor" ? "RUMOR: " : "";
  const coverTitle = socialPlainText(qualifier + post.title);
  if (coverTitle.length > 110) throw new Error("Resuma o título da matéria para até 110 caracteres antes de gerar a capa.");
  const cover = slide("cover", 0, coverTitle, summarizeSocialText(post.summary, 200), assets[0]);
  const caption = generateSocialCaption(post, format);
  const slides = [cover];
  if (format === "carousel") {
    const blocks = parseEditorialBlocks(post.body).filter(block => block.type === "text");
    for (const [index, block] of blocks.slice(0, 8).entries()) {
      const content = block.content.replace(/\*\*Fonte[s]?:\*\*[\s\S]*$/i, "").trim();
      if (!content) continue;
      const heading = content.match(/^#{2,3}\s+([^\n]+)/m)?.[1];
      slides.push(slide("content", index + 1, slideHeading(heading || (index === 0 ? "O que aconteceu" : "Entenda o contexto"), "Entenda o contexto", 80), summarizeSocialText(content.replace(/^#{2,3}\s+[^\n]+/gm, "")), assets[index + 1]));
    }
    for (const asset of assets.slice(1).filter(asset => !slides.some(item => item.imageUrl === asset.url))) {
      if (slides.length >= 19) break;
      slides.push(slide("content", slides.length, slideHeading(asset.caption || "Veja os detalhes", "Veja os detalhes", 80), "", asset));
    }
    const cta = socialCommentCta(generateSocialCaption(post, format, true));
    slides.push(slide("cta", 20, cta.title, cta.text));
  }
  return { version: 1, postId: post.id, sourceUpdatedAt: post.updated_at, format, caption, music: "", slides, savedAt: null };
}

export function validateSocialDraft(value: unknown, post: SocialSourcePost): SocialPostDraft {
  if (!value || typeof value !== "object") throw new Error("Rascunho inválido.");
  const draft = value as SocialPostDraft;
  if (draft.version !== 1 || draft.postId !== post.id || !["single", "carousel"].includes(draft.format)) throw new Error("Formato ou matéria inválidos.");
  if (!Array.isArray(draft.slides) || draft.slides.length < 1 || draft.slides.length > 20 || (draft.format === "single" && draft.slides.length !== 1) || (draft.format === "carousel" && draft.slides.length < 2)) throw new Error("Use uma imagem no post ou entre 2 e 20 slides no carrossel, incluindo o CTA.");
  const string = (value: unknown, max: number) => typeof value === "string" && value.length <= max && !/[\u0000-\u0008\uFFFD]/u.test(value);
  if (!string(draft.caption, 2200) || !string(draft.music, 200) || !string(draft.sourceUpdatedAt, 60) || !draft.caption.trim()) throw new Error("Revise a legenda (até 2.200 caracteres) e a música.");
  const allowed = new Set(socialPostAssets(post).map(asset => asset.url));
  const used = new Set<string>();
  const ids = new Set<string>();
  const slides = draft.slides.map((slide, index) => {
    if (!slide || !string(slide.id, 80) || !slide.id || ids.has(slide.id) || !["cover", "content", "cta"].includes(slide.kind) || !string(slide.title, 110) || !string(slide.text, 300) || !string(slide.alt, 500) || !string(slide.caption, 500) || !string(slide.imageUrl, 3000) || !["contain", "cover"].includes(slide.fit)) throw new Error(`Revise os campos do slide ${index + 1}.`);
    if (/(?:…|\.\.\.)["”’')\]]*$/.test(slide.title.trim()) || /(?:…|\.\.\.)["”’')\]]*$/.test(slide.text.trim())) throw new Error(`Conclua o resumo do slide ${index + 1}: não deixe frases cortadas com reticências.`);
    ids.add(slide.id);
    if (index === 0 && (slide.kind !== "cover" || !slide.title.trim() || !slide.imageUrl)) throw new Error("A capa precisa de manchete e imagem da matéria.");
    if (index > 0 && slide.kind === "cover") throw new Error("A capa deve ser o primeiro slide.");
    if (slide.kind === "cta" && (index !== draft.slides.length - 1 || draft.format === "single" || !slide.title.trim())) throw new Error("O CTA precisa de uma chamada e deve ser o último slide do carrossel.");
    if (slide.kind === "content" && !slide.imageUrl && !slide.text.trim()) throw new Error(`Preencha o texto ou a imagem do slide ${index + 1}.`);
    if (slide.imageUrl) {
      if (!allowed.has(slide.imageUrl)) throw new Error("Selecione apenas imagens vinculadas à matéria.");
      if (used.has(slide.imageUrl)) throw new Error("Use imagens diferentes na capa e nos slides.");
      if (!slide.alt.trim()) throw new Error(`Informe o texto alternativo do slide ${index + 1}.`);
      used.add(slide.imageUrl);
    }
    if (![slide.positionX, slide.positionY].every(value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100)) throw new Error("Enquadramento inválido.");
    return { id: slide.id, kind: slide.kind, title: slide.title.trim(), text: slide.text.trim(), imageUrl: slide.imageUrl, alt: slide.alt.trim(), caption: slide.caption.trim(), fit: slide.fit, positionX: slide.positionX, positionY: slide.positionY };
  });
  if (draft.format === "carousel" && slides.at(-1)?.kind !== "cta") throw new Error("Reserve o último slide para o CTA.");
  return { version: 1, postId: post.id, sourceUpdatedAt: draft.sourceUpdatedAt, format: draft.format, caption: draft.caption.trim(), music: draft.music.trim(), slides, savedAt: null };
}

export function instagramPostCaption(draft: SocialPostDraft, origin: string): string {
  const photos = draft.slides.filter(slide => slide.imageUrl);
  if (photos.some(slide => !slide.caption.trim())) throw new Error("Preencha a legenda e o crédito de cada imagem nos slides e salve o rascunho antes de publicar.");
  const credits = [...new Set(photos.map(slide => slide.caption.replace(/^[\s\S]*?(?:cr[eé]ditos?|fonte(?: da imagem)?|origem):\s*/i, "").trim()))];
  const caption = draft.caption.replace(/^(?:Comenta a[ií]|Responda nos coment[aá]rios):[^\n]*\n*/gimu, "").replace(/^Créditos das imagens: consulte as legendas dos slides\.\s*$/m, "").trim().replace(/(^|\s)(\/posts\/[^\s]+)/g, `$1${origin.replace(/\/$/, "")}$2`);
  const missing = credits.filter(credit => !caption.includes(credit));
  const paragraphs = caption.split("\n\n");
  const last = paragraphs.at(-1) || "";
  const tags = /^(?:#[\p{L}\p{N}_]+[ \t]*)+$/u.test(last) ? paragraphs.pop() : "";
  const result = missing.length ? [paragraphs.join("\n\n"), `Imagens: ${missing.join("; ")}`, tags].filter(Boolean).join("\n\n") : caption;
  if (result.length > 2200) throw new Error("A legenda com o link e os créditos ultrapassa 2.200 caracteres. Reduza o texto antes de publicar.");
  return result;
}

export function generateSocialCaption(post: SocialSourcePost, format: SocialPostDraft["format"], includeCommentPrompt = false) {
  const title = `${post.information_status === "rumor" ? "RUMOR: " : ""}${post.title}`;
  return generateSocialCopys({ title, summary: post.summary, slug: post.slug, category: post.category || "breaking" }, { format: format === "carousel" ? "carousel" : "post", includeCommentPrompt }).instagram.caption;
}

export function applySocialDefaults(draft: SocialPostDraft, post: SocialSourcePost): SocialPostDraft {
  if (!draft || typeof draft.caption !== "string" || !Array.isArray(draft.slides)) return draft;
  const assets = socialPostAssets(post);
  let changed = false;
  let slides = draft.slides.map(slide => {
    if (!slide || typeof slide.imageUrl !== "string" || typeof slide.caption !== "string" || typeof slide.alt !== "string") return slide;
    const asset = assets.find(asset => asset.url === slide.imageUrl);
    if (!asset) return slide;
    const caption = !slide.caption.trim() || asset.caption.startsWith(`${slide.caption.trim()}\nOrigem:`) ? asset.caption : slide.caption;
    const alt = slide.alt.trim() ? slide.alt : asset.alt;
    if (caption === slide.caption && alt === slide.alt) return slide;
    changed = true;
    return { ...slide, caption, alt };
  });
  const textBlocks = parseEditorialBlocks(post.body).filter(block => block.type === "text");
  slides = slides.map(slide => {
    let original: string | undefined;
    let limit = 300;
    if (slide.kind === "cover") { original = post.summary; limit = 200; }
    else if (slide.kind === "content" && /^content-\d+$/.test(slide.id)) {
      const block = textBlocks[Number(slide.id.split("-")[1]) - 1];
      if (block) original = block.content.replace(/\*\*Fonte[s]?:\*\*[\s\S]*$/i, "").replace(/^#{2,3}\s+[^\n]+/gm, "").trim();
    }
    if (!original || slide.text !== excerpt(original, limit) || !slide.text.endsWith("…")) return slide;
    try {
      const text = summarizeSocialText(original, limit);
      changed = true;
      return { ...slide, text };
    } catch { return slide; }
  });
  const qualifier = post.information_status === "rumor" ? "RUMOR: " : "";
  const legacy = `${qualifier}${post.title}\n\n${post.summary}\n\n${draft.format === "carousel" ? "Deslize para entender. " : ""}Curta e siga a Orange Brick para acompanhar mais notícias de games.\n\nMatéria: /posts/${post.slug}\nCréditos das imagens: consulte as legendas dos slides.\n\n#OrangeBrick`;
  let caption = draft.caption.trim() === legacy.trim() ? generateSocialCaption(post, draft.format) : draft.caption;
  const tags = generateSocialCaption(post, draft.format).match(/#[\p{L}\p{N}_]+/gu) || [];
  caption = caption.replace(/^(?:#[\p{L}\p{N}_]+[ \t]*)+$/gmu, line => /#(?:Carrossel|NoticiasDeGames|Instagram)\b/i.test(line) ? tags.join(" ") : line);
  if (draft.format === "carousel") {
    const previous = socialCommentCta(draft.caption);
    const next = /(?:Comenta aí|Responda nos comentários):/i.test(draft.caption) ? socialCommentCta(draft.caption) : socialCommentCta(generateSocialCaption(post, draft.format, true));
    slides = slides.map(slide => {
      if (slide.kind !== "cta") return slide;
      const oldQuestion = draft.caption.match(/(?:Responda nos coment[aá]rios|Comenta aí):\s*([^\n]+)/i)?.[1]?.trim();
      const legacyCta = slide.title === "Curtiu? Deixa o like." && slide.text === "Segue a Orange Brick para acompanhar notícias de games com contexto." || slide.text === "Responda nos comentários." && (slide.title === oldQuestion || slide.title === "O que essa notícia muda para você?");
      const generatedCta = slide.title === previous.title && slide.text === previous.text || slide.text === "" && slide.title === socialCommentPrompt(oldQuestion || "O que essa notícia muda pra você?");
      if ((!legacyCta && !generatedCta) || (slide.title === next.title && slide.text === next.text)) return slide;
      changed = true;
      return { ...slide, ...next };
    });
  }
  caption = caption.replace(/^(?:Comenta a[ií]|Responda nos coment[aá]rios):[^\n]*\n*/gimu, "").replace(/\n{3,}/g, "\n\n").trim();
  if (caption !== draft.caption) changed = true;
  return changed ? { ...draft, caption, slides, savedAt: null } : draft;
}

export function socialCommentCta(caption: string) {
  const question = caption.match(/(?:Responda nos coment[aá]rios|Comenta aí):\s*([^\n]+)/i)?.[1]?.trim();
  const title = question && question.endsWith("?") && question.length <= 110 ? question[0].toLocaleUpperCase("pt-BR") + question.slice(1) : "O que essa notícia muda pra você?";
  return { title, text: "Comenta aí." };
}
