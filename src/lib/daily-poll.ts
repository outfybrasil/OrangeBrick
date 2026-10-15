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
  const article = articles.find((article) => article.id === sourcePostId);
  if (!article) throw new Error("A IA escolheu uma matéria fora do contexto fornecido");
  const normalizedQuestion = normalizePollText(question);
  if (/qual.*impacto.*(industria|mercado)|o que.*(noticia|anuncio).*deveria mudar|voce esta animad|qual.*sua opiniao|o que voce acha|como voce avalia.*(noticia|anuncio)/.test(normalizedQuestion)) throw new Error("A pergunta é genérica: pergunte sobre uma decisão concreta ligada ao acontecimento.");
  const contextWords = new Set(normalizePollText(`${article.title} ${article.summary}`).split(" ").filter(word => word.length >= 3 && !/^\d+$/.test(word) && !genericWords.has(word) && !/^(novo|nova|jogo|jogos|games|noticia|anuncio|revela|ganha|recebe|trailer|oficial|lancamento|primeiro|primeira|detalhes)$/.test(word)));
  if (![...contextWords].some(word => normalizedQuestion.split(" ").includes(word))) throw new Error("A pergunta não identifica o jogo, produto ou acontecimento da matéria escolhida.");
  const emptyOptions = new Set(["sim", "nao", "talvez", "nao sei", "depende", "muito", "pouco", "estrategia das empresas", "experiencia dos jogadores", "concorrencia do mercado", "futuro da franquia", "preco para o consumidor", "adocao da tecnologia", "concorrencia entre plataformas", "preservacao e suporte"]);
  if (options.filter(option => emptyOptions.has(normalizePollText(option))).length >= 2) throw new Error("As alternativas são genéricas: descreva escolhas concretas e equilibradas para este acontecimento.");
  if (previousQuestions.some((previous) => normalizePollText(previous) === normalizePollText(question) || pollSimilarity(previous, question) >= 0.6)) throw new Error("A IA repetiu uma pergunta recente");
  return { question, options, sourcePostId };
}

export function fallbackDailyPoll(article: DailyPollArticle, previousQuestions: string[]): DailyPollDraft {
  const title = article.title.replace(/\s+/g, " ").trim();
  const context = normalizePollText(title);
  const anchor = `“${title.slice(0, 85).replace(/\s+\S*$/, title.length > 85 ? "…" : "$&")}”`;
  const templates: Array<{ matches: RegExp; questions: string[]; options: string[]; hardwareOnly?: boolean; gameOnly?: boolean }> = [
    { matches: /\b(aument[oa]|reajuste|mais caro|encarece|alta de preco)\b/, questions: [`Com ${anchor}, como fica seu plano de compra ou assinatura?`, `Diante de ${anchor}, qual será sua próxima decisão de consumo?`], options: ["Manter a compra ou assinatura planejada", "Esperar uma promoção ou redução do preço", "Procurar uma alternativa mais barata", "Esse produto ou serviço não está nos meus planos"] },
    { matches: /\b(adiad[oa]|adiamento|adia|atras[oa])\b/, questions: [`Após ${anchor}, você pretende esperar o lançamento?`, `${anchor}: o adiamento muda seus planos de jogar?`], options: ["Vou esperar para jogar quando sair", "Vou priorizar outro jogo enquanto espero", "Vou decidir apenas depois das análises", "Já não estava nos meus planos jogar"] },
    { matches: /\b(trailer|teaser)\b/, questions: [`${anchor}: como você pretende acompanhar esse vídeo?`, `Depois de ${anchor}, você vai assistir à apresentação?`], options: ["Vou assistir ao vídeo completo", "Vou conferir só os principais trechos", "Prefiro esperar outra apresentação", "Não pretendo acompanhar esse vídeo"] },
    { matches: /\b(switch|playstation|xbox|pc)\b.*\b(recebe|recebera)\b|\b(chega|chegam|estreia|estreiam|port|versao)\b.*\b(switch|playstation|xbox|pc)\b/, questions: [`${anchor}: essa versão entra nos seus planos de jogar?`, `Após ${anchor}, você pretende experimentar essa versão?`], options: ["Quero jogar nessa plataforma", "Prefiro jogar em outra plataforma", "Vou esperar avaliações dessa versão", "Não pretendo jogar esse título"] },
    { matches: /\b(dlc|expansao|conteudo adicional)\b/, questions: [`${anchor}: você pretende voltar ao jogo por esse conteúdo?`, `Com ${anchor}, como ficam seus planos para esse conteúdo?`], options: ["Quero jogar esse conteúdo quando estiver disponível", "Vou esperar avaliações ou uma promoção", "Prefiro continuar no conteúdo que já tenho", "Não jogo esse título"] },
    { matches: /\b(encerra|encerramento|desliga servidores|fechamento de)\b/, questions: [`Após ${anchor}, o que você pretende fazer?`, `${anchor}: como você vai lidar com esse encerramento?`], options: ["Aproveitar o que ainda estiver disponível", "Procurar outra opção para substituir", "Esperar informações sobre alternativas oficiais", "Esse encerramento não afeta o que uso"] },
    { hardwareOnly: true, matches: /\b(lancamento|lanca|estreia|anuncia|apresenta)\b/, questions: [`${anchor}: o que você pretende fazer antes de comprar?`, `Com ${anchor}, esse equipamento entra nos seus planos?`], options: ["Quero comprar quando estiver disponível", "Vou esperar testes e comparações", "Vou manter o equipamento que já tenho", "Não preciso desse tipo de equipamento"] },
    { gameOnly: true, matches: /\b(lancamento|lanca|estreia|data de lancamento)\b/, questions: [`${anchor}: quando você pretende decidir se vai jogar?`, `Com ${anchor}, o que você fará antes de decidir jogar?`], options: ["Quero jogar assim que estiver disponível", "Vou esperar análises e impressões de jogadores", "Vou aguardar uma promoção", "Não pretendo jogar esse título"] },
  ];
  for (const template of templates) {
    if (template.hardwareOnly && article.category !== "hardware" || template.gameOnly && article.category === "hardware" || !template.matches.test(context)) continue;
    for (const question of template.questions) {
      try { return validateDailyPollDraft({ question, options: template.options, sourcePostId: article.id }, [article], previousQuestions); } catch {}
    }
  }
  throw new Error("Não há um modelo específico e inédito para o acontecimento desta matéria.");
}

export async function createDailyPollDraft(
  articles: DailyPollArticle[],
  previousQuestions: string[],
  generate: (feedback: string | null) => Promise<unknown>,
  attempts = 2,
): Promise<{ draft: DailyPollDraft; usedFallback: boolean; fallbackReason: string | null }> {
  let feedback: string | null = attempts === 0 ? "Serviço de IA indisponível; modelo contextual usado." : null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { return { draft: validateDailyPollDraft(await generate(feedback), articles, previousQuestions), usedFallback: false, fallbackReason: null }; }
    catch (error) { feedback = error instanceof Error ? error.message : "A enquete não passou na validação editorial."; }
  }
  for (const article of articles) {
    try { return { draft: fallbackDailyPoll(article, previousQuestions), usedFallback: true, fallbackReason: feedback }; } catch {}
  }
  throw new Error("Não foi possível criar uma enquete específica e inédita com as matérias disponíveis. Nenhuma pergunta genérica foi publicada.");
}
