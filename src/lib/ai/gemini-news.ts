import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import type { Post, PostCategory } from "../types/database.ts";

const CATEGORY_TAGS: Record<PostCategory, string> = {
  breaking: "ðŸ’£ PlantÃ£o",
  hardware: "ðŸ› ï¸ Hard News",
  industry: "ðŸ“¡ Radar",
  modding: "ðŸ”§ Gambiarra",
  review: "ðŸŽ® Review",
  opinion: "ðŸ”¥ OpiniÃ£o",
};

export interface GeneratePostOptions {
  topic?: string;
  sourceUrl?: string;
  category?: PostCategory;
  authorName?: string;
}

export interface GeneratedDraftResult {
  post: Post;
  wordCount: number;
  sources: { name: string; url: string }[];
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY nÃ£o configurada. Adicione sua chave do Google AI Studio nas variÃ¡veis de ambiente.");
  }
  return new GoogleGenAI({ apiKey });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nÃ£o configurados.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

function countWords(blocks: Array<{ type: string; content?: string }>): number {
  let count = 0;
  for (const block of blocks) {
    if (block.type === "text" && block.content) {
      const words = block.content
        .replace(/[#*`_\[\]()]/g, " ")
        .trim()
        .split(/\s+/);
      count += words.filter(Boolean).length;
    }
  }
  return count;
}

function validateNoCorruptedCharacters(text: string) {
  if (/[\u4e00-\u9fff]/.test(text)) {
    throw new Error("Texto contÃ©m caracteres CJK (chinÃªs/japonÃªs/coreano) proibidos.");
  }
  if (/\\&(?:aacute|agrave|atilde|acirc|ccedil|eacute|ecirc|iacute|oacute|ocirc|otilde|uacute|uuml|quot|amp|apos|nbsp);/i.test(text)) {
    throw new Error("Texto contÃ©m entidades HTML corrompidas.");
  }
  if (/\uFFFD/.test(text)) {
    throw new Error("Texto contÃ©m caracteres corrompidos (replacement character).");
  }
}

const OFFICIAL_HARDWARE_ASSETS: Record<string, string[]> = {
  playstation: [
    "https://upload.wikimedia.org/wikipedia/commons/8/88/Immagine_Playstation_5.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/f/f4/PlayStation_5_and_DualSense_%282%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_5_and_DualSense.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/7/77/Black_and_white_Playstation_5_base_edition_with_controller.png",
  ],
  xbox: [
    "https://upload.wikimedia.org/wikipedia/commons/4/43/Xbox-Series-S-Set.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/e/eb/Xbox-Series-X-Set.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/2/2b/Microsoft-Xbox-One-Console-Set.jpg",
  ],
  nintendo: [
    "https://upload.wikimedia.org/wikipedia/commons/8/88/Nintendo-Switch-wJoyCons-BlRd-Standing-FL.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/5/5e/Nintendo_Switch_OLED_model.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/0/07/Nintendo-Switch-wJoyCons-BlRd-Handheld-FL.jpg",
  ],
  pc: [
    "https://upload.wikimedia.org/wikipedia/commons/a/a4/Custom-built_computer_with_GeForce_RTX_3080.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/30/NVIDIA_GeForce_RTX_4090_Founders_Edition.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/7/74/Custom_PC_with_transparent_side_panel.jpg",
  ],
};

function getHardwareFallback(subject: string): string[] {
  const s = subject.toLowerCase();
  if (s.includes("playstation") || s.includes("ps5") || s.includes("sony") || s.includes("dualsense")) {
    return OFFICIAL_HARDWARE_ASSETS.playstation;
  }
  if (s.includes("xbox") || s.includes("microsoft") || s.includes("game pass") || s.includes("series x") || s.includes("series s")) {
    return OFFICIAL_HARDWARE_ASSETS.xbox;
  }
  if (s.includes("nintendo") || s.includes("switch") || s.includes("mario") || s.includes("zelda")) {
    return OFFICIAL_HARDWARE_ASSETS.nintendo;
  }
  return OFFICIAL_HARDWARE_ASSETS.pc;
}

export async function fetchSteamGameImages(gameName: string): Promise<string[]> {
  try {
    const cleanName = gameName
      .replace(/^(CONFIRA|VEJA|NOVO|NOVA|REVELADO|ANUNCIADO|OFICIAL|DATA DE LANÃ‡AMENTO:?)\s+/i, "")
      .replace(/\s+(GANHA|RECEBE|TERÃ|CHEGA|Ã‰ ANUNCIADO|REVELA|CONFIRMA|ANUNCIA).*$/i, "")
      .replace(/[:\-].*$/, "")
      .trim();

    if (!cleanName || cleanName.length < 3) return [];

    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanName)}&l=english&cc=US`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!searchRes.ok) return [];
    const searchData = (await searchRes.json()) as { items?: Array<{ id: number; name: string }> };
    const firstItem = searchData.items?.[0];
    if (!firstItem || !firstItem.id) return [];

    const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${firstItem.id}&l=english`;
    const detailsRes = await fetch(detailsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!detailsRes.ok) return [];
    const detailsData = (await detailsRes.json()) as Record<string, { success: boolean; data?: { header_image?: string; screenshots?: Array<{ path_full?: string }> } }>;
    const appInfo = detailsData[String(firstItem.id)]?.data;
    if (!appInfo) return [];

    const results: string[] = [];
    if (appInfo.header_image) results.push(appInfo.header_image);
    if (Array.isArray(appInfo.screenshots)) {
      for (const ss of appInfo.screenshots) {
        if (ss.path_full) results.push(ss.path_full);
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function searchWikimediaImages(query: string): Promise<string[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|mime|dimensions&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "OrangeBrickEditorialBot/1.0 (contact@orangebrick.com.br)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    return pages
      .map((p: unknown) => {
        const page = p as { imageinfo?: Array<{ url?: string; mime?: string; width?: number }> };
        const info = page.imageinfo?.[0];
        if (!info || !info.url) return null;
        if (info.mime && !/^(image\/(jpeg|png|webp|jpg))$/i.test(info.mime)) return null;
        if (info.width && info.width < 500) return null;
        return info.url;
      })
      .filter((u): u is string => Boolean(u));
  } catch {
    return [];
  }
}

async function searchOpenverseImages(query: string): Promise<string[]> {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=6`;
    const res = await fetch(url, {
      headers: { "User-Agent": "OrangeBrickEditorialBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .map((r: { url?: string }) => r.url)
      .filter((u: unknown): u is string => typeof u === "string" && !/\.(svg|pdf|webm|mp4)$/i.test(u));
  } catch {
    return [];
  }
}

async function searchDuckDuckGoImages(query: string): Promise<string[]> {
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!tokenRes.ok) return [];
    const tokenHtml = await tokenRes.text();
    const vqdMatch = tokenHtml.match(/vqd=['"]([^'"]+)['"]/i) || tokenHtml.match(/vqd=([0-9-]+)/i);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,size:wallpaper,,,&p=1`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://duckduckgo.com/",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!apiRes.ok) return [];
    const data = (await apiRes.json()) as { results?: { image?: string }[] };
    return (data.results || [])
      .map((r) => r.image)
      .filter((u): u is string => typeof u === "string" && !/\.(svg|pdf|webm|mp4)$/i.test(u));
  } catch {
    return [];
  }
}

async function fetchMultiSourceCandidates(query: string, sourceImages: string[] = []): Promise<string[]> {
  const results: string[] = [...sourceImages];

  const steam = await fetchSteamGameImages(query);
  results.push(...steam);

  const [wiki, openverse, ddg] = await Promise.allSettled([
    searchWikimediaImages(query),
    searchOpenverseImages(query),
    searchDuckDuckGoImages(query),
  ]);

  if (wiki.status === "fulfilled") results.push(...wiki.value);
  if (openverse.status === "fulfilled") results.push(...openverse.value);
  if (ddg.status === "fulfilled") results.push(...ddg.value);

  const unique = [...new Set(results.filter((u): u is string => typeof u === "string" && Boolean(u)))];
  console.log(
    `[img] candidatos para "${query.slice(0, 60)}": steam=${steam.length} wiki=${wiki.status === "fulfilled" ? wiki.value.length : -1} openverse=${openverse.status === "fulfilled" ? openverse.value.length : -1} ddg=${ddg.status === "fulfilled" ? ddg.value.length : -1} total=${unique.length}`
  );
  return unique;
}

const MIN_IMAGE_WIDTH = 600;
const MIN_IMAGE_HEIGHT = 340;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function sniffImageContentType(buffer: Buffer, declared?: string | null): string | null {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (declared && /^image\/(jpeg|jpg|png|webp)$/i.test(declared)) {
    return declared.toLowerCase();
  }
  return null;
}

function readPixelDimensions(buffer: Buffer, contentType: string): { width: number; height: number } | null {
  try {
    if (contentType === "image/png" && buffer.length >= 24) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (contentType === "image/jpeg") {
      let off = 2;
      while (off + 9 < buffer.length) {
        if (buffer[off] !== 0xff) {
          off++;
          continue;
        }
        const marker = buffer[off + 1];
        const len = buffer.readUInt16BE(off + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buffer.readUInt16BE(off + 5), width: buffer.readUInt16BE(off + 7) };
        }
        off += 2 + len;
      }
      return null;
    }
    if (contentType === "image/webp" && buffer.length >= 30) {
      const chunk = buffer.toString("ascii", 12, 16);
      if (chunk === "VP8X") {
        return {
          width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
          height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
        };
      }
      if (chunk === "VP8 ") {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
      }
      if (chunk === "VP8L") {
        const bits = buffer.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function downloadImageForUpload(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[img] download falhou (HTTP ${res.status}): ${url.slice(0, 100)}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      console.warn(`[img] descartada por tamanho (${buffer.length} bytes): ${url.slice(0, 100)}`);
      return null;
    }
    const contentType = sniffImageContentType(buffer, res.headers.get("content-type"));
    if (!contentType) {
      console.warn(`[img] formato nÃ£o suportado (${declaredTypeLabel(res)}): ${url.slice(0, 100)}`);
      return null;
    }
    const dims = readPixelDimensions(buffer, contentType);
    if (!dims || dims.width < MIN_IMAGE_WIDTH || dims.height < MIN_IMAGE_HEIGHT) {
      console.warn(
        `[img] rejeitada por dimensÃ£o ${dims ? `${dims.width}x${dims.height}` : "ilegÃ­vel"}: ${url.slice(0, 100)}`
      );
      return null;
    }
    return { buffer, contentType };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[img] erro ao baixar ${url.slice(0, 100)}: ${msg.slice(0, 120)}`);
    return null;
  }
}

function declaredTypeLabel(res: Response): string {
  return res.headers.get("content-type") || "desconhecido";
}

async function uploadToSupabaseStorage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  postId: string,
  prefix: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `editorial/${postId}/${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("post-images").upload(filename, buffer, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("post-images").getPublicUrl(filename);
  const renderBase = data.publicUrl.replace("/object/public/", "/render/image/public/");
  return `${renderBase}?width=1920&height=1080&resize=cover&quality=82&format=webp`;
}

const EDITORIAL_SYSTEM_INSTRUCTION = `
VocÃª Ã© o editor-chefe do portal Orange Brick (portal brasileiro de notÃ­cias sobre videogames, lanÃ§amentos, hardware e cultura gamer).
Seu objetivo Ã© redigir matÃ©rias completas, aprofundadas, 100% autorais e envolventes sobre jogos, trailers, mecÃ¢nicas de gameplay e lanÃ§amentos.

DIRETRIZES EDITORIAIS E DE ESTRUTURA (ESTRITAMENTE OBRIGATÃ“RIAS):
1. IDENTIDADE E AUTORIA:
   - PseudÃ´nimo do autor: "The Brick"
   - Tag de autor: "Editor-Chefe"
   - Tom de voz: direto, Ã¡gil, tÃ©cnico e empolgante. Sem frases prontas clichÃªs de IA (evite "no vasto universo dos games", "uma reviravolta emocionante").
   - USO MODERADO DE NEGRITOS: use negrito apenas para termos ou dados realmente importantes de forma natural e humana. Nunca coloque negritos artificiais repetitivos em palavras soltas.

2. ESTRUTURA MODULAR DE BLOCOS:
   - Bloco 1 (IntroduÃ§Ã£o): Fato principal curto, objetivo e instigante nas primeiras 3 a 5 linhas.
   - Bloco 2 (Imagem 1): IlustraÃ§Ã£o de meio apÃ³s a introduÃ§Ã£o com legenda detalhada e coerente com a cena.
   - Bloco 3 (Desenvolvimento TÃ©cnico): Fatos, nÃºmeros, jogabilidade, mecÃ¢nicas, combate, histÃ³ria e detalhes do estÃºdio estruturados com subtÃ­tulo "## SubtÃ­tulo".
   - Bloco 4 (Imagem 2): IlustraÃ§Ã£o secundÃ¡ria (Ã¢ngulo complementar, cenÃ¡rio, chefe ou tecnologia) com legenda.
   - Bloco 5 (ConclusÃ£o e Debate): Encerramento do artigo com convite direto para os leitores debaterem nos comentÃ¡rios e reaÃ§Ãµes, seguido de linha divisÃ³ria "---" e atribuiÃ§Ã£o da fonte:
     "Fonte: [Nome do VeÃ­culo](https://link-da-fonte.com)"

3. COERÃŠNCIA E DIRETRIZES DE IMAGENS:
   - As imagens devem fazer pleno sentido com a notÃ­cia e OBRIGATORIAMENTE com a legenda descritiva.
   - ForneÃ§a termos de busca precisos em inglÃªs para capa, imagem 1 e imagem 2.
   - Capa: Arte oficial de divulgaÃ§Ã£o, Key Art 4K ou pÃ´ster oficial do jogo.
   - Imagem 1: Screenshot real de gameplay / combate / aÃ§Ã£o do jogo.
   - Imagem 2: Screenshot de cenÃ¡rio, chefe, vilÃ£o ou detalhe complementar do jogo.
   - Todas as 3 imagens devem ser distintas entre si.
   - As legendas devem terminar com "(Foto: DivulgaÃ§Ã£o/Oficial)" ou "(Imagem ilustrativa)".

4. IDIOMA E NOMES:
   - PortuguÃªs do Brasil (PT-BR) impecÃ¡vel.
   - Nomes de jogos e marcas SEMPRE no original em inglÃªs (ex: Phantom Blade Zero, Grand Theft Auto VI, Monster Hunter Wilds, Doom: The Dark Ages). NUNCA traduza nomes de jogos.
   - Datas e meses em portuguÃªs (ex: "27 de Agosto", "15 de Outubro").
   - NUNCA utilize caracteres CJK (chinÃªs/japonÃªs/coreano) nem entidades corrompidas.

5. SCHEMA JSON DE SAÃDA (RESPONDA EXCLUSIVAMENTE O JSON PURO):
{
  "title": "TÃTULO EM CAIXA ALTA COM GANCHO FORTE (MÃX 70 CARACTERES)",
  "summary": "Uma frase de ~140 caracteres: o que foi revelado sobre o jogo + por que importa.",
  "category": "breaking | hardware | industry | review | opinion",
  "source_name": "Nome da fonte original (ex: Gematsu, IGN, VGC, PlayStation Blog)",
  "source_url": "URL original da notÃ­cia",
  "cover_image_query": "Termo de busca em inglÃªs para a arte de capa/Key Art 4K (ex: 'The Witcher 4 official key art 4k')",
  "cover_alt": "Alt text descritivo da arte de capa para acessibilidade e SEO",
  "image_1_query": "Termo de busca em inglÃªs para screenshot de gameplay/combate (ex: 'The Witcher 4 gameplay combat screenshot')",
  "image_1_alt": "Alt text descrevendo a cena de gameplay",
  "image_1_caption": "Legenda descritiva conectada com a cena de aÃ§Ã£o. (Foto: DivulgaÃ§Ã£o/Oficial)",
  "image_2_query": "Termo de busca em inglÃªs para screenshot de cenÃ¡rio/mundo/boss (ex: 'The Witcher 4 environment world scenery')",
  "image_2_alt": "Alt text descrevendo o cenÃ¡rio ou chefe",
  "image_2_caption": "Legenda descritiva conectada com o mundo do jogo. (Foto: DivulgaÃ§Ã£o/Oficial)",
  "intro_text": "Texto da introduÃ§Ã£o (3 a 5 linhas)...",
  "development_text": "## SubtÃ­tulo Principal\\n\\nTexto de desenvolvimento tÃ©cnico com fatos, jogabilidade e detalhes...",
  "conclusion_text": "Texto de conclusÃ£o e debate com a comunidade...\\n\\n---\\n\\nFonte: [Nome](URL)"
}
`;

interface ScrapedArticleData {
  text: string;
  images: string[];
  finalUrl: string;
}

async function fetchNewsArticleData(url: string): Promise<ScrapedArticleData> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { text: "", images: [], finalUrl: url };
    const html = await res.text();
    const finalUrl = res.url || url;

    const images: string[] = [];

    const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1]) {
      images.push(ogMatch[1]);
    }

    const twMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i);
    if (twMatch && twMatch[1] && !images.includes(twMatch[1])) {
      images.push(twMatch[1]);
    }

    // impeccable-disable-next-line broken-image -- regex de extraÃ§Ã£o de URLs, nÃ£o Ã© elemento img renderizado
    const imgMatches = [...html.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))(?:\?[^"']*)?["'][^>]*>/gi)];
    for (const m of imgMatches) {
      const src = m[1];
      if (
        !images.includes(src) &&
        !/(logo|avatar|icon|badge|author|tracking|pixel|banner-ad|ads|sponsor|footer)/i.test(src)
      ) {
        images.push(src);
      }
    }

    const clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { text: clean.slice(0, 4500), images: images.slice(0, 10), finalUrl };
  } catch {
    return { text: "", images: [], finalUrl: url };
  }
}

const GAMING_FEEDS = [
  { name: "Gematsu", url: "https://www.gematsu.com/feed", lang: "en" },
  { name: "IGN Brasil", url: "https://br.ign.com/feed.xml", lang: "pt" },
  { name: "Eurogamer", url: "https://www.eurogamer.net/feed", lang: "en" },
  { name: "VGC", url: "https://www.videogameschronicle.com/feed/", lang: "en" },
  { name: "GameSpot", url: "https://www.gamespot.com/feeds/mashup/", lang: "en" },
  { name: "Push Square", url: "https://www.pushsquare.com/feeds/latest", lang: "en" },
  { name: "Pure Xbox", url: "https://www.purexbox.com/feeds/latest", lang: "en" },
  { name: "Nintendo Life", url: "https://www.nintendolife.com/feeds/latest", lang: "en" },
  { name: "Gematsu Google", url: "https://news.google.com/rss/search?q=site:gematsu.com+when:1d&hl=en-US&gl=US&ceid=US:en", lang: "en" },
  { name: "Google Games BR", url: "https://news.google.com/rss/search?q=(game+OR+jogo)+AND+(gameplay+OR+trailer+OR+anuncio+OR+lancamento+OR+revela)+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419", lang: "pt" },
];

const STOPWORDS_REGEX = /(deal|sale|discount|price|guide|walkthrough|promoÃ§Ã£o|desconto|podcast|where to buy|review:|opinions|analise|review)/i;

function scoreNewsItem(title: string, summary: string): number {
  let s = 0;
  const t = `${title} ${summary}`.toLowerCase();

  if (t.includes("gameplay")) s += 10;
  if (t.includes("trailer")) s += 8;
  if (t.includes("anuncia") || t.includes("announce")) s += 7;
  if (t.includes("revela") || t.includes("reveal")) s += 7;
  if (t.includes("demo") || t.includes("demonstraÃ§Ã£o")) s += 8;
  if (t.includes("remake") || t.includes("remaster")) s += 6;
  if (t.includes("release date") || t.includes("data de lanÃ§amento") || t.includes("lanÃ§a")) s += 6;
  if (t.includes("combate") || t.includes("combat") || t.includes("boss")) s += 5;
  if (t.includes("beta") || t.includes("closed beta")) s += 6;

  const HYPE_GAMES = [
    "phantom blade", "kingdom hearts", "fatal fury", "gta", "grand theft auto", "wolverine",
    "monster hunter", "elden ring", "death stranding", "resident evil", "silent hill",
    "metal gear", "witcher", "cyberpunk", "doom", "final fantasy", "zelda", "mario",
    "pokemon", "god of war", "ghost of yotei", "spider-man", "fortnite", "mortal shell",
    "diablo", "crimson desert", "borderlands", "fable", "halo", "metroid", "silksong",
    "dragon quest", "persona", "sega", "capcom", "square enix", "fromsoftware", "bandai namco",
    "playstation", "xbox", "nintendo switch"
  ];

  for (const game of HYPE_GAMES) {
    if (t.includes(game)) s += 10;
  }

  if (t.includes("quarterly") || t.includes("earnings") || t.includes("shareholder") || t.includes("relatÃ³rio financeiro")) s -= 8;
  if (STOPWORDS_REGEX.test(t)) s -= 12;

  return s;
}

export class NoFreshTopicError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "NoFreshTopicError";
  }
}

