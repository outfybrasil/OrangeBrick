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

export interface ReelScriptOptions {
  provider?: "auto" | "gemini" | "groq";
}

const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
];
const MAX_ROUNDS = 4;
const RETRY_BASE_MS = 10_000;
const GROQ_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
const DANGLING_ENDING = /\b(?:de|do|da|dos|das|em|no|na|nos|nas|para|por|com|que|e|ou|mas|a|o|as|os|um|uma|seu|sua|seus|suas|entre|sobre|até|após|antes|durante)\s*[.!?]*$/iu;
const CATEGORY_LABELS: Record<string, string> = {
  breaking: "PLANTÃO",
  hardware: "HARDWARE",
  industry: "INDÚSTRIA",
  modding: "GAMBIARRA",
  review: "REVIEW",
  opinion: "OPINIÃO",
};

function hasIncompleteText(value: string) {
  return /…|\.{3}/u.test(value) || value.split(/(?<=[.!?])\s+/u).some((sentence) => DANGLING_ENDING.test(sentence.trim()));
}

function cleanLabel(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (/…|\.{3}/u.test(text)) return "";
  return text.replace(/[\s:;,.!?–—-]+$/u, "").trim();
}

function fitLabel(value: string, limit: number, fallback: string) {
  const text = cleanLabel(value);
  if (!text) return fallback;
  if (Array.from(text).length > limit || hasIncompleteText(text)) return fallback;
  return text;
}

function fitPill(value: string, limit: number) {
  const text = cleanLabel(value);
  if (!text) return "";
  if (Array.from(text).length > limit || hasIncompleteText(text)) return "";
  return text;
}

function fitText(value: string, limit: number, field = "texto") {
  const text = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(text);
  if (characters.length > limit) throw new Error(`O campo ${field} excedeu o limite de ${limit} caracteres.`);
  if (hasIncompleteText(text)) {
    throw new Error(`O campo ${field} termina antes de concluir a ideia.`);
  }
  return text;
}

function shortenComplete(value: string, limit: number) {
  const words = value.split(" ").filter(Boolean);
  while (words.length > 0) {
    const candidate = words.join(" ");
    if (Array.from(candidate).length <= limit && !hasIncompleteText(candidate)) return candidate;
    words.pop();
  }
  return "";
}

function fitDisplayText(value: string, limit: number, field: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (/…|\.{3}/u.test(text)) return fitText(text, limit, field);
  if (Array.from(text).length <= limit && !hasIncompleteText(text)) return text;
  const shortened = shortenComplete(text.replace(/[\s:;,.!?–—-]+$/u, "").trim(), limit);
  const minimum = Math.min(4, Array.from(text).length);
  if (
    shortened &&
    Array.from(shortened).length >= minimum &&
    Array.from(shortened).length >= Math.ceil(Array.from(text).length * 0.6)
  ) {
    console.warn(`[ReelScript] ${field} ajustado de ${Array.from(text).length} para ${Array.from(shortened).length} caracteres.`);
    return shortened;
  }
  return fitText(text, limit, field);
}

function categoryLabel(post: Post) {
  return CATEGORY_LABELS[post.category] || "GAMES";
}

function articleBodyText(body: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return body.trim();
  }
  if (!Array.isArray(parsed)) return body.trim();
  return parsed
    .filter((block): block is { type: "text"; content: string } =>
      typeof block === "object" && block !== null && "type" in block && block.type === "text" && "content" in block && typeof block.content === "string")
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

