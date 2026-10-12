import { parseEditorialBlocks } from "../content-validation.ts";
import { createHash } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isVerifiedEditorialImageEvidenceUrl } from "../ai/editorial-images.ts";
import { isGenericOrProhibitedImage, validateCoverRelevance } from "../editorial-cover.ts";
import { getSiteUrl } from "../site-url.ts";
import { fetchValidatedRemote, readResponseBuffer } from "./network.ts";
import type { Post } from "../types/database.ts";

export type ImagePublicationPost = Pick<Post, "id" | "title" | "summary" | "body" | "image_url" | "image_alt">;
type Asset = { url: string; alt: string; caption: string; cover: boolean };
type Registry = { public_url: string; source_url: string; content_sha256?: string | null; width?: number; height?: number };
type Probe = { width: number; height: number; sha256: string };

export function publicationImageAssets(post: ImagePublicationPost): Asset[] {
  const images = parseEditorialBlocks(post.body).filter((item) => item.type === "image");
  return [
    { url: post.image_url?.trim() || "", alt: post.image_alt?.trim() || "", caption: "", cover: true },
    ...images.map((image): Asset => ({ url: typeof image.url === "string" ? image.url.trim() : "", alt: typeof image.alt === "string" ? image.alt.trim() : "", caption: typeof image.caption === "string" ? image.caption.trim() : "", cover: false })),
  ];
}