interface RecentPostContext {
  recentTitles: string[];
  recentSlugs: string[];
  recentSourceUrls: string[];
  recentSummaries: string[];
}

function normalizeTextForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEDUP_STOPWORDS = new Set([
  "anuncia", "anunciado", "revela", "revelado", "confirma", "confirmado", "oficial",
  "lancamento", "trailer", "gameplay", "update", "atualizacao", "novo", "nova",
  "novos", "novas", "jogo", "games", "gaming", "primeiro", "video", "videos",
  "para", "como", "sobre", "todos", "todas", "mais", "menos", "antes", "depois",
  "com", "sem", "que", "esta", "esse", "essa", "isso", "pelo", "pela", "das",
  "dos", "sera", "esta", "the", "and", "for", "with", "from", "this", "that",
  "new", "news", "gets", "has", "have", "will", "its", "are", "was", "were",
  "announced", "revealed", "confirmed", "release", "launch", "trailer", "update",
  "details", "first", "official", "game", "games", "video", "coming", "out",
  "leak", "leaked", "leaks", "rumor", "rumor", "report", "reports", "says",
  "show", "shows", "shown", "take", "look", "check", "here", "what", "when",
  "week", "month", "year", "today", "day", "best", "top", "vs", "via",
]);

function extractSignificantTokens(text: string): string[] {
  return [...new Set(
    normalizeTextForMatch(text)
      .split(" ")
      .filter((w) => w.length >= 3 && !DEDUP_STOPWORDS.has(w) && !/^\d+$/.test(w))
  )];
}