function contextualCommentQuestion(post: Post): string {
  const releaseTitle = post.title.match(/^(.*?)\s+(?:chega|estreia|lança|recebe|ganha)\b/i)?.[1]?.trim();
  if (
    releaseTitle &&
    Array.from(releaseTitle).length <= 22 &&
    post.category === "breaking" &&
    /\b(?:estreia|lançamento|data de lançamento|chega em)\b/i.test(post.summary) &&
    !/\b(?:playstation|ps[45]|xbox|nintendo|switch|sony|microsoft|ubisoft|steam)\b/i.test(releaseTitle)
  ) {
    return `Você pretende jogar ${releaseTitle} no lançamento?`;
  }
  if (/\b(?:preço|valor|custa|custará)\b/i.test(post.summary)) return "Esse preço mudaria sua decisão de compra?";
  if (/\b(?:demissões|fechamento|fechar|encerrar|aquisição)\b/i.test(post.summary)) return "Como essa decisão pode afetar os jogos do estúdio?";
  if (/\b(?:atualização|patch|correção)\b/i.test(post.summary)) return "Essa mudança melhora sua experiência?";
  if (/\b(?:fps|resolução|dlss|dock|portátil|frames|gráficos|taxa de quadros)\b/i.test(post.summary)) {
    return "Esse desempenho muda sua expectativa para o jogo?";
  }
  return "Qual detalhe dessa notícia mais impacta você?";
}

