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
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];
const MAX_ROUNDS = 3;
const RETRY_BASE_MS = 8000;

function fitText(value: string, limit: number) {
  const text = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(text);
  if (characters.length <= limit) return text;
  const clipped = characters.slice(0, limit - 1).join("").replace(/\s+\S*$/, "").trimEnd();
  return `${clipped || characters.slice(0, limit - 1).join("").trimEnd()}…`;
}

function contextualCommentQuestion(post: Post): string {
  const releaseTitle = post.title.match(/^(.*?)\s+(?:chega|estreia|lança|recebe|ganha)\b/i)?.[1]?.trim();
  if (
    releaseTitle &&
    post.category === "breaking" &&
    /\b(?:estreia|lançamento|data de lançamento|chega em)\b/i.test(post.summary) &&
    !/\b(?:playstation|ps[45]|xbox|nintendo|switch|sony|microsoft|ubisoft|steam)\b/i.test(releaseTitle)
  ) {
    return `Você pretende jogar ${fitText(releaseTitle, 22)} no lançamento?`;
  }
  if (/\b(?:preço|valor|custa|custará)\b/i.test(post.summary)) return "Esse preço mudaria sua decisão de compra?";
  if (/\b(?:demissões|fechamento|fechar|encerrar|aquisição)\b/i.test(post.summary)) return "Como essa decisão pode afetar os jogos do estúdio?";
  if (/\b(?:atualização|patch|correção)\b/i.test(post.summary)) return "Essa mudança melhora sua experiência?";
  return "Qual detalhe dessa notícia mais impacta você como jogador?";
}

