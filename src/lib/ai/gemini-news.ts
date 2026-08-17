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
Você é o editor sênior do portal Orange Brick (portal brasileiro de jornalismo de games, hardware e cultura pop).
Seu objetivo é apurar, investigar e redigir uma matéria completa, 100% autoral e altamente qualificada.

DIRETRIZES EDITORIAIS OBRIGATÓRIAS (ESTRITAS):
1. IDIOMA & LOCALIZAÇÃO:
   - Português do Brasil (PT-BR) impecável.
   - Nomes de jogos e marcas SEMPRE no original em inglês (ex: Marvel's Wolverine, Starfield, Grand Theft Auto VI, Xbox Cloud Gaming). NUNCA traduza nomes de jogos.
   - Datas e meses em português (ex: "15 de Outubro", "28 de Julho").
   - NUNCA use caracteres CJK (chinês/japonês/coreano).
   - NUNCA use entidades HTML corrompidas ou caracteres especiais estranhos.

2. TOM DE VOZ:
   - Direto, seco, jornalístico, sem firulas e sem clichês de IA (evite "no vasto mundo dos games", "uma reviravolta emocionante", etc.).
   - Negrito com moderação: use **apenas** para nomes próprios essenciais e termos técnicos cruciais.

3. ESTRUTURA E EXTENSÃO:
   - O corpo da matéria deve ser desenvolvido e aprofundado, contendo entre 700 e 1.000 palavras.
   - Sempre inclua ao menos UMA declaração pública real e verificável de alguém diretamente ligado ao caso (executivo, dev, porta-voz, analista), citando nome, cargo, onde foi dito e o contexto.
   - Estrutura de blocos rigorosa:
     [Bloco 1 - text]: Introdução com gancho forte e fatos essenciais.
     [Bloco 2 - image_query]: Termo exato de busca para a 1ª imagem de contexto (ex: "Asha Sharma Microsoft Gaming photo").
     [Bloco 3 - text]: Desenvolvimento com subtítulo ## (fatos, dados, citações reais de executivos).
     [Bloco 4 - image_query]: Termo exato de busca para a 2ª imagem (ângulo/conceito diferente da primeira).
     [Bloco 5 - text]: Impacto na indústria, conclusão e citação da fonte no final no formato exato: **Fonte:** [Nome da Fonte](URL da fonte).

4. FORMATO DE SAÍDA:
   - Responda EXCLUSIVAMENTE em formato JSON puro (sem markdown em volta do JSON, sem \`\`\`json).
   - O schema JSON deve conter:
   {
     "title": "TÍTULO EM CAIXA ALTA COM GANCHO FORTE (MÁX 70 CARACTERES)",
     "summary": "Uma frase de ~140 caracteres que responde: o que aconteceu + por que importa.",
     "category": "breaking | hardware | industry | modding | review | opinion",
     "source_name": "Nome da fonte primária (ex: Gematsu, VGC, IGN, PlayStation Blog)",
     "source_url": "URL original da notícia",
     "cover_image_query": "Termo de busca para a arte oficial de capa do jogo/hardware em 4K",
     "cover_alt": "Texto alternativo descritivo para a capa",
     "image_1_query": "Termo de busca para a 1ª imagem interna oficial",
     "image_1_alt": "Alt text da imagem 1",
     "image_1_caption": "Legenda curta para a imagem 1",
     "image_2_query": "Termo de busca para a 2ª imagem interna oficial",
     "image_2_alt": "Alt text da imagem 2",
     "image_2_caption": "Legenda curta para a imagem 2",
     "intro_text": "Texto do primeiro bloco...",
     "development_text": "## Subtítulo\\n\\nTexto de desenvolvimento com citações e fatos...",
     "conclusion_text": "Texto do bloco final contextualizando o impacto...\\n\\n**Fonte:** [Nome](URL)"
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

async function fetchTopDailyGamingNews(): Promise<{ title: string; link: string; summary: string } | null> {
  const feeds = [
    "https://www.gematsu.com/feed",
    "https://br.ign.com/feed.xml",
    "https://www.videogameschronicle.com/feed/",
    "https://www.eurogamer.net/feed",
    "https://www.gamespot.com/feeds/mashup/",
  ];
  for (const feedUrl of feeds) {
    try {
      const res = await fetch(feedUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
      if (itemMatch) {
        const block = itemMatch[1];
        const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
        const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        if (titleMatch && linkMatch) {
          return {
            title: titleMatch[1].trim(),
            link: linkMatch[1].trim(),
            summary: descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "",
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
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
    const topNews = await fetchTopDailyGamingNews();
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

  const candidateModels = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"];
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

  const coverQueries: string[] = [
    parsed.cover_image_query,
    `${rawTitle} official key art 16:9`,
    `${rawTitle} official wallpaper 4k`,
  ].filter((q): q is string => Boolean(q));

  const img1Queries: string[] = [
    parsed.image_1_query,
    `${rawTitle} official screenshot gameplay`,
  ].filter((q): q is string => Boolean(q));

  const img2Queries: string[] = [
    parsed.image_2_query,
    `${rawTitle} official promo`,
  ].filter((q): q is string => Boolean(q));

  async function findAndUpload(queries: string[], prefix: string): Promise<string | null> {
    for (const q of queries) {
      const candidates = await searchDuckDuckGoImages(q);
      for (const url of candidates) {
        const processed = await downloadAndProcessImage(url);
        if (processed) {
          try {
            return await uploadToSupabaseStorage(supabase, newPostId, prefix, processed.buffer);
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