function buildScriptPrompt(post: Post, sourceBody: string): string {
  return `Você é editor de vídeos curtos de games para o Orange Brick. Crie um roteiro vertical de 35 a 45 segundos que capture atenção, mantenha retenção e incentive participação e audiência recorrente, sem prometer viralização nem usar clickbait.

TÍTULO: ${post.title}
CATEGORIA: ${post.category}
RESUMO: ${post.summary}
CONTEÚDO:
${sourceBody}

REGRAS:
1. A primeira fala deve ser o gancho, com um fato concreto, consequência ou dúvida real que o próprio vídeo responde. Repita a mesma ideia na primeira tela. Comece direto, sem vinheta, saudação ou apresentação do canal.
2. Conte uma única história nesta ordem: gancho, fato principal, contexto que muda a leitura, impacto para quem joga e conclusão. Use surpresa, curiosidade ou debate apenas quando os fatos sustentarem esse ângulo. Entregue a resposta antes do fim; não esconda informação para forçar retenção.
3. Escreva de 75 a 95 palavras faladas em português brasileiro natural para preservar o fato, o contexto e o impacto. Use frases curtas, com no máximo 22 palavras cada, ritmo oral e tom adequado à categoria. Em breaking, hardware e industry, seja jornalístico e factual; em opinion, deixe a opinião clara.
4. Termine com uma pergunta específica sobre o assunto que convide a comentar. A pergunta final deve ser a mesma do campo ctaQuestion e conta no limite de 75 a 95 palavras da narração. Não peça para seguir, curtir, salvar e compartilhar ao mesmo tempo; a fala deve ter um único CTA de conversa. As chamadas para seguir e acessar a matéria ficam nas descrições específicas de cada plataforma.
5. Preserve rigorosamente o status e os limites dos fatos: proposta não é decisão concluída; “até X” não é total confirmado; cargos afetados não significam necessariamente demissões concluídas. Não misture números de processos diferentes nem transforme “propõe” ou “pode afetar” em “fechou” ou “demitiu”.
6. Crie exatamente 5 cenas alinhadas à narração: revelação, detalhe principal, contexto, impacto e conclusão/próximo passo. Só mostre plataformas, datas, números, decisões e declarações que apareçam na matéria. Se um dado não existir, use contexto ou impacto; nunca invente nem preencha com informação genérica.
7. Escreva textos de tela curtos e legíveis no celular: gancho com até 55 caracteres; títulos de cena com até 36; destaques com até 48; tags com até 18; no máximo 3 pílulas curtas por cena. Use pílulas apenas para fatos confirmados. Evite repetir a mesma frase em todas as telas.
8. A pergunta final e o CTA devem ser específicos ao assunto. Convide a pessoa a responder nos comentários, sem prometer frequência ou resultado e sem direcionar para outra plataforma.
9. Nunca use reticências nem corte uma frase ou informação para caber. Reescreva de forma concisa, preservando a ideia completa. Nenhum texto pode terminar com preposição, artigo ou conjunção que dependa de continuação.

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "hook": "Frase de gancho curta para o topo",
  "headline": "TÍTULO DE IMPACTO EM MAIÚSCULAS",
  "subHeadline": "SUBTÍTULO EM DESTAQUE",
  "badge": "CATEGORIA",
  "narrationText": "Narração factual completa, com pergunta específica e convite para comentar no final",
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
}

function buildReviewPrompt(post: Post, sourceBody: string, draft: ReelScriptData): string {
  return `Revise editorialmente o roteiro antes da renderização. Compare cada informação com a matéria. Preserve o fato principal, o contexto e o impacto; corrija qualquer frase, cena ou dado incompleto. Não invente, não altere números, datas, autoria, status de anúncio ou grau de certeza. Nunca use reticências nem corte texto para caber: reescreva sem perder a ideia. A narração final deve ter de 75 a 95 palavras, no máximo 22 palavras por frase, e terminar com uma pergunta completa que seja a mesma do campo ctaQuestion; a pergunta conta nesse limite. Os limites dos textos de tela são: gancho 55 caracteres, título principal 48, subtítulo 64, selo 24, título de cena 36, destaque 48, tag 18 e pílula 18. Mantenha exatamente cinco cenas e o mesmo formato JSON. Retorne somente o JSON revisado.\n\nMATÉRIA\nTítulo: ${post.title}\nResumo: ${post.summary}\nConteúdo: ${sourceBody}\n\nROTEIRO PARA REVISÃO\n${JSON.stringify(draft)}`;
}

function buildRepairPrompt(post: Post, invalid: string, error: string): string {
  return `O roteiro JSON abaixo foi reprovado na validação automática antes da renderização.
ERRO: ${error}

Corrija apenas o que viola as regras e preserve integralmente o fato principal, o contexto, o impacto, os números, as datas, a autoria, o status do anúncio e o grau de certeza. Não invente informação. A narração final deve ter de 75 a 95 palavras, com no máximo 22 palavras por frase, terminar com uma pergunta completa que seja a mesma do campo ctaQuestion e um convite para comentar; a pergunta conta nesse limite. Os limites dos textos de tela são: gancho 55 caracteres, título principal 48, subtítulo 64, selo 24, título de cena 36, destaque 48, tag 18 e pílula 18. Mantenha exatamente cinco cenas e o mesmo formato JSON. Nunca use reticências nem termine uma frase com preposição, artigo ou conjunção. Retorne somente o JSON completo corrigido.

MATÉRIA
Título: ${post.title}
Resumo: ${post.summary}

ROTEIRO REPROVADO
${invalid || JSON.stringify({ post: post.title, summary: post.summary })}`;
}

function normalizeNarrationQuestion(narration: string, question: string) {
  const sentences = narration.trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
  let questionIndex = -1;
  for (let index = sentences.length - 1; index >= 0; index--) {
    if (sentences[index].trim().endsWith("?")) {
      questionIndex = index;
      break;
    }
  }
  if (questionIndex < 0) return `${sentences.join(" ")} ${question}`.trim();
  if (sentences[questionIndex].trim() === question) {
    if (questionIndex === sentences.length - 1) return sentences.join(" ");
    const normalizedQuestion = sentences.splice(questionIndex, 1)[0];
    sentences.push(normalizedQuestion);
    return sentences.join(" ");
  }
  sentences[questionIndex] = question;
  if (questionIndex !== sentences.length - 1) {
    const normalizedQuestion = sentences.splice(questionIndex, 1)[0];
    sentences.push(normalizedQuestion);
  }
  return sentences.join(" ");
}

function narrationWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function splitNarrationSentences(value: string) {
  return value.trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
}

const NARRATION_SPLIT_MARKERS = [", mas ", ", e ", ", porque ", ", enquanto ", ", já que ", ", porém ", ", contudo ", ", embora ", "; "];
const NARRATION_FILLERS = [
  /(?:^|(?<=[.!?])\s+)além disso,\s*/giu,
  /(?:^|(?<=[.!?])\s+)nesse sentido,\s*/giu,
  /(?:^|(?<=[.!?])\s+)neste sentido,\s*/giu,
  /(?:^|(?<=[.!?])\s+)na prática,\s*/giu,
  /(?:^|(?<=[.!?])\s+)basicamente,\s*/giu,
  /(?:^|(?<=[.!?])\s+)vale (?:destacar|lembrar|ressaltar) que\s*/giu,
  /(?:^|(?<=[.!?])\s+)é importante (?:destacar|lembrar|ressaltar) que\s*/giu,
  /(?:^|(?<=[.!?])\s+)é bom (?:lembrar|destacar) que\s*/giu,
];

function findNarrationSplit(sentence: string) {
  const lower = sentence.toLocaleLowerCase("pt-BR");
  let best: { index: number; length: number; marker: string; balance: number } | null = null;
  for (const marker of NARRATION_SPLIT_MARKERS) {
    let index = lower.indexOf(marker);
    while (index >= 0) {
      const left = sentence.slice(0, index).trim();
      const right = sentence.slice(index + marker.length).trim();
      const leftWords = narrationWords(left);
      const rightWords = narrationWords(right);
      if (leftWords >= 4 && rightWords >= 4 && leftWords <= 22 && rightWords <= 22) {
        const balance = Math.abs(leftWords - rightWords);
        if (!best || balance < best.balance) best = { index, length: marker.length, marker, balance };
      }
      index = lower.indexOf(marker, index + 1);
    }
  }
  return best;
}

function splitLongNarrationSentences(value: string) {
  const sentences = splitNarrationSentences(value);
  const output: string[] = [];
  for (const sentence of sentences) {
    let current = sentence.trim();
    let guard = 0;
    while (narrationWords(current) > 22 && guard < 6) {
      const split = findNarrationSplit(current);
      if (!split) break;
      output.push(current.slice(0, split.index).trim());
      const conjunction = split.marker.replace(/^[,\s;]+/u, "").trim();
      const rest = current.slice(split.index + split.length).trim();
      current = `${conjunction ? `${conjunction.charAt(0).toLocaleUpperCase("pt-BR")} ` : ""}${rest}`;
      guard++;
    }
    if (current) output.push(current);
  }
  return output.join(" ");
}

function trimNarrationSentences(value: string, maxWords = 95) {
  const sentences = splitNarrationSentences(value);
  const originalWords = narrationWords(value);
  let currentWords = originalWords;
  while (currentWords > maxWords && sentences.length > 3) {
    let candidateIndex = -1;
    let candidateWords = Number.POSITIVE_INFINITY;
    for (let index = 1; index < sentences.length - 1; index++) {
      const words = narrationWords(sentences[index]);
      if (words < candidateWords) {
        candidateWords = words;
        candidateIndex = index;
      }
    }
    if (candidateIndex < 0) break;
    const remaining = currentWords - candidateWords;
    if (remaining < 75) break;
    sentences.splice(candidateIndex, 1);
    currentWords = remaining;
  }
  return sentences.join(" ");
}

function capitalizeNarrationSentences(value: string) {
  return splitNarrationSentences(value)
    .map((sentence) => {
      const trimmed = sentence.trim();
      return trimmed ? `${trimmed.charAt(0).toLocaleUpperCase("pt-BR")}${trimmed.slice(1)}` : "";
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeNarration(value: string) {
  const originalWords = narrationWords(value);
  let narration = value;
  if (originalWords > 95) {
    for (const filler of NARRATION_FILLERS) narration = narration.replace(filler, "");
    narration = splitLongNarrationSentences(narration);
    narration = trimNarrationSentences(narration);
  } else {
    narration = splitLongNarrationSentences(narration);
  }
  narration = capitalizeNarrationSentences(narration);
  const finalWords = narrationWords(narration);
  if (finalWords !== originalWords) {
    console.warn(`[ReelScript] narração ajustada de ${originalWords} para ${finalWords} palavras.`);
  }
  return narration;
}

function parseScript(raw: string, post: Post): ReelScriptData {
  const cleaned = raw.replace(/```json\n?|```/g, "").trim();
  const data = JSON.parse(cleaned) as ReelScriptData;
  if (!data.narrationText?.trim() || !Array.isArray(data.scenes) || data.scenes.length !== 5) {
    throw new Error("Roteiro retornado pelo Gemini está incompleto.");
  }
  data.hook = fitDisplayText(data.hook || data.scenes[0]?.headline || data.headline || "", 55, "gancho");
  if (!data.hook || /frase de gancho/i.test(data.hook)) throw new Error("Roteiro retornado pelo Gemini não tem um gancho válido.");
  data.headline = fitDisplayText(data.headline || data.hook, 48, "título principal");
  data.subHeadline = fitDisplayText(data.subHeadline || "", 64, "subtítulo");
  data.badge = fitLabel(data.badge || "", 24, categoryLabel(post));
  data.scenes = data.scenes.map((scene, index) => {
    const sceneNumber = index + 1;
    return {
      ...scene,
      id: `scene${sceneNumber}`,
      headline: fitDisplayText(scene.headline || "", 36, `título da cena ${sceneNumber}`),
      highlight: fitDisplayText(scene.highlight || "", 48, `destaque da cena ${sceneNumber}`),
      tag: fitLabel(scene.tag || "", 18, categoryLabel(post)),
      pills: Array.isArray(scene.pills)
        ? scene.pills
            .slice(0, 3)
            .filter((pill): pill is string => typeof pill === "string")
            .map((pill) => fitPill(pill, 18))
            .filter((pill): pill is string => Boolean(pill))
        : [],
    };
  });
  if (data.scenes.some((scene) => !scene.headline || !scene.highlight || !scene.tag)) {
    throw new Error("Roteiro retornado pelo Gemini tem cenas sem texto essencial.");
  }
  data.narrationText = data.narrationText.trim()
    .replace(/\s*(?:Quer ver a mat[eé]ria completa\?\s*)?Acesse orangebrick\.blog\.?\s*$/i, "")
    .replace(/\s*Siga @ob\.labs no Instagram para mais notícias de games\.?\s*$/i, "")
    .replace(/\s*(?:O que você acha dessa mudança|Qual é a sua opinião sobre essa notícia|O que essa notícia muda para quem joga)\?\s*$/i, "")
    .trim();
  data.narrationText = data.narrationText.replace(/@OrangeBrick/gi, "@ob.labs");
  const candidateQuestion = typeof data.ctaQuestion === "string" ? data.ctaQuestion.replace(/\s+/g, " ").trim() : "";
  if (
    !candidateQuestion.endsWith("?") ||
    Array.from(candidateQuestion).length > 56 ||
    /…|\.{3}/u.test(candidateQuestion) ||
    /\b(?:de|do|da|dos|das|em|no|na|nos|nas|para|por|com|que|e|ou|mas|a|o|as|os|um|uma|seu|sua|seus|suas|entre|sobre|até|após|antes|durante)\s*\?$/iu.test(candidateQuestion) ||
    /pergunta específica|impacto para quem joga/i.test(candidateQuestion) ||
    /^(?:o que você acha dessa mudança|qual é a sua opinião sobre essa notícia|o que essa notícia muda para quem joga)\?$/i.test(candidateQuestion)
  ) {
    data.ctaQuestion = contextualCommentQuestion(post);
  } else {
    data.ctaQuestion = fitText(candidateQuestion, 56, "pergunta final");
  }
  data.narrationText = normalizeNarrationQuestion(data.narrationText, data.ctaQuestion);
  data.narrationText = normalizeNarration(data.narrationText);
  data.narrationText = fitText(data.narrationText, 1200, "narração");
  const narrationWordCount = narrationWords(data.narrationText);
  const longestSentence = Math.max(0, ...splitNarrationSentences(data.narrationText).map((sentence) => narrationWords(sentence)));
  if (narrationWordCount < 75 || narrationWordCount > 95 || longestSentence > 22 || !/[.!?]$/u.test(data.narrationText)) {
    throw new Error(`A narração está incompleta ou tem frases longas (${narrationWordCount} palavras; maior frase com ${longestSentence}).`);
  }
  data.ctaAction = "Comente sua resposta para continuar a conversa";
  data.ctaButton = "COMENTE ABAIXO";
  return data;
}

function parseScriptDraft(raw: string): ReelScriptData {
  const cleaned = raw.replace(/```json\n?|```/g, "").trim();
  const data = JSON.parse(cleaned) as ReelScriptData;
  if (typeof data.narrationText !== "string" || !Array.isArray(data.scenes) || data.scenes.length !== 5) {
    throw new Error("O primeiro roteiro retornado pelo Gemini está incompleto.");
  }
  return data;
}

async function generateValidatedScript(
  post: Post,
  sourceBody: string,
  generate: (prompt: string, temperature?: number) => Promise<string>,
  label: string,
  draftTemperature = 0.45,
): Promise<ReelScriptData> {
  const draftText = await generate(buildScriptPrompt(post, sourceBody), draftTemperature);
  let validDraft: ReelScriptData | null = null;
  try {
    validDraft = parseScript(draftText, post);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Roteiro inválido.";
    console.warn(`[ReelScript] ${label}: rascunho reprovado (${message.slice(0, 160)}). Solicitando revisão...`);
  }

  let reviewText: string;
  try {
    const draft = parseScriptDraft(draftText);
    reviewText = await generate(buildReviewPrompt(post, sourceBody, draft), 0.2);
  } catch (error) {
    if (validDraft) {
      const message = error instanceof Error ? error.message : "revisão indisponível";
      console.warn(`[ReelScript] ${label}: revisão indisponível (${message.slice(0, 160)}). Usando o rascunho validado.`);
      return validDraft;
    }
    throw error;
  }

  try {
    return parseScript(reviewText, post);
  } catch (validationError) {
    const message = validationError instanceof Error ? validationError.message : "Roteiro inválido.";
    console.warn(`[ReelScript] ${label} reprovado (${message}). Tentando reparo...`);
    try {
      const repaired = await generate(buildRepairPrompt(post, reviewText, message), 0.2);
      return parseScript(repaired, post);
    } catch (repairError) {
      const repairMessage = repairError instanceof Error ? repairError.message : "Roteiro inválido.";
      if (validDraft) {
        console.warn(`[ReelScript] ${label}: reparo falhou (${repairMessage.slice(0, 160)}). Usando o rascunho validado.`);
        return validDraft;
      }
      if (repairError instanceof Error && "status" in repairError) throw repairError;
      throw new Error(`O roteiro continuou inválido após o reparo: ${repairMessage}`);
    }
  }
}

function isDailyQuotaError(error: Error & { status?: number }) {
  return error.status === 429 && /(?:free_tier_requests|retry in \d+[hm])/i.test(error.message);
}

async function generateGeminiScript(post: Post, sourceBody: string, apiKey: string): Promise<ReelScriptData> {
  const gemini = new GoogleGenAI({ apiKey, httpOptions: { timeout: 45_000, retryOptions: { attempts: 1 } } });
  const cooldowns = new Map<string, number>();
  let lastError: Error | null = null;
  const models = [...CANDIDATE_MODELS];

  for (let round = 0; round < MAX_ROUNDS && models.length > 0; round++) {
    if (round > 0) {
      const waitMs = RETRY_BASE_MS * round;
      console.warn(`[ReelScript] Todos os modelos ocupados. Nova tentativa em ${waitMs / 1000}s (rodada ${round + 1}/${MAX_ROUNDS})...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    for (const model of [...models]) {
      if ((cooldowns.get(model) || 0) > Date.now()) continue;
      const generate = (contents: string, temperature = 0.3) =>
        gemini.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            temperature,
            maxOutputTokens: 4096,
          },
        }).then((response) => response.text || "");
      try {
        return await generateValidatedScript(post, sourceBody, generate, model);
      } catch (err) {
        lastError = err as Error;
        const status = (err as { status?: number })?.status;
        const index = models.indexOf(model);
        if (status === 404 || status === 400) {
          if (index >= 0) models.splice(index, 1);
        } else if (status === 429) {
          if (isDailyQuotaError(lastError)) {
            if (index >= 0) models.splice(index, 1);
          } else {
            cooldowns.set(model, Date.now() + 30_000);
          }
        } else if (status === 503 || status === 504) {
          cooldowns.set(model, Date.now() + 15_000);
        }
        const reason = status ? String(status) : lastError.message.slice(0, 160);
        console.warn(`[ReelScript] Modelo ${model} falhou (${reason}). Tentando próximo...`);
      }
    }
  }

  throw lastError || new Error("Falha ao gerar roteiro com todos os modelos Gemini disponíveis.");
}