function countTokenOverlap(tokensA: string[], tokensB: string[]): number {
  const setB = new Set(tokensB);
  let matches = 0;
  for (const t of tokensA) {
    if (setB.has(t)) matches++;
  }
  return matches;
}

async function fetchRecentPostContext(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<RecentPostContext> {
  const titles: string[] = [];
  const slugs: string[] = [];
  const sourceUrls: string[] = [];
  const summaries: string[] = [];

  try {
    const { data: recentPosts, error } = await supabase
      .from("posts")
      .select("title, slug, editorial_sources, summary")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      console.error("Falha ao carregar contexto de posts recentes (dedup desligado):", error.message);
      return { recentTitles: [], recentSlugs: [], recentSourceUrls: [], recentSummaries: [] };
    }

    for (const p of recentPosts || []) {
      if (p.title) titles.push(p.title);
      if (p.slug) slugs.push(p.slug);
      if (p.summary) summaries.push(p.summary);
      if (Array.isArray(p.editorial_sources)) {
        for (const s of p.editorial_sources) {
          if (s && typeof s === "object" && "url" in s && typeof s.url === "string") {
            sourceUrls.push(s.url.toLowerCase().split("?")[0].replace(/\/$/, ""));
          }
        }
      }
    }
  } catch (err) {
    console.error("ExceÃ§Ã£o ao carregar contexto de posts recentes:", err);
  }

  return { recentTitles: titles, recentSlugs: slugs, recentSourceUrls: sourceUrls, recentSummaries: summaries };
}

