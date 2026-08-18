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

async function searchDuckDuckGoImages(query: string): Promise<string[]> {
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
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
      signal: AbortSignal.timeout(12000),
    });
    if (!apiRes.ok) return [];
    const data = (await apiRes.json()) as { results?: { image?: string }[] };
    return (data.results || [])
      .map((r) => r.image)
      .filter((u): u is string => typeof u === "string" && !/(unsplash|pexels|pixabay)\.com/i.test(u));
  } catch {
    return [];
  }
}

async function downloadAndProcessImage(url: string): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const original = await sharp(input).metadata();
    if (!original.width || !original.height || original.width < 800 || original.height < 450) {
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
Você é o editor-chefe do portal Orange Brick (portal brasileiro de notícias sobre videogames, cultura gamer, lançamentos e hardware).
Seu objetivo é redigir matérias empolgantes, aprofundadas e 100% autorais sobre JOGOS, trailers, mecânicas de gameplay, revelações e grandes lançamentos.

DIRETRIZES EDITORIAIS OBRIGATÓRIAS (FOCO TOTAL EM JOGOS):
1. FOCO NO JOGADOR (GAMER FIRST):
   - Priorize sempre o JOGO: combate, história, gráficos, mecânicas, novidades de jogabilidade, estúdios de desenvolvimento, plataformas e datas de lançamento.
   - Evite matérias corporativas secas sobre balanços financeiros ou reuniões de acionistas a menos que tragam anúncios diretos de jogos.
   - O tom deve ser direto, empolgante, bem-informado e apaixonado por games. Sem clichês genéricos de IA (evite frases prontas como "no vasto universo dos games", "uma reviravolta emocionante").
   - Use negrito com moderação, destacando nomes de estúdios, termos de mecânicas e personagens.

2. IDIOMA & NOMES:
   - Português do Brasil (PT-BR) impecável.
   - Nomes de jogos e marcas SEMPRE no original em inglês (ex: Phantom Blade Zero, Kingdom Hearts 4, Fatal Fury: City of the Wolves, Grand Theft Auto VI, Monster Hunter Wilds, Doom: The Dark Ages). NUNCA traduza nomes de jogos.
   - Datas e meses em português (ex: "27 de Agosto", "15 de Outubro").
   - NUNCA use caracteres CJK (chinês/japonês/coreano) nem caracteres especiais corrompidos.

3. DIRETRIZES ESTRITAS DE IMAGENS:
   - IMAGENS 100% OFICIAIS DE JOGOS:
     * Capa: Arte oficial de capa (Key Art 4K), pôster principal oficial ou arte de divulgação oficial do jogo.
     * Imagem 1: Screenshot real de gameplay / combate / ação in-game capturada direto do jogo.
     * Imagem 2: Screenshot de cenário, exploração, vilão, chefe ou cena cinematográfica oficial diferente da primeira.
   - AVISO NA LEGENDA:
     * Para imagens oficiais de divulgação/gameplay da desenvolvedora: termine a legenda com '(Foto: Divulgação/Oficial)'.
     * Caso alguma imagem seja conceitual ou gerada por IA: inclua '(Imagem meramente ilustrativa)'.

4. ESTRUTURA DO ARTIGO (700 A 1.000 PALAVRAS):
   - [Bloco 1 - text]: Gancho forte, revelação principal do jogo, o que foi mostrado no trailer ou anúncio e por que os jogadores estão empolgados.
   - [Bloco 2 - image_query]: Termo em inglês para a 1ª imagem de gameplay oficial (ex: "Phantom Blade Zero official in-game gameplay combat screenshot 4k").
   - [Bloco 3 - text]: Desenvolvimento profundo com subtítulo ## (detalhes de jogabilidade, mecânicas, combate, história, declarações de diretores/produtores do estúdio).
   - [Bloco 4 - image_query]: Termo em inglês para a 2ª imagem oficial de cenário/boss (ex: "Phantom Blade Zero official boss fight environment screenshot 4k").
   - [Bloco 5 - text]: Plataformas confirmadas (PS5, Xbox, PC, Switch 2), janela de lançamento, impacto na comunidade e citação da fonte: **Fonte:** [Nome da Fonte](URL da fonte).

5. SCHEMA JSON DE SAÍDA (RESPONDA APENAS O JSON PURO):
   {
     "title": "TÍTULO EM CAIXA ALTA COM GANCHO FORTE (MÁX 70 CARACTERES)",
     "summary": "Uma frase de ~140 caracteres: o que foi revelado sobre o jogo + por que importa para os gamers.",
     "category": "breaking | hardware | industry | review | opinion",
     "source_name": "Nome da fonte (ex: Gematsu, IGN, VGC, PlayStation Blog)",
     "source_url": "URL original da notícia",
     "cover_image_query": "Termo de busca para a arte oficial de capa/Key Art 4K em 16:9 (ex: 'Phantom Blade Zero official key art 4k')",
     "cover_alt": "Alt text descritivo da arte de capa",
     "image_1_query": "Termo de busca para screenshot oficial de combate/gameplay (ex: 'Phantom Blade Zero in-game combat gameplay screenshot 4k')",
     "image_1_alt": "Alt text descrevendo a cena de gameplay",
     "image_1_caption": "Legenda detalhando o combate/ação do jogo. (Foto: Divulgação/Oficial)",
     "image_2_query": "Termo de busca para screenshot oficial de cenário/chefe (ex: 'Phantom Blade Zero boss fight environment 4k')",
     "image_2_alt": "Alt text descrevendo o cenário ou chefe",
     "image_2_caption": "Legenda detalhando o mundo ou inimigo. (Foto: Divulgação/Oficial)",
     "intro_text": "Texto do bloco 1...",
     "development_text": "## Subtítulo\\n\\nTexto de desenvolvimento técnico e jogabilidade...",
     "conclusion_text": "Texto do bloco final...\\n\\n**Fonte:** [Nome](URL)"
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

  // Prioridade MASSIVA para matérias sobre JOGOS REAIS, GAMEPLAY, TRAILERS E LANÇAMENTOS
  if (t.includes("gameplay")) s += 10;
  if (t.includes("trailer")) s += 8;
  if (t.includes("anuncia") || t.includes("announce")) s += 7;
  if (t.includes("revela") || t.includes("reveal")) s += 7;
  if (t.includes("demo") || t.includes("demonstração")) s += 8;
  if (t.includes("remake") || t.includes("remaster")) s += 6;
  if (t.includes("release date") || t.includes("data de lançamento") || t.includes("lança")) s += 6;
  if (t.includes("combate") || t.includes("combat") || t.includes("boss")) s += 5;
  if (t.includes("beta") || t.includes("closed beta")) s += 6;

  // Franquias e títulos de grande apelo
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

  // Penaliza matérias corporativas sem anúncio de jogo e guias comerciais
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

  // Ordena pelas notícias de jogos com maior pontuação de gameplay/hype
  items.sort((a, b) => b.score - a.score || b.pubDate.getTime() - a.pubDate.getTime());

  // Deduplicação contra posts já criados no Supabase
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
      userPrompt = `Apure e redija a matéria mais importante de games e indústria de hoje para o Orange Brick.`;
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
  const authorTag = CATEGORY_TAGS[category];
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
    `${cleanSubject} official key art 4k wallpaper`,
    `${cleanSubject} official game cover art 16:9`,
    `${cleanSubject} promotional artwork 4k`,
  ].filter((q): q is string => Boolean(q));

  const img1Queries: string[] = [
    parsed.image_1_query,
    `${cleanSubject} official in-game gameplay combat screenshot 4k`,
    `${cleanSubject} gameplay screenshot 1080p`,
    `${cleanSubject} action combat screenshot`,
  ].filter((q): q is string => Boolean(q));

  const img2Queries: string[] = [
    parsed.image_2_query,
    `${cleanSubject} official world environment scenery screenshot 4k`,
    `${cleanSubject} boss fight scene screenshot 4k`,
    `${cleanSubject} cinematic scene official 4k`,
  ].filter((q): q is string => Boolean(q));

  const usedImageUrls = new Set<string>();

  async function findAndUpload(queries: string[], prefix: string): Promise<string | null> {
    for (const q of queries) {
      const candidates = await searchDuckDuckGoImages(q);
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
    return null;
  }

  const [coverUrl, img1Url, img2Url] = await Promise.all([
    findAndUpload(coverQueries, "cover"),
    findAndUpload(img1Queries, "body-1"),
    findAndUpload(img2Queries, "body-2"),
  ]);

  const blocks = [
    {
      id: "block-0",
      type: "text",
      content: parsed.intro_text || "",
    },
    ...(img1Url
      ? [
          {
            id: "block-1",
            type: "image",
            url: img1Url,
            alt: parsed.image_1_alt || rawTitle,
            caption: parsed.image_1_caption || "",
          },
        ]
      : []),
    {
      id: "block-2",
      type: "text",
      content: parsed.development_text || "",
    },
    ...(img2Url
      ? [
          {
            id: "block-3",
            type: "image",
            url: img2Url,
            alt: parsed.image_2_alt || rawTitle,
            caption: parsed.image_2_caption || "",
          },
        ]
      : []),
    {
      id: "block-4",
      type: "text",
      content: parsed.conclusion_text || "",
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
        image_url: coverUrl || img1Url || null,
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
