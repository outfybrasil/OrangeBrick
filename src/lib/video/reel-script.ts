import { GoogleGenAI } from "@google/genai";
import type { Post } from "../types/database.ts";

export interface ReelScene {
  id: string;
  headline: string;
  highlight: string;
  tag: string;
  pills?: string[];
  imageIndex: number;
}

export interface ReelScriptData {
  hook: string;
  headline: string;
  subHeadline: string;
  badge: string;
  narrationText: string;
  scenes: ReelScene[];
  ctaQuestion: string;
  ctaAction: string;
  ctaButton: string;
  ttsProvider?: "elevenlabs" | "edge-tts";
}

const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];
const MAX_ROUNDS = 3;
const RETRY_BASE_MS = 8000;

export async function generateReelScript(post: Post, apiKey: string): Promise<ReelScriptData> {
  const gemini = new GoogleGenAI({ apiKey });

  const prompt = `Você é um editor sênior de vídeos curtos (Reels, TikTok, Shorts) especializado em games e tecnologia para o canal "Orange Brick".
Crie um roteiro dinâmico, enérgico e viral de 35 a 45 segundos baseado na seguinte matéria:

TÍTULO: ${post.title}
CATEGORIA: ${post.category}
RESUMO: ${post.summary}
CONTEÚDO:
${post.body.slice(0, 3000)}

INSTRUÇÕES DO ROTEIRO:
1. Abra com um gancho factual nos primeiros 3 segundos, sem exageros ou linguagem sensacionalista.
2. Escreva a narração em tom natural e direto, adequado à categoria da matéria. Para industry, hardware e breaking, mantenha linguagem jornalística e factual. Use entre 50 e 75 palavras faladas e termine com: "Quer ver a matéria completa? Acesse orangebrick.blog."
3. Preserve exatamente o status e os limites dos fatos: proposta não é decisão concluída; “até X” não é um total confirmado; cargos afetados não significam necessariamente demissões concluídas. Não some números de processos distintos sem explicar que se trata de um limite máximo. Não troque “propõe” ou “pode afetar” por “fechou” ou “demitiu”.
4. Divida o vídeo em 5 momentos visuais que correspondam aos fatos da matéria. Adapte as cenas ao tema; se não houver plataformas ou data de lançamento, use impacto, contexto ou próximos passos. Nunca invente plataformas, datas, números, decisões ou declarações.
5. Feche com uma pergunta pertinente ao assunto e convide a pessoa a ler a matéria completa em orangebrick.blog. A chamada para acessar o site deve ser falada no fim da narração.

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "hook": "Frase de gancho curta para o topo",
  "headline": "TÍTULO DE IMPACTO EM MAIÚSCULAS",
  "subHeadline": "SUBTÍTULO EM DESTAQUE",
  "badge": "BADGE DA NOTÍCIA (ex: NOVIDADE BGS 2026, OFICIAL, LANÇAMENTO)",
  "narrationText": "Texto completo de 35 a 45 segundos em português brasileiro, terminando com: Quer ver a matéria completa? Acesse orangebrick.blog.",
  "scenes": [
    {
      "id": "scene1",
      "headline": "TÍTULO DA CENA 1",
      "highlight": "TEXTO EM DESTAQUE",
      "tag": "TAG RÁPIDA",
      "imageIndex": 0
    },
    {
      "id": "scene2",
      "headline": "TÍTULO DA CENA 2",
      "highlight": "TEXTO EM DESTAQUE",
      "tag": "TAG RÁPIDA",
      "imageIndex": 1
    },
    {
      "id": "scene3",
      "headline": "TÍTULO DA CENA 3",
      "highlight": "TEXTO EM DESTAQUE",
      "tag": "TAG RÁPIDA",
      "pills": ["Destaque 1", "Destaque 2", "Destaque 3"],
      "imageIndex": 0
    },
    {
      "id": "scene4",
      "headline": "TÍTULO DA CENA 4",
      "highlight": "TEXTO EM DESTAQUE",
      "tag": "TAG RÁPIDA",
      "pills": ["Item A", "Item B", "Item C"],
      "imageIndex": 2
    },
    {
      "id": "scene5",
      "headline": "PLATAFORMAS E DATA",
      "highlight": "DISPONÍVEL EM BREVE",
      "tag": "LANÇAMENTO",
      "pills": ["PS5", "XBOX", "PC"],
      "imageIndex": 1
    }
  ],
  "ctaQuestion": "Quer ler a matéria completa?",
  "ctaAction": "Acesse orangebrick.blog",
  "ctaButton": "LEIA A MATÉRIA COMPLETA"
}`;

  let lastError: Error | null = null;
  const models = [...CANDIDATE_MODELS];

  for (let round = 0; round < MAX_ROUNDS && models.length > 0; round++) {
    if (round > 0) {
      const waitMs = RETRY_BASE_MS * round;
      console.warn(`[ReelScript] Todos os modelos ocupados. Nova tentativa em ${waitMs / 1000}s (rodada ${round + 1}/${MAX_ROUNDS})...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    for (const model of [...models]) {
      try {
        const response = await gemini.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        const script = parseScript(response.text || "");
        return script;
      } catch (err) {
        lastError = err as Error;
        const status = (err as { status?: number })?.status;
        if (status === 404 || status === 400) {
          models.splice(models.indexOf(model), 1);
        }
        console.warn(`[ReelScript] Modelo ${model} falhou (${status || lastError.message}). Tentando próximo...`);
      }
    }
  }

  throw lastError || new Error("Falha ao gerar roteiro com todos os modelos disponíveis.");
}

function parseScript(raw: string): ReelScriptData {
  const cleaned = raw.replace(/```json\n?|```/g, "").trim();
  const data = JSON.parse(cleaned) as ReelScriptData;
  if (!data.narrationText?.trim() || !Array.isArray(data.scenes) || data.scenes.length === 0) {
    throw new Error("Roteiro retornado pelo Gemini está incompleto.");
  }
  const narrationTail = data.narrationText.trim().slice(-180);
  const includesArticleCta = /mat[eé]ria completa[\s\S]{0,120}orangebrick\.blog[.!?]*$/i.test(narrationTail);
  if (!includesArticleCta) {
    const narration = data.narrationText.trim().replace(/[\s.!?]+$/, "");
    data.narrationText = `${narration}. Quer ver a matéria completa? Acesse orangebrick.blog.`;
  }
  data.ctaQuestion = "Quer ler a matéria completa?";
  data.ctaAction = "Acesse orangebrick.blog";
  data.ctaButton = "LEIA A MATÉRIA COMPLETA";
  return data;
}
