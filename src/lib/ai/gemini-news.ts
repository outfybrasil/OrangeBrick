import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import crypto from "node:crypto";
import type { Post, PostCategory } from "../types/database.ts";

const CATEGORY_TAGS: Record<PostCategory, string> = {
  breaking: "💣 Plantão",
  hardware: "🛠️ Hard News",
  industry: "📡 Radar",
  modding: "🔧 Gambiarra",
  review: "🎮 Review",
  opinion: "🔥 Opinião",
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
    throw new Error("GEMINI_API_KEY não configurada. Adicione sua chave do Google AI Studio nas variáveis de ambiente.");
  }
  return new GoogleGenAI({ apiKey });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
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
    throw new Error("Texto contém caracteres CJK (chinês/japonês/coreano) proibidos.");
  }
  if (/\\&(?:aacute|agrave|atilde|acirc|ccedil|eacute|ecirc|iacute|oacute|ocirc|otilde|uacute|uuml|quot|amp|apos|nbsp);/i.test(text)) {
    throw new Error("Texto contém entidades HTML corrompidas.");
  }
  if (/\uFFFD/.test(text)) {
    throw new Error("Texto contém caracteres corrompidos (replacement character).");
  }
}

const CURATED_GAMING_ASSETS: Record<string, string[]> = {
  playstation: [
    "https://upload.wikimedia.org/wikipedia/commons/8/88/Immagine_Playstation_5.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/f/f4/PlayStation_5_and_DualSense_%282%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_5_and_DualSense.jpg",
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=80",
  ],
  xbox: [
    "https://upload.wikimedia.org/wikipedia/commons/4/43/Xbox-Series-S-Set.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/e/eb/Xbox-Series-X-Set.jpg",
    "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=1920&q=80",
  ],
  nintendo: [
    "https://upload.wikimedia.org/wikipedia/commons/8/88/Nintendo-Switch-wJoyCons-BlRd-Standing-FL.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/5/5e/Nintendo_Switch_OLED_model.jpg",
    "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1612287232230-08f376cf7446?auto=format&fit=crop&w=1920&q=80",
  ],
  pc: [
    "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80",
  ],
  action: [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1552824722-ddab1374e622?auto=format&fit=crop&w=1920&q=80",
  ],
  future: [
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
  ],
};

function getCuratedGamingFallback(subject: string): string[] {
  const s = subject.toLowerCase();
  if (s.includes("playstation") || s.includes("ps5") || s.includes("sony") || s.includes("dual")) {
    return CURATED_GAMING_ASSETS.playstation;
  }
  if (s.includes("xbox") || s.includes("microsoft") || s.includes("game pass") || s.includes("series x")) {
    return CURATED_GAMING_ASSETS.xbox;
  }
  if (s.includes("nintendo") || s.includes("switch") || s.includes("mario") || s.includes("zelda")) {
    return CURATED_GAMING_ASSETS.nintendo;
  }
  if (s.includes("pc") || s.includes("nvidia") || s.includes("rtx") || s.includes("hardware") || s.includes("geforce")) {
    return CURATED_GAMING_ASSETS.pc;
  }
  if (s.includes("cyberpunk") || s.includes("sci-fi") || s.includes("gta") || s.includes("futur")) {
    return [...CURATED_GAMING_ASSETS.future, ...CURATED_GAMING_ASSETS.action];
  }
  return [...CURATED_GAMING_ASSETS.action, ...CURATED_GAMING_ASSETS.playstation, ...CURATED_GAMING_ASSETS.xbox];
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

async function fetchMultiSourceCandidates(query: string): Promise<string[]> {
  const results: string[] = [];
  const [wiki, openverse, ddg] = await Promise.allSettled([
    searchWikimediaImages(query),
    searchOpenverseImages(query),
    searchDuckDuckGoImages(query),
  ]);

  if (wiki.status === "fulfilled") results.push(...wiki.value);
  if (openverse.status === "fulfilled") results.push(...openverse.value);
  if (ddg.status === "fulfilled") results.push(...ddg.value);

  return [...new Set(results)];
}

async function downloadAndProcessImage(url: string): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const original = await sharp(input).metadata();
    if (!original.width || !original.height || original.width < 500 || original.height < 300) {
      return null;
    }
    const output = await sharp(input)
      .resize(1920, 1080, { fit: "cover", position: "centre" })
      .webp({ quality: 90, effort: 4 })
      .toBuffer();
    const meta = await sharp(output).metadata();
    return {
      buffer: output,
      width: meta.width || 1920,
      height: meta.height || 1080,
    };
  } catch {
    return null;
  }
}