function normalizeSourceUrl(url: string): string {
  return url.toLowerCase().split("?")[0].replace(/\/$/, "").replace(/^https?:\/\/(www\.)?/, "");
}

function isGoogleNewsRedirectUrl(url: string): boolean {
  return /news\.google\.com\/rss\/articles/i.test(url);
}

function isItemAlreadyCovered(item: { title: string; link: string; summary?: string }, context: RecentPostContext): boolean {
  const isGoogleNewsRedirect = /news\.google\.com\/rss\/articles/i.test(item.link);
  const cleanLink = normalizeSourceUrl(item.link);

  if (!isGoogleNewsRedirect && cleanLink.length > 20) {
    for (const u of context.recentSourceUrls) {
      if (u === cleanLink || cleanLink.includes(u) || u.includes(cleanLink)) {
        return true;
      }
    }
  }

  const itemTokens = extractSignificantTokens(`${item.title} ${item.summary || ""}`);
  if (itemTokens.length === 0) return false;

  for (let i = 0; i < context.recentTitles.length; i++) {
    const recentTokens = extractSignificantTokens(
      `${context.recentTitles[i]} ${context.recentSummaries[i] || ""}`
    );
    const overlap = countTokenOverlap(itemTokens, recentTokens);
    const smallerSet = Math.min(itemTokens.length, recentTokens.length) || 1;

    if (overlap >= 3 || (overlap >= 2 && overlap / smallerSet >= 0.4)) {
      return true;
    }
  }

  return false;
}

