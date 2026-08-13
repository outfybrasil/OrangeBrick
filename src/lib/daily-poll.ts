export interface DailyPollArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  slug: string;
  publishedAt: string;
}

export interface DailyPollDraft {
  question: string;
  options: string[];
  sourcePostId: string;
}

const genericWords = new Set(["a", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "que", "um", "uma"]);
const unsupportedEnglishTerms = /\b(?:budget|deadline|engine|feature|feedback|gameplay loop|hardware sales|insider|live service|marketing budget|publisher|roadmap)\b/i;

export function brazilDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizePollText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function pollSimilarity(first: string, second: string) {
  const words = (value: string) => new Set(normalizePollText(value).split(" ").filter((word) => word.length > 2 && !genericWords.has(word)));
  const left = words(first);
  const right = words(second);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((word) => right.has(word)).length;
  return intersection / new Set([...left, ...right]).size;
}

export function validateDailyPollDraft(value: unknown, articles: DailyPollArticle[], previousQuestions: string[]): DailyPollDraft {
  if (!value || typeof value !== "object") throw new Error("A IA não retornou uma enquete válida");
  const candidate = value as Record<string, unknown>;
  const question = typeof candidate.question === "string" ? candidate.question.trim() : "";
  const sourcePostId = typeof candidate.sourcePostId === "string" ? candidate.sourcePostId : "";
  const options = Array.isArray(candidate.options) ? candidate.options.filter((option): option is string => typeof option === "string").map((option) => option.trim()) : [];
  if (question.length < 25 || question.length > 180 || !question.endsWith("?")) throw new Error("A pergunta gerada está fora do formato editorial");
  if (options.length < 3 || options.length > 4 || options.some((option) => option.length < 2 || option.length > 80)) throw new Error("As alternativas geradas estão fora do formato editorial");
  if (unsupportedEnglishTerms.test([question, ...options].join(" "))) throw new Error("A IA usou termos em inglês sem tradução");
  if (new Set(options.map(normalizePollText)).size !== options.length) throw new Error("A IA gerou alternativas repetidas");
  if (!articles.some((article) => article.id === sourcePostId)) throw new Error("A IA escolheu uma matéria fora do contexto fornecido");
  if (previousQuestions.some((previous) => normalizePollText(previous) === normalizePollText(question) || pollSimilarity(previous, question) >= 0.6)) throw new Error("A IA repetiu uma pergunta recente");
  return { question, options, sourcePostId };
}

export function fallbackDailyPoll(article: DailyPollArticle, previousQuestions: string[]): DailyPollDraft {
  const title = article.title.replace(/\s+/g, " ").trim();
  const primary = `Qual é o impacto mais importante de “${title.slice(0, 90)}” para a indústria de jogos?`;
  const question = previousQuestions.some((previous) => pollSimilarity(previous, primary) >= 0.6)
    ? `O que a notícia “${title.slice(0, 90)}” deveria mudar primeiro no mercado de games?`
    : primary;
  const options = article.category === "hardware"
    ? ["Preço para o consumidor", "Adoção da tecnologia", "Concorrência entre plataformas", "Preservação e suporte"]
    : ["Estratégia das empresas", "Experiência dos jogadores", "Concorrência do mercado", "Futuro da franquia"];
  return { question, options, sourcePostId: article.id };
}