async function callGroq(apiKey: string, prompt: string, temperature: number): Promise<string> {
  const failures: string[] = [];
  const models = [
    (typeof process !== "undefined" ? process.env.REELS_GROQ_MODEL : undefined) || GROQ_MODELS[0],
    ...GROQ_MODELS.slice(1),
  ].filter((model, index, list) => list.indexOf(model) === index);
  for (const model of models) {
    for (const jsonMode of [true, false]) {
      let response: Response;
      try {
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature,
            max_completion_tokens: 4096,
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
            messages: [
              { role: "system", content: "Você é editor de vídeos curtos de games do Orange Brick. Responda exclusivamente com JSON válido." },
              { role: "user", content: prompt },
            ],
          }),
          signal: AbortSignal.timeout(90_000),
        });
      } catch (error) {
        failures.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
        break;
      }

      if (response.ok) {
        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content || "";
        if (content.trim()) return content;
        failures.push(`${model}: resposta vazia`);
        continue;
      }

      const errorBody = (await response.text().catch(() => "")).slice(0, 120);
      failures.push(`${model}: HTTP ${response.status} ${errorBody}`);
      if (response.status === 400 && jsonMode) continue;
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Groq recusou a chave (${response.status}).`);
      }
      break;
    }
    console.warn(`[ReelScript] Groq ${model} indisponível. Tentando próximo...`);
  }
  throw new Error(`Groq não conseguiu gerar o roteiro. ${failures.join(" | ")}`);
}

async function generateGroqScript(post: Post, sourceBody: string, apiKey: string): Promise<ReelScriptData> {
  const generate = (contents: string, temperature = 0.3) => callGroq(apiKey, contents, temperature);
  return generateValidatedScript(post, sourceBody, generate, "Groq", 0.35);
}

export async function generateReelScript(post: Post, apiKey: string, options: ReelScriptOptions = {}): Promise<ReelScriptData> {
  const sourceBody = articleBodyText(post.body);
  const provider = options.provider || "auto";
  let geminiError: Error | null = null;

  if (provider !== "groq") {
    try {
      return await generateGeminiScript(post, sourceBody, apiKey);
    } catch (error) {
      geminiError = error as Error;
      if (provider === "gemini") throw geminiError;
    }
  }

  const groqKey = typeof process !== "undefined" ? process.env.GROQ_API_KEY : undefined;
  if (groqKey) {
    try {
      return await generateGroqScript(post, sourceBody, groqKey);
    } catch (error) {
      const groqError = error instanceof Error ? error.message : String(error);
      const geminiMessage = geminiError ? ` Gemini: ${geminiError.message.slice(0, 180)}.` : "";
      throw new Error(`Não foi possível gerar o roteiro.${geminiMessage} Groq: ${groqError.slice(0, 180)}`);
    }
  }

  if (geminiError) throw geminiError;
  throw new Error("Não foi possível gerar o roteiro: nenhum provedor disponível.");
}