async function fetchTopDailyGamingNews(supabase: ReturnType<typeof getSupabaseAdmin>, context: RecentPostContext): Promise<{ title: string; link: string; summary: string } | null> {
  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1000;
  const items: { title: string; link: string; summary: string; score: number; pubDate: Date }[] = [];

  const feedResults = await Promise.allSettled(
    GAMING_FEEDS.map(async (src) => {
      const res = await fetch(src.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      const xml = await res.text();
      const parsed: { title: string; link: string; summary: string; score: number; pubDate: Date }[] = [];
      const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

      for (const match of itemMatches) {
        const block = match[1];
        const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
        const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

        if (titleMatch && linkMatch) {
          const rawDate = dateMatch ? new Date(dateMatch[1].trim()) : null;
          const pubDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate : new Date();
          const age = now - pubDate.getTime();

          if (age <= maxAgeMs && age >= -30 * 60 * 1000) {
            const title = titleMatch[1]
              .replace(/<[^>]+>/g, "")
              .replace(/\s*-\s*(Gematsu|IGN|VGC|Olhar Digital|TecMundo|Crunchyroll|Eurogamer|GameSpot|Push Square|Pure Xbox|Nintendo Life).*$/i, "")
              .trim();
            const link = linkMatch[1].replace(/<[^>]+>/g, "").trim();
            const summary = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
            const score = scoreNewsItem(title, summary);
            if (score > 0) {
              parsed.push({ title, link, summary, score, pubDate });
            }
          }
        }
      }
      return parsed;
    })
  );

  for (const r of feedResults) {
    if (r.status === "fulfilled") items.push(...r.value);
  }

  if (items.length === 0) return null;

  items.sort((a, b) => b.score - a.score || b.pubDate.getTime() - a.pubDate.getTime());

  let coveredCount = 0;
  for (const item of items) {
    if (isItemAlreadyCovered(item, context)) {
      coveredCount++;
      continue;
    }
    return item;
  }

  console.log(`Todas as ${coveredCount} pautas dos feeds jÃ¡ foram cobertas recentemente.`);
  return null;
}

const GROQ_MODEL_PREFERENCES = ["openai/gpt-oss-120b", "qwen/qwen3.6", "openai/gpt-oss-20b"];

async function callGroqEditorial(userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY nÃ£o configurada para o fallback.");
  }

  const candidates: string[] = [];
  try {
    const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (modelsRes.ok) {
      const data = (await modelsRes.json()) as { data?: Array<{ id: string }> };
      const ids = (data.data || [])
        .map((m) => m.id)
        .filter((id) => !/whisper|tts|orpheus|guard|embed|playai|compound/i.test(id));
      for (const pref of GROQ_MODEL_PREFERENCES) {
        const match = ids.find((id) => id.includes(pref));
        if (match && !candidates.includes(match)) {
          candidates.push(match);
        }
      }
      for (const id of ids) {
        if (!candidates.includes(id)) candidates.push(id);
      }
    }
  } catch {
    candidates.push(GROQ_MODEL_PREFERENCES[0]);
  }

  if (candidates.length === 0) {
    candidates.push(GROQ_MODEL_PREFERENCES[0]);
  }

  let lastErrorText = "";
  for (const model of candidates.slice(0, 3)) {
    for (const maxTokens of [5200, 3800]) {
      console.log(`Usando fallback Groq com modelo ${model} (max_tokens ${maxTokens}).`);
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: EDITORIAL_SYSTEM_INSTRUCTION },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(50000),
      });

      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content || "";
        if (!content.trim()) {
          lastErrorText = "resposta vazia do modelo";
          break;
        }
        return content;
      }

      lastErrorText = `HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 160)}`;
      console.error(`Groq ${model} (${maxTokens} tokens) falhou:`, lastErrorText);
      if (res.status === 413 || res.status === 429) {
        continue;
      }
      break;
    }
  }

  throw new Error(`Fallback Groq esgotou os modelos disponÃ­veis. Ãšltimo erro: ${lastErrorText}`);
}