async function uploadToSupabaseStorage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  postId: string,
  prefix: string,
  buffer: Buffer
): Promise<string> {
  const filename = `editorial/${postId}/${prefix}-${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("post-images").upload(filename, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("post-images").getPublicUrl(filename);
  return data.publicUrl;
}

const EDITORIAL_SYSTEM_INSTRUCTION = `
Você é o editor-chefe do portal Orange Brick (portal brasileiro de notícias sobre videogames, lançamentos, hardware e cultura gamer).
Seu objetivo é redigir matérias completas, aprofundadas, 100% autorais e envolventes sobre jogos, trailers, mecânicas de gameplay e lançamentos.

DIRETRIZES EDITORIAIS E DE ESTRUTURA (ESTRITAMENTE OBRIGATÓRIAS):
1. IDENTIDADE E AUTORIA:
   - Pseudônimo do autor: "The Brick"
   - Tag de autor: "Editor-Chefe"
   - Tom de voz: direto, ágil, técnico e empolgante. Sem frases prontas clichês de IA (evite "no vasto universo dos games", "uma reviravolta emocionante").
   - USO MODERADO DE NEGRITOS: use negrito apenas para termos ou dados realmente importantes de forma natural e humana. Nunca coloque negritos artificiais repetitivos em palavras soltas.

2. ESTRUTURA MODULAR DE BLOCOS:
   - Bloco 1 (Introdução): Fato principal curto, objetivo e instigante nas primeiras 3 a 5 linhas.
   - Bloco 2 (Imagem 1): Ilustração de meio após a introdução com legenda detalhada e coerente com a cena.
   - Bloco 3 (Desenvolvimento Técnico): Fatos, números, jogabilidade, mecânicas, combate, história e detalhes do estúdio estruturados com subtítulo "## Subtítulo".
   - Bloco 4 (Imagem 2): Ilustração secundária (ângulo complementar, cenário, chefe ou tecnologia) com legenda.
   - Bloco 5 (Conclusão e Debate): Encerramento do artigo com convite direto para os leitores debaterem nos comentários e reações, seguido de linha divisória "---" e atribuição da fonte:
     "Fonte: [Nome do Veículo](https://link-da-fonte.com)"

3. COERÊNCIA E DIRETRIZES DE IMAGENS:
   - As imagens devem fazer pleno sentido com a notícia e OBRIGATORIAMENTE com a legenda descritiva.
   - Forneça termos de busca precisos em inglês para capa, imagem 1 e imagem 2.
   - Capa: Arte oficial de divulgação, Key Art 4K ou pôster oficial do jogo.
   - Imagem 1: Screenshot real de gameplay / combate / ação do jogo.
   - Imagem 2: Screenshot de cenário, chefe, vilão ou detalhe complementar do jogo.
   - Todas as 3 imagens devem ser distintas entre si.
   - As legendas devem terminar com "(Foto: Divulgação/Oficial)" ou "(Imagem ilustrativa)".

4. IDIOMA E NOMES:
   - Português do Brasil (PT-BR) impecável.
   - Nomes de jogos e marcas SEMPRE no original em inglês (ex: Phantom Blade Zero, Grand Theft Auto VI, Monster Hunter Wilds, Doom: The Dark Ages). NUNCA traduza nomes de jogos.
   - Datas e meses em português (ex: "27 de Agosto", "15 de Outubro").
   - NUNCA utilize caracteres CJK (chinês/japonês/coreano) nem entidades corrompidas.

5. SCHEMA JSON DE SAÍDA (RESPONDA EXCLUSIVAMENTE O JSON PURO):
{
  "title": "TÍTULO EM CAIXA ALTA COM GANCHO FORTE (MÁX 70 CARACTERES)",
  "summary": "Uma frase de ~140 caracteres: o que foi revelado sobre o jogo + por que importa.",
  "category": "breaking | hardware | industry | review | opinion",
  "source_name": "Nome da fonte original (ex: Gematsu, IGN, VGC, PlayStation Blog)",
  "source_url": "URL original da notícia",
  "cover_image_query": "Termo de busca em inglês para a arte de capa/Key Art 4K (ex: 'The Witcher 4 official key art 4k')",
  "cover_alt": "Alt text descritivo da arte de capa para acessibilidade e SEO",
  "image_1_query": "Termo de busca em inglês para screenshot de gameplay/combate (ex: 'The Witcher 4 gameplay combat screenshot')",
  "image_1_alt": "Alt text descrevendo a cena de gameplay",
  "image_1_caption": "Legenda descritiva conectada com a cena de ação. (Foto: Divulgação/Oficial)",
  "image_2_query": "Termo de busca em inglês para screenshot de cenário/mundo/boss (ex: 'The Witcher 4 environment world scenery')",
  "image_2_alt": "Alt text descrevendo o cenário ou chefe",
  "image_2_caption": "Legenda descritiva conectada com o mundo do jogo. (Foto: Divulgação/Oficial)",
  "intro_text": "Texto da introdução (3 a 5 linhas)...",
  "development_text": "## Subtítulo Principal\\n\\nTexto de desenvolvimento técnico com fatos, jogabilidade e detalhes...",
  "conclusion_text": "Texto de conclusão e debate com a comunidade...\\n\\n---\\n\\nFonte: [Nome](URL)"
}
`;

async function fetchNewsArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return clean.slice(0, 4000);
  } catch {
    return "";
  }
}

const GAMING_FEEDS = [
  { name: "Gematsu Google", url: "https://news.google.com/rss/search?q=site:gematsu.com+when:1d&hl=en-US&gl=US&ceid=US:en" },
  { name: "Google Games BR", url: "https://news.google.com/rss/search?q=(game+OR+jogo)+AND+(gameplay+OR+trailer+OR+anuncio+OR+lancamento+OR+revela)+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { name: "IGN / VGC Gaming", url: "https://news.google.com/rss/search?q=(site:ign.com+OR+site:videogameschronicle.com+OR+site:eurogamer.net)+AND+(gameplay+OR+trailer+OR+announced+OR+reveal+OR+release+date)+when:1d&hl=en-US&gl=US&ceid=US:en" },
];

const STOPWORDS_REGEX = /(deal|sale|discount|price|guide|walkthrough|promoção|desconto|podcast|where to buy|review:|opinions|analise|review)/i;

function scoreNewsItem(title: string, summary: string): number {
  let s = 0;
  const t = `${title} ${summary}`.toLowerCase();

  if (t.includes("gameplay")) s += 10;
  if (t.includes("trailer")) s += 8;
  if (t.includes("anuncia") || t.includes("announce")) s += 7;
  if (t.includes("revela") || t.includes("reveal")) s += 7;
  if (t.includes("demo") || t.includes("demonstração")) s += 8;
  if (t.includes("remake") || t.includes("remaster")) s += 6;
  if (t.includes("release date") || t.includes("data de lançamento") || t.includes("lança")) s += 6;
  if (t.includes("combate") || t.includes("combat") || t.includes("boss")) s += 5;
  if (t.includes("beta") || t.includes("closed beta")) s += 6;

  const HYPE_GAMES = [
    "phantom blade", "kingdom hearts", "fatal fury", "gta", "grand theft auto", "wolverine",
    "monster hunter", "elden ring", "death stranding", "resident evil", "silent hill",
    "metal gear", "witcher", "cyberpunk", "doom", "final fantasy", "zelda", "mario",
    "pokemon", "god of war", "ghost of yotei", "spider-man", "fortnite", "mortal shell",
    "diablo", "crimson desert", "borderlands", "fable", "halo", "metroid", "silksong",
    "dragon quest", "persona", "sega", "capcom", "square enix", "fromsoftware", "bandai namco"
  ];

  for (const game of HYPE_GAMES) {
    if (t.includes(game)) s += 10;
  }

  if (t.includes("quarterly") || t.includes("earnings") || t.includes("shareholder") || t.includes("relatório financeiro")) s -= 8;
  if (STOPWORDS_REGEX.test(t)) s -= 12;

  return s;
}

async function fetchTopDailyGamingNews(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<{ title: string; link: string; summary: string } | null> {
  const now = Date.now();
  const maxAgeMs = 28 * 60 * 60 * 1000;
  const items: { title: string; link: string; summary: string; score: number; pubDate: Date }[] = [];

  for (const src of GAMING_FEEDS) {
    try {
      const res = await fetch(src.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
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

          if (age <= maxAgeMs) {
            const title = titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*-\s*(Gematsu|IGN|VGC|Olhar Digital|TecMundo|Crunchyroll|Eurogamer).*$/i, "").trim();
            const link = linkMatch[1].replace(/<[^>]+>/g, "").trim();
            const summary = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
            const score = scoreNewsItem(title, summary);
            if (score > 0) {
              items.push({ title, link, summary, score, pubDate });
            }
          }
        }
      }
    } catch {
      continue;
    }
  }

  if (items.length === 0) return null;

  items.sort((a, b) => b.score - a.score || b.pubDate.getTime() - a.pubDate.getTime());

  for (const item of items) {
    const slug = buildSlug(item.title);
    const { data: existing } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
    if (!existing) {
      return item;
    }
  }

  return items[0] || null;
}

export async function generateNewsDraft(options: GeneratePostOptions = {}): Promise<GeneratedDraftResult> {
  const gemini = getGeminiClient();
  const supabase = getSupabaseAdmin();

  let userPrompt = "";
  if (options.sourceUrl) {
    const rawContent = await fetchNewsArticleText(options.sourceUrl);
    userPrompt = `Apure e redija uma matéria jornalística completa para o Orange Brick baseada nesta notícia:\nURL: ${options.sourceUrl}\nConteúdo da fonte:\n${rawContent || options.sourceUrl}`;
  } else if (options.topic) {
    userPrompt = `Pesquise a fundo e redija uma matéria jornalística completa para o Orange Brick sobre o seguinte tema:\n"${options.topic}".`;
  } else {
    const topNews = await fetchTopDailyGamingNews(supabase);
    if (topNews) {
      const articleText = await fetchNewsArticleText(topNews.link);
      userPrompt = `Apure e redija a matéria do dia para o Orange Brick baseada na principal notícia das fontes:\nTítulo original: ${topNews.title}\nFonte: ${topNews.link}\nResumo/Conteúdo:\n${articleText || topNews.summary}`;
    } else {
      userPrompt = `Apure e redija a matéria mais importante de games e lançamentos de hoje para o Orange Brick.`;
    }
  }

  if (options.category) {
    userPrompt += ` A categoria desejada é '${options.category}'.`;
  }

  const candidateModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
  let responseText = "";
  let lastError: Error | null = null;

  for (const modelName of candidateModels) {
    try {
      const response = await gemini.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION,
          temperature: 0.3,
        },
      });
      if (response.text) {
        responseText = response.text;
        break;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  if (!responseText) {
    throw lastError || new Error("Falha ao obter resposta dos modelos do Gemini.");
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
  } catch (err) {
    throw new Error(`Falha ao decodificar resposta do Gemini: ${err instanceof Error ? err.message : String(err)}\nResposta bruta: ${responseText.slice(0, 300)}`);
  }

  const rawTitle = (parsed.title || "NOTÍCIA ORANGE BRICK").replace(/\*\*/g, "").trim().toUpperCase();
  const summary = (parsed.summary || "").trim();
  const category: PostCategory = parsed.category && CATEGORY_TAGS[parsed.category as PostCategory]
    ? (parsed.category as PostCategory)
    : "industry";
  const authorName = options.authorName || "The Brick";
  const authorTag = "Editor-Chefe";
  const slug = buildSlug(rawTitle);

  validateNoCorruptedCharacters(rawTitle);
  validateNoCorruptedCharacters(summary);
  validateNoCorruptedCharacters(parsed.intro_text || "");
  validateNoCorruptedCharacters(parsed.development_text || "");
  validateNoCorruptedCharacters(parsed.conclusion_text || "");

  const { data: existingPost } = await supabase.from("posts").select("id, slug").eq("slug", slug).maybeSingle();
  if (existingPost) {
    throw new Error(`Já existe um post com o slug '${slug}' no banco de dados.`);
  }

  const newPostId = crypto.randomUUID();

  const cleanSubject = rawTitle
    .replace(/^(CONFIRA|VEJA|NOVO|NOVA|REVELADO|ANUNCIADO|OFICIAL|DATA DE LANÇAMENTO:?)\s+/i, "")
    .replace(/\s+(GANHA|RECEBE|TERÁ|CHEGA|É ANUNCIADO|REVELA|CONFIRMA).*$/i, "")
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
  const fallbackPool = getCuratedGamingFallback(cleanSubject);

  async function findAndUpload(queries: string[], prefix: string, fallbackIndex: number): Promise<string> {
    for (const q of queries) {
      const candidates = await fetchMultiSourceCandidates(q);
      for (const url of candidates) {
        if (usedImageUrls.has(url)) continue;
        const processed = await downloadAndProcessImage(url);
        if (processed) {
          try {
            const uploadedUrl = await uploadToSupabaseStorage(supabase, newPostId, prefix, processed.buffer);
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
      const processed = await downloadAndProcessImage(url);
      if (processed) {
        try {
          const uploadedUrl = await uploadToSupabaseStorage(supabase, newPostId, prefix, processed.buffer);
          usedImageUrls.add(url);
          return uploadedUrl;
        } catch {
          continue;
        }
      }
    }

    return `https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80`;
  }

  const [coverUrl, img1Url, img2Url] = await Promise.all([
    findAndUpload(coverQueries, "cover", 0),
    findAndUpload(img1Queries, "body-1", 1),
    findAndUpload(img2Queries, "body-2", 2),
  ]);

  const introText = (parsed.intro_text || "").trim();
  const devText = (parsed.development_text || "").trim();
  const conclusionText = (parsed.conclusion_text || "").trim();

  const blocks = [
    {
      id: "block-0",
      type: "text",
      content: introText,
    },
    {
      id: "block-1",
      type: "image",
      url: img1Url,
      alt: parsed.image_1_alt || `${rawTitle} - Gameplay e Ação`,
      caption: parsed.image_1_caption || `Cena de ação e jogabilidade. (Foto: Divulgação/Oficial)`,
    },
    {
      id: "block-2",
      type: "text",
      content: devText,
    },
    {
      id: "block-3",
      type: "image",
      url: img2Url,
      alt: parsed.image_2_alt || `${rawTitle} - Detalhes e Ambientação`,
      caption: parsed.image_2_caption || `Ambientação e detalhes visuais. (Foto: Divulgação/Oficial)`,
    },
    {
      id: "block-4",
      type: "text",
      content: conclusionText,
    },
  ];

  const sourceName = parsed.source_name || "Fonte Primária";
  const sourceUrl = parsed.source_url || options.sourceUrl || "https://orange-brick.vercel.app";
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
    throw new Error(`Erro ao salvar post no Supabase: ${insertError?.message || "Registro não retornado"}`);
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
      .replace(/^(CONFIRA|VEJA|NOVO|NOVA|REVELADO|ANUNCIADO|OFICIAL|DATA DE LANÇAMENTO:?)\s+/i, "")
      .replace(/\s+(GANHA|RECEBE|TERÁ|CHEGA|É ANUNCIADO|REVELA|CONFIRMA).*$/i, "")
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
    const fallbackPool = getCuratedGamingFallback(cleanSubject);

    async function findAndUploadSingle(queries: string[], prefix: string, fallbackIndex: number): Promise<string> {
      for (const q of queries) {
        const candidates = await fetchMultiSourceCandidates(q);
        for (const url of candidates) {
          if (usedImageUrls.has(url)) continue;
          const processed = await downloadAndProcessImage(url);
          if (processed) {
            try {
              const uploadedUrl = await uploadToSupabaseStorage(supabase, post.id, prefix, processed.buffer);
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
        const processed = await downloadAndProcessImage(url);
        if (processed) {
          try {
            const uploadedUrl = await uploadToSupabaseStorage(supabase, post.id, prefix, processed.buffer);
            usedImageUrls.add(url);
            return uploadedUrl;
          } catch {
            continue;
          }
        }
      }

      return "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80";
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
    const devText = textBlocks[1]?.content || `## Detalhes e Novidades de ${cleanSubject}\n\nA matéria foi atualizada com detalhes completos e novas imagens oficiais de jogabilidade.`;
    const conclusionText = textBlocks[2]?.content || textBlocks[textBlocks.length - 1]?.content || `O que você achou dessa novidade? Participe do debate deixando sua opinião nos comentários abaixo!\n\n---\n\nFonte: [Orange Brick News](https://orange-brick.vercel.app)`;

    const newBlocks = [
      {
        id: "block-0",
        type: "text",
        content: introText,
      },
      {
        id: "block-1",
        type: "image",
        url: img1Url,
        alt: `${post.title} - Gameplay e Ação`,
        caption: `Cena de ação e jogabilidade. (Foto: Divulgação/Oficial)`,
      },
      {
        id: "block-2",
        type: "text",
        content: devText,
      },
      {
        id: "block-3",
        type: "image",
        url: img2Url,
        alt: `${post.title} - Detalhes e Ambientação`,
        caption: `Ambientação e detalhes visuais. (Foto: Divulgação/Oficial)`,
      },
      {
        id: "block-4",
        type: "text",
        content: conclusionText,
      },
    ];

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