export async function generateReelScript(post: Post, apiKey: string): Promise<ReelScriptData> {
  const gemini = new GoogleGenAI({ apiKey, httpOptions: { timeout: 45_000, retryOptions: { attempts: 1 } } });

  const prompt = `Você é editor de vídeos curtos de games para o Orange Brick. Crie um roteiro vertical de 25 a 35 segundos que capture atenção, mantenha retenção e incentive participação e audiência recorrente, sem prometer viralização nem usar clickbait.

TÍTULO: ${post.title}
CATEGORIA: ${post.category}
RESUMO: ${post.summary}
CONTEÚDO:
${post.body.slice(0, 3000)}

REGRAS:
1. A primeira fala deve ser o gancho, com um fato concreto, consequência ou dúvida real que o próprio vídeo responde. Repita a mesma ideia na primeira tela. Comece direto, sem vinheta, saudação ou apresentação do canal.
2. Conte uma única história nesta ordem: gancho, fato principal, contexto que muda a leitura, impacto para quem joga e conclusão. Use surpresa, curiosidade ou debate apenas quando os fatos sustentarem esse ângulo. Entregue a resposta antes do fim; não esconda informação para forçar retenção.
3. Escreva de 55 a 75 palavras faladas em português brasileiro natural. Use frases curtas, ritmo oral e tom adequado à categoria. Em breaking, hardware e industry, seja jornalístico e factual; em opinion, deixe a opinião clara.
4. Termine com uma pergunta específica sobre o assunto que convide a comentar. Não peça para seguir, curtir, salvar e compartilhar ao mesmo tempo; a fala deve ter um único CTA de conversa. As chamadas para seguir e acessar a matéria ficam nas descrições específicas de cada plataforma.
5. Preserve rigorosamente o status e os limites dos fatos: proposta não é decisão concluída; “até X” não é total confirmado; cargos afetados não significam necessariamente demissões concluídas. Não misture números de processos diferentes nem transforme “propõe” ou “pode afetar” em “fechou” ou “demitiu”.
6. Crie exatamente 5 cenas alinhadas à narração: revelação, detalhe principal, contexto, impacto e conclusão/próximo passo. Só mostre plataformas, datas, números, decisões e declarações que apareçam na matéria. Se um dado não existir, use contexto ou impacto; nunca invente nem preencha com informação genérica.
7. Escreva textos de tela curtos e legíveis no celular: gancho com até 55 caracteres; títulos de cena com até 36; destaques com até 48; tags com até 18; no máximo 3 pílulas curtas por cena. Use pílulas apenas para fatos confirmados. Evite repetir a mesma frase em todas as telas.
8. A pergunta final e o CTA devem ser específicos ao assunto. Convide a pessoa a responder nos comentários, sem prometer frequência ou resultado e sem direcionar para outra plataforma.

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "hook": "Frase de gancho curta para o topo",
  "headline": "TÍTULO DE IMPACTO EM MAIÚSCULAS",
  "subHeadline": "SUBTÍTULO EM DESTAQUE",
  "badge": "CATEGORIA",
  "narrationText": "Narração curta, factual e com pergunta e convite para seguir no final",
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
      "headline": "CONCLUSÃO OU PRÓXIMO PASSO",
      "highlight": "IMPACTO CONFIRMADO",
      "tag": "CONTEXTO",
      "pills": ["FATO CONFIRMADO"],
      "imageIndex": 1
    }
  ],
  "ctaQuestion": "Pergunta específica sobre o impacto para quem joga?",
  "ctaAction": "Comente sua resposta para continuar a conversa",
  "ctaButton": "COMENTE ABAIXO"
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

        const script = parseScript(response.text || "", post);
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

function parseScript(raw: string, post: Post): ReelScriptData {
  const cleaned = raw.replace(/```json\n?|```/g, "").trim();
  const data = JSON.parse(cleaned) as ReelScriptData;
  if (!data.narrationText?.trim() || !Array.isArray(data.scenes) || data.scenes.length !== 5) {
    throw new Error("Roteiro retornado pelo Gemini está incompleto.");
  }
  const narrationWords = data.narrationText.trim().split(/\s+/).length;
  if (narrationWords < 45 || narrationWords > 90) {
    throw new Error("Roteiro retornado pelo Gemini está fora da duração esperada.");
  }
  data.hook = fitText(data.hook || data.scenes[0]?.headline || data.headline || "", 55);
  if (!data.hook || /frase de gancho/i.test(data.hook)) throw new Error("Roteiro retornado pelo Gemini não tem um gancho válido.");
  data.headline = fitText(data.headline || data.hook, 48);
  data.subHeadline = fitText(data.subHeadline || "", 64);
  data.badge = fitText(data.badge || "GAMES", 24);
  data.scenes = data.scenes.map((scene, index) => ({
    ...scene,
    id: `scene${index + 1}`,
    headline: fitText(scene.headline || "", 36),
    highlight: fitText(scene.highlight || "", 48),
    tag: fitText(scene.tag || "", 18),
    pills: Array.isArray(scene.pills) ? scene.pills.slice(0, 3).map((pill) => fitText(pill, 18)) : [],
  }));
  if (data.scenes.some((scene) => !scene.headline || !scene.tag)) {
    throw new Error("Roteiro retornado pelo Gemini tem cenas sem texto essencial.");
  }
  data.narrationText = data.narrationText.trim()
    .replace(/\s*(?:Quer ver a mat[eé]ria completa\?\s*)?Acesse orangebrick\.blog\.?\s*$/i, "")
    .replace(/\s*Siga @ob\.labs no Instagram para mais notícias de games\.?\s*$/i, "")
    .replace(/\s*(?:O que você acha dessa mudança|Qual é a sua opinião sobre essa notícia|O que essa notícia muda para quem joga)\?\s*$/i, "")
    .trim();
  data.narrationText = data.narrationText.replace(/@OrangeBrick/gi, "@ob.labs");
  data.ctaQuestion = fitText(data.ctaQuestion || "", 56);
  if (
    !data.ctaQuestion.endsWith("?") ||
    /pergunta específica|impacto para quem joga/i.test(data.ctaQuestion) ||
    /^(?:o que você acha dessa mudança|qual é a sua opinião sobre essa notícia|o que essa notícia muda para quem joga)\?$/i.test(data.ctaQuestion)
  ) {
    data.ctaQuestion = fitText(contextualCommentQuestion(post), 56);
  }
  if (!data.narrationText.toLocaleLowerCase("pt-BR").includes(data.ctaQuestion.toLocaleLowerCase("pt-BR"))) {
    const narrationCore = data.narrationText.replace(/[\s.!?]+$/, "").trim();
    data.narrationText = `${narrationCore ? `${narrationCore}. ` : ""}${data.ctaQuestion}`;
  }
  data.ctaAction = "Comente sua resposta para continuar a conversa";
  data.ctaButton = "COMENTE ABAIXO";
  return data;
}