export async function generateNewsDraft(options: GeneratePostOptions = {}): Promise<GeneratedDraftResult> {
  const gemini = getGeminiClient();
  const supabase = getSupabaseAdmin();
  const recentContext = await fetchRecentPostContext(supabase);

  let userPrompt = "";
  let sourceImages: string[] = [];
  let primarySourceUrl = options.sourceUrl || "";

  if (options.sourceUrl) {
    const articleData = await fetchNewsArticleData(options.sourceUrl);
    sourceImages = articleData.images;
    if (!isGoogleNewsRedirectUrl(options.sourceUrl)) {
      primarySourceUrl = articleData.finalUrl;
    }
    userPrompt = `Apure e rediga uma matÃ©ria jornalÃ­stica completa para o Orange Brick baseada nesta notÃ­cia:\nURL: ${primarySourceUrl}\nConteÃºdo da fonte:\n${articleData.text || options.sourceUrl}`;
  } else if (options.topic) {
    userPrompt = `Pesquise a fundo e redija uma matÃ©ria jornalÃ­stica completa para o Orange Brick sobre o seguinte tema:\n"${options.topic}".`;
  } else {
    const topNews = await fetchTopDailyGamingNews(supabase, recentContext);
    if (topNews) {
      const articleData = await fetchNewsArticleData(topNews.link);
      sourceImages = articleData.images;
      primarySourceUrl = isGoogleNewsRedirectUrl(topNews.link) ? topNews.link : articleData.finalUrl;
      userPrompt = `Apure e redija a matÃ©ria do dia para o Orange Brick baseada na principal notÃ­cia das fontes:\nTÃ­tulo original: ${topNews.title}\nFonte: ${primarySourceUrl}\nResumo/ConteÃºdo:\n${articleData.text || topNews.summary}`;
    } else {
      throw new NoFreshTopicError(
        "Nenhuma pauta inÃ©dita encontrada nos feeds nas Ãºltimas 24h (todas jÃ¡ cobertas pelo portal)."
      );
    }
  }

  if (options.category) {
    userPrompt += ` A categoria desejada Ã© '${options.category}'.`;
  }

  if (recentContext.recentTitles.length > 0) {
    const excludedList = recentContext.recentTitles.slice(0, 15).map((t) => `- ${t}`).join("\n");
    userPrompt += `\n\nIMPORTANTE (NÃƒO REPETIR TEMAS RECENTES): O portal jÃ¡ publicou recentemente os seguintes assuntos abaixo. NÃƒO repita nem cubra novamente os mesmos fatos destes tÃ­tulos:\n${excludedList}`;
  }

  userPrompt += `\n\nREQUISITOS DE EXTENSÃƒO E PROFUNDIDADE (OBRIGATÃ“RIOS â€” respostas curtas sÃ£o rejeitadas pela editoria):
- intro_text + development_text + conclusion_text juntos devem totalizar ENTRE 750 E 1.000 PALAVRAS. Abaixo disso o rascunho Ã© descartado.
- intro_text: no mÃ­nimo 80 palavras, diretas ao fato principal e por que ele importa.
- development_text: NO MÃNIMO 3 seÃ§Ãµes com subtÃ­tulos "## ", cada uma com pelo menos 150 palavras cobrindo fatos, dados concretos, nÃºmeros, datas, plataformas, contexto de mercado e impacto para o leitor.
- Se o material fornecido contiver declaraÃ§Ã£o pÃºblica de executivo, desenvolvedor ou porta-voz, traduza com fidelidade e cite entre aspas, indicando quem falou, cargo e onde foi dito.
- conclusion_text: no mÃ­nimo 100 palavras, com fechamento analÃ­tico seguido de convite direto ao debate nos comentÃ¡rios, linha "---" e atribuiÃ§Ã£o "**Fonte:** [Nome](URL)".
- NÃƒO invente citaÃ§Ãµes nem nÃºmeros que nÃ£o estejam no material fornecido ou em conhecimento pÃºblico consolidado.`;

  const candidateModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
  let responseText = "";
  const geminiErrors: string[] = [];

  for (const modelName of candidateModels) {
    try {
      const useSearch = /^gemini-(2|3)/.test(modelName);
      const response = await gemini.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION,
          temperature: 0.3,
          ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });
      if (response.text) {
        responseText = response.text;
        break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      geminiErrors.push(`${modelName}: ${msg.slice(0, 160)}`);
      console.error(`Modelo ${modelName} falhou:`, msg);
      continue;
    }
  }

  if (!responseText) {
    console.warn("Todos os modelos Gemini falharam. Acionando fallback Groq.", geminiErrors.join(" | "));
    responseText = await callGroqEditorial(userPrompt);
  }

  let jsonString = responseText.trim();
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  interface EditorialGeminiOutput {
    title?: string;
    summary?: string;
    category?: string;
    source_name?: string;
    source_url?: string;
    cover_image_query?: string;
    cover_alt?: string;
    image_1_query?: string;
    image_1_alt?: string;
    image_1_caption?: string;
    image_2_query?: string;
    image_2_alt?: string;
    image_2_caption?: string;
    intro_text?: string;
    development_text?: string;
    conclusion_text?: string;
  }

  let parsed: EditorialGeminiOutput;
  try {
    parsed = JSON.parse(jsonString) as EditorialGeminiOutput;
  } catch {
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(jsonString.slice(firstBrace, lastBrace + 1)) as EditorialGeminiOutput;
      } catch (err2) {
        throw new Error(`Falha ao decodificar resposta do Gemini: ${err2 instanceof Error ? err2.message : String(err2)}\nResposta bruta: ${responseText.slice(0, 300)}`);
      }
    } else {
      throw new Error(`Resposta do Gemini sem JSON vÃ¡lido.\nResposta bruta: ${responseText.slice(0, 300)}`);
    }
  }

  const rawTitle = (parsed.title || "NOTÃCIA ORANGE BRICK").replace(/\*\*/g, "").trim().toUpperCase();
  const summary = (parsed.summary || "").trim();
  const category: PostCategory = parsed.category && CATEGORY_TAGS[parsed.category as PostCategory]
    ? (parsed.category as PostCategory)
    : "industry";
  const authorName = options.authorName || "The Brick";
  const authorTag = "Editor-Chefe";
  let slug = buildSlug(rawTitle);
  const { data: existingPost } = await supabase.from("posts").select("id, slug").eq("slug", slug).maybeSingle();
  if (existingPost) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  validateNoCorruptedCharacters(rawTitle);
  validateNoCorruptedCharacters(summary);
  validateNoCorruptedCharacters(parsed.intro_text || "");
  validateNoCorruptedCharacters(parsed.development_text || "");
  validateNoCorruptedCharacters(parsed.conclusion_text || "");

  const generatedText = `${rawTitle} ${summary}`;
  const generatedTokens = extractSignificantTokens(generatedText);
  for (let i = 0; i < recentContext.recentTitles.length; i++) {
    const recentTokens = extractSignificantTokens(
      `${recentContext.recentTitles[i]} ${recentContext.recentSummaries[i] || ""}`
    );
    const overlap = countTokenOverlap(generatedTokens, recentTokens);
    const smallerSet = Math.min(generatedTokens.length, recentTokens.length) || 1;
    if (overlap >= 3 || (overlap >= 2 && overlap / smallerSet >= 0.4)) {
      throw new NoFreshTopicError(
        `Rascunho descartado: o tema jÃ¡ foi coberto pela matÃ©ria recente "${recentContext.recentTitles[i]}".`
      );
    }
  }

  const newPostId = crypto.randomUUID();

  const cleanSubject = rawTitle
    .replace(/^(CONFIRA|VEJA|NOVO|NOVA|REVELADO|ANUNCIADO|OFICIAL|DATA DE LANÃ‡AMENTO:?)\s+/i, "")
    .replace(/\s+(GANHA|RECEBE|TERÃ|CHEGA|Ã‰ ANUNCIADO|REVELA|CONFIRMA|ANUNCIA).*$/i, "")
    .trim();

  const coverQueries: string[] = [
    parsed.cover_image_query,
    `${cleanSubject} official game cover art`,
    `${cleanSubject} official key art 4k`,
    cleanSubject,
  ].filter((q): q is string => Boolean(q));

  const img1Queries: string[] = [
    parsed.image_1_query,
    `${cleanSubject} gameplay screenshot`,
    `${cleanSubject} action combat`,
    `${cleanSubject} screenshot`,
  ].filter((q): q is string => Boolean(q));

  const img2Queries: string[] = [
    parsed.image_2_query,
    `${cleanSubject} environment world scenery`,
    `${cleanSubject} boss cinematic scene`,
    `${cleanSubject} character trailer`,
  ].filter((q): q is string => Boolean(q));

  const usedImageUrls = new Set<string>();
  const fallbackPool = getHardwareFallback(cleanSubject);

  async function findAndUpload(queries: string[], prefix: string, fallbackIndex: number, extraSources: string[] = []): Promise<string> {
    for (const url of extraSources) {
      if (usedImageUrls.has(url)) continue;
      const processed = await downloadImageForUpload(url);
      if (processed) {
        try {
          const uploadedUrl = await uploadToSupabaseStorage(supabase, newPostId, prefix, processed.buffer, processed.contentType);
          usedImageUrls.add(url);
          return uploadedUrl;
        } catch {
          continue;
        }
      }
    }

    for (const q of queries) {
      const candidates = await fetchMultiSourceCandidates(q, sourceImages);
      for (const url of candidates) {
        if (usedImageUrls.has(url)) continue;
        const processed = await downloadImageForUpload(url);
        if (processed) {
          try {
            const uploadedUrl = await uploadToSupabaseStorage(supabase, newPostId, prefix, processed.buffer, processed.contentType);
            usedImageUrls.add(url);
            return uploadedUrl;
          } catch {
            continue;
          }
        }
      }
    }

    for (let i = 0; i < fallbackPool.length; i++) {
      const idx = (fallbackIndex + i) % fallbackPool.length;
      const url = fallbackPool[idx];
      if (usedImageUrls.has(url)) continue;
      const processed = await downloadImageForUpload(url);
      if (processed) {
        try {
          const uploadedUrl = await uploadToSupabaseStorage(supabase, newPostId, prefix, processed.buffer, processed.contentType);
          usedImageUrls.add(url);
          return uploadedUrl;
        } catch {
          continue;
        }
      }
    }

    return "";
  }

  const [coverUrl, img1Url, img2Url] = await Promise.all([
    findAndUpload(coverQueries, "cover", 0, sourceImages.slice(0, 1)),
    findAndUpload(img1Queries, "body-1", 1, sourceImages.slice(1, 2)),
    findAndUpload(img2Queries, "body-2", 2, sourceImages.slice(2, 4)),
  ]);

  console.log(
    `[img] resultado final do post ${newPostId}: capa=${coverUrl ? "ok" : "VAZIA"} corpo1=${img1Url ? "ok" : "VAZIA"} corpo2=${img2Url ? "ok" : "VAZIA"}`
  );

  const introText = (parsed.intro_text || "").trim();
  const devText = (parsed.development_text || "").trim();
  const conclusionText = (parsed.conclusion_text || "").trim();

  const blocks: Array<{ id: string; type: string; content?: string; url?: string; alt?: string; caption?: string }> = [
    {
      id: "block-0",
      type: "text",
      content: introText,
    },
  ];

  if (img1Url) {
    blocks.push({
      id: `block-${blocks.length}`,
      type: "image",
      url: img1Url,
      alt: parsed.image_1_alt || `${rawTitle} - Gameplay e AÃ§Ã£o`,
      caption: parsed.image_1_caption || `Cena de aÃ§Ã£o e jogabilidade. (Foto: DivulgaÃ§Ã£o/Oficial)`,
    });
  }

  blocks.push({
    id: `block-${blocks.length}`,
    type: "text",
    content: devText,
  });

  if (img2Url) {
    blocks.push({
      id: `block-${blocks.length}`,
      type: "image",
      url: img2Url,
      alt: parsed.image_2_alt || `${rawTitle} - Detalhes e AmbientaÃ§Ã£o`,
      caption: parsed.image_2_caption || `AmbientaÃ§Ã£o e detalhes visuais. (Foto: DivulgaÃ§Ã£o/Oficial)`,
    });
  }

  blocks.push({
    id: `block-${blocks.length}`,
    type: "text",
    content: conclusionText,
  });

  const sourceName = parsed.source_name || "Fonte PrimÃ¡ria";
  const sourceUrl = parsed.source_url && !isGoogleNewsRedirectUrl(parsed.source_url)
    ? parsed.source_url
    : (primarySourceUrl || "https://orange-brick.vercel.app");
  const sources = [{ name: sourceName, url: sourceUrl }];

  const now = new Date().toISOString();
  const { data: insertedPost, error: insertError } = await supabase
    .from("posts")
    .insert([
      {
        id: newPostId,
        slug,
        title: rawTitle,
        summary,
        body: JSON.stringify(blocks),
        category,
        image_url: coverUrl,
        image_alt: parsed.cover_alt || rawTitle,
        author_name: authorName,
        author_tag: authorTag,
        is_published: false,
        published_at: null,
        created_at: now,
        updated_at: now,
        information_status: "confirmed",
        featured_quote: null,
        editorial_sources: sources,
        correction_note: null,
      },
    ])
    .select("*")
    .single();

  if (insertError || !insertedPost) {
    throw new Error(`Erro ao salvar post no Supabase: ${insertError?.message || "Registro nÃ£o retornado"}`);
  }

  const wordCount = countWords(blocks);

  return {
    post: insertedPost as Post,
    wordCount,
    sources,
  };
}