export function publicationImageBlockers(post: ImagePublicationPost): string[] {
  const assets = publicationImageAssets(post);
  const errors: string[] = [];
  if (!assets[0].url) errors.push("A capa da notícia é obrigatória.");
  if (assets.length < 3) errors.push("A notícia precisa de pelo menos duas imagens internas distintas.");
  for (const [index, asset] of assets.entries()) {
    const label = asset.cover ? "Capa" : `Imagem interna ${index}`;
    try {
      const parsed = new URL(asset.url, getSiteUrl());
      if ((!/^https:\/\//i.test(asset.url) && !/^\/[^/]/.test(asset.url)) || parsed.username || parsed.password || /[\s\\]/.test(asset.url)) throw new Error();
    } catch { errors.push(`${label}: URL de imagem inválida.`); }
    if (asset.alt.length < 20 || (!asset.cover && asset.caption.length < 20)) errors.push(`${label}: informe texto alternativo e legenda específicos.`);
    if (isGenericOrProhibitedImage(`${asset.url} ${asset.alt} ${asset.caption}`)) errors.push(`${label}: imagem genérica ou proibida pelas regras editoriais.`);
  }
  if (new Set(assets.map((asset) => asset.url)).size !== assets.length) errors.push("A capa e as imagens internas não podem repetir a mesma imagem.");
  if (assets[0].url && assets[0].alt && !validateCoverRelevance({ title: post.title, summary: post.summary }, { url: assets[0].url, alt: assets[0].alt }).relevant) errors.push("A capa precisa identificar o assunto da notícia e corresponder ao título e ao resumo.");
  return [...new Set(errors)];
}

async function probeImage(url: string, timeoutMs = 10_000): Promise<Probe> {
  const response = await fetchValidatedRemote(url, { httpsOnly: true, signal: AbortSignal.timeout(timeoutMs) });
  if (response.status !== 200 || !/^image\/(?:jpeg|png|webp|avif)(?:;|$)/i.test(response.headers.get("content-type") || "")) throw new Error("Imagem indisponível");
  const buffer = await readResponseBuffer(response, 8 * 1024 * 1024);
  const metadata = await sharp(buffer, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
  return { width: metadata.width || 0, height: metadata.height || 0, sha256: createHash("sha256").update(buffer).digest("hex") };
}

export async function inspectPublicationImages(
  posts: ImagePublicationPost[],
  registry: Registry[],
  recentPosts: ImagePublicationPost[],
  probe: (url: string) => Promise<Probe> = probeImage,
): Promise<Map<string, string[]>> {
  const registryByUrl = new Map(registry.map((row) => [row.public_url, row]));
  const recentUrls = new Set(recentPosts.filter((post) => !posts.some((item) => item.id === post.id)).flatMap((post) => publicationImageAssets(post).map((asset) => asset.url)));
  const recentHashes = new Set([...recentUrls].map((url) => registryByUrl.get(url)?.content_sha256).filter(Boolean));
  const seen = new Map<string, string>();
  const cached = new Map<string, Promise<Probe>>();
  const waiting: Array<() => void> = [];
  let active = 0;
  const deadline = Date.now() + 35_000;
  const limitedProbe = async (url: string) => {
    if (active >= 4) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try { if (Date.now() > deadline) throw new Error("Verificação expirou"); return await (probe === probeImage ? probeImage(url, Math.max(1, Math.min(10_000, deadline - Date.now()))) : probe(url)); }
    finally { active--; waiting.shift()?.(); }
  };
  const entries = await Promise.all(posts.map(async (post) => {
    const errors = publicationImageBlockers(post);
    const hashes: string[] = [];
    if (errors.length) return { post, errors, hashes };
    await Promise.all(publicationImageAssets(post).map(async (asset, index) => {
      const label = asset.cover ? "Capa" : `Imagem interna ${index}`;
      const record = registryByUrl.get(asset.url);
      if (/(?:header|capsule_\d+x\d+|library_\d+x\d+)\.(?:jpg|png|webp)(?:[?#]|$)/i.test(record?.source_url || asset.url) || !isVerifiedEditorialImageEvidenceUrl(record?.source_url || asset.url)) { errors.push(`${label}: falta uma origem editorial oficial ou confiável verificada.`); return; }
      if (record && typeof record.width === "number" && typeof record.height === "number" && (record.width < 1200 || record.height < 675)) errors.push(`${label}: a imagem original registrada não atende à resolução mínima de 1200 × 675.`);
      if (recentUrls.has(asset.url) || (record?.content_sha256 && recentHashes.has(record.content_sha256))) errors.push(`${label}: esta imagem já foi usada em outra notícia recente.`);
      try {
        const url = new URL(asset.url, getSiteUrl()).href;
        if (!cached.has(url)) cached.set(url, limitedProbe(url));
        const image = await cached.get(url)!;
        if (image.width < 1200 || image.height < 675 || Math.abs(image.width / image.height - 16 / 9) > 0.02) errors.push(`${label}: use uma imagem 16:9 de pelo menos 1200 × 675 pixels.`);
        hashes.push(image.sha256);
        if (record?.content_sha256) hashes.push(`registry:${record.content_sha256}`);
      } catch { errors.push(`${label}: não foi possível confirmar HTTP 200, arquivo de imagem e dimensões. Corrija a imagem ou tente novamente.`); }
    }));
    if (new Set(hashes).size !== hashes.length) errors.push("A capa e as imagens internas repetem o mesmo arquivo.");
    return { post, errors, hashes };
  }));
  return new Map(entries.map(({ post, errors, hashes }) => {
    for (const hash of hashes) {
      const previous = seen.get(hash);
      if (previous && previous !== post.id) errors.push("Uma imagem já está sendo usada por outra matéria deste lote.");
      seen.set(hash, post.id);
    }
    return [post.id, [...new Set(errors)]];
  }));
}

export async function inspectPublicationImagesInDatabase(posts: ImagePublicationPost[], client: SupabaseClient): Promise<Map<string, string[]>> {
  const { data: recent, error: recentError } = await client.from("posts").select("id,title,summary,body,image_url,image_alt").eq("is_published", true).gte("published_at", new Date(Date.now() - 14 * 86400_000).toISOString()).limit(500).abortSignal(AbortSignal.timeout(5_000));
  if (recentError) return new Map(posts.map((post) => [post.id, ["Não foi possível conferir a reutilização de imagens em notícias recentes."]]));
  const recentPosts = (recent || []) as ImagePublicationPost[];
  const urls = [...new Set([...posts, ...recentPosts].flatMap((post) => publicationImageAssets(post).map((asset) => asset.url)).filter(Boolean))];
  const chunks: string[][] = [];
  let chunk: string[] = [];
  let length = 0;
  for (const url of urls) {
    const size = encodeURIComponent(url).length + 4;
    if (chunk.length && length + size > 6000) { chunks.push(chunk); chunk = []; length = 0; }
    chunk.push(url); length += size;
  }
  if (chunk.length) chunks.push(chunk);
  const registry: Registry[] = [];
  const signal = AbortSignal.timeout(15_000);
  let cursor = 0;
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(4, chunks.length) }, async () => {
    while (cursor < chunks.length && !failed) {
      const urls = chunks[cursor++];
      const { data, error } = await client.from("editorial_images").select("public_url,source_url,content_sha256,width,height").in("public_url", urls).abortSignal(signal);
      if (error) failed = true;
      else registry.push(...((data || []) as Registry[]));
    }
  }));
  if (failed) return new Map(posts.map((post) => [post.id, ["Não foi possível verificar a origem das imagens na biblioteca editorial."]]));
  return inspectPublicationImages(posts, registry, recentPosts);
}
