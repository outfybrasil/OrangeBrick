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
1. Gancho forte nos primeiros 3 segundos que prenda a atenção imediatamente.
2. Texto da narração fluído, natural para ser falado, sem gagueira ou clichês vazios. Total entre 60 e 90 palavras faladas.
3. Divida o vídeo em 5 momentos visuais (Cenas):
   - Cena 1: Gancho / Revelação bombástica
   - Cena 2: Contexto / Grandes nomes ou estúdios envolvidos
   - Cena 3: Principais novidades / mecânicas / mapa / detalhes
   - Cena 4: Ponto alto (ex: personagem, gameplay, recurso incrível)
   - Cena 5: Plataformas e data de lançamento
4. Um Call to Action (CTA) provocativo com uma pergunta de engajamento e chamada para seguir o Orange Brick.

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "hook": "Frase de gancho curta para o topo",
  "headline": "TÍTULO DE IMPACTO EM MAIÚSCULAS",
  "subHeadline": "SUBTÍTULO EM DESTAQUE",
  "badge": "BADGE DA NOTÍCIA (ex: NOVIDADE BGS 2026, OFICIAL, LANÇAMENTO)",
  "narrationText": "Texto completo que será narrado de 35 a 45 segundos em português brasileiro.",
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
  "ctaQuestion": "Pergunta para os comentários?",
  "ctaAction": "Comenta aí e segue o Orange Brick!",
  "ctaButton": "SEGUIR @ORANGEBRICK"
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
  return data;
}