export async function fixPostImages(target?: string): Promise<Post[]> {
  const supabase = getSupabaseAdmin();
  let postsToFix: Post[] = [];

  if (target && target.toLowerCase() !== "todas" && target.toLowerCase() !== "all" && target.toLowerCase() !== "ultimo" && target.toLowerCase() !== "recent") {
    const { data: byIdOrSlug } = await supabase
      .from("posts")
      .select("*")
      .or(`id.eq.${target},slug.eq.${target},title.ilike.%${target}%`)
      .limit(1);
    if (byIdOrSlug && byIdOrSlug.length > 0) {
      postsToFix = byIdOrSlug as Post[];
    }
  } else if (target && (target.toLowerCase() === "todas" || target.toLowerCase() === "all")) {
    const { data: allDrafts } = await supabase
      .from("posts")
      .select("*")
      .or("image_url.is.null,image_url.eq.''")
      .order("created_at", { ascending: false })
      .limit(10);
    if (allDrafts && allDrafts.length > 0) {
      postsToFix = allDrafts as Post[];
    }
  } else {
    const { data: latest } = await supabase
      .from("posts")
      .select("*")
      .or("image_url.is.null,image_url.eq.''")
      .order("created_at", { ascending: false })
      .limit(1);
    if (latest && latest.length > 0) {
      postsToFix = latest as Post[];
    } else {
      const { data: anyLatest } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      if (anyLatest && anyLatest.length > 0) {
        postsToFix = anyLatest as Post[];
      }
    }
  }

  if (postsToFix.length === 0) {
    return [];
  }

  const updatedPosts: Post[] = [];

  for (const post of postsToFix) {
    const cleanSubject = post.title
      .replace(/^(CONFIRA|VEJA|NOVO|NOVA|REVELADO|ANUNCIADO|OFICIAL|DATA DE LANÃ‡AMENTO:?)\s+/i, "")
      .replace(/\s+(GANHA|RECEBE|TERÃ|CHEGA|Ã‰ ANUNCIADO|REVELA|CONFIRMA|ANUNCIA).*$/i, "")
      .trim();

    const coverQueries = [
      `${cleanSubject} official game cover art`,
      `${cleanSubject} official key art 4k`,
      cleanSubject,
    ];
    const img1Queries = [
      `${cleanSubject} gameplay screenshot`,
      `${cleanSubject} action combat`,
      `${cleanSubject} screenshot`,
    ];
    const img2Queries = [
      `${cleanSubject} environment world scenery`,
      `${cleanSubject} boss cinematic scene`,
      `${cleanSubject} character trailer`,
    ];

    const usedImageUrls = new Set<string>();
    const fallbackPool = getHardwareFallback(cleanSubject);

    async function findAndUploadSingle(queries: string[], prefix: string, fallbackIndex: number): Promise<string> {
      for (const q of queries) {
        const candidates = await fetchMultiSourceCandidates(q);
        for (const url of candidates) {
          if (usedImageUrls.has(url)) continue;
          const processed = await downloadImageForUpload(url);
          if (processed) {
            try {
              const uploadedUrl = await uploadToSupabaseStorage(supabase, post.id, prefix, processed.buffer, processed.contentType);
              usedImageUrls.add(url);
              return uploadedUrl;
            } catch {
              continue;
            }
          }
        }
      }

      for (let i = 0; i < fallbackPool.length; i++) {
        const idx = (fallbackIndex + i) % fallbackPool.length;
        const url = fallbackPool[idx];
        if (usedImageUrls.has(url)) continue;
        const processed = await downloadImageForUpload(url);
        if (processed) {
          try {
            const uploadedUrl = await uploadToSupabaseStorage(supabase, post.id, prefix, processed.buffer, processed.contentType);
            usedImageUrls.add(url);
            return uploadedUrl;
          } catch {
            continue;
          }
        }
      }

      return "";
    }

    const [coverUrl, img1Url, img2Url] = await Promise.all([
      findAndUploadSingle(coverQueries, "cover", 0),
      findAndUploadSingle(img1Queries, "body-1", 1),
      findAndUploadSingle(img2Queries, "body-2", 2),
    ]);

    let parsedBlocks: Array<{ id?: string; type: string; content?: string; url?: string; alt?: string; caption?: string }> = [];
    try {
      parsedBlocks = typeof post.body === "string" ? JSON.parse(post.body) : post.body || [];
    } catch {
      parsedBlocks = [];
    }

    const textBlocks = parsedBlocks.filter((b) => b.type === "text");
    const introText = textBlocks[0]?.content || post.summary || "";
    const devText = textBlocks[1]?.content || `## Detalhes e Novidades de ${cleanSubject}\n\nA matÃ©ria foi atualizada com detalhes completos e novas imagens oficiais de jogabilidade.`;
    const conclusionText = textBlocks[2]?.content || textBlocks[textBlocks.length - 1]?.content || `O que vocÃª achou dessa novidade? Participe do debate deixando sua opiniÃ£o nos comentÃ¡rios abaixo!\n\n---\n\nFonte: [Orange Brick News](https://orange-brick.vercel.app)`;

    const newBlocks: Array<{ id: string; type: string; content?: string; url?: string; alt?: string; caption?: string }> = [
      {
        id: "block-0",
        type: "text",
        content: introText,
      },
    ];

    if (img1Url) {
      newBlocks.push({
        id: `block-${newBlocks.length}`,
        type: "image",
        url: img1Url,
        alt: `${post.title} - Gameplay e AÃ§Ã£o`,
        caption: `Cena de aÃ§Ã£o e jogabilidade. (Foto: DivulgaÃ§Ã£o/Oficial)`,
      });
    }

    newBlocks.push({
      id: `block-${newBlocks.length}`,
      type: "text",
      content: devText,
    });

    if (img2Url) {
      newBlocks.push({
        id: `block-${newBlocks.length}`,
        type: "image",
        url: img2Url,
        alt: `${post.title} - Detalhes e AmbientaÃ§Ã£o`,
        caption: `AmbientaÃ§Ã£o e detalhes visuais. (Foto: DivulgaÃ§Ã£o/Oficial)`,
      });
    }

    newBlocks.push({
      id: `block-${newBlocks.length}`,
      type: "text",
      content: conclusionText,
    });

    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("posts")
      .update({
        image_url: coverUrl,
        image_alt: `${post.title} - Arte Oficial`,
        body: JSON.stringify(newBlocks),
        updated_at: now,
      })
      .eq("id", post.id)
      .select("*")
      .single();

    if (!error && updated) {
      updatedPosts.push(updated as Post);
    }
  }

  return updatedPosts;
}
