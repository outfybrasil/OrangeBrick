import type { SupabaseClient } from "@supabase/supabase-js";
import { brazilDate, fallbackDailyPoll, validateDailyPollDraft, type DailyPollArticle, type DailyPollDraft } from "@/lib/daily-poll";

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

async function generateWithGroq(articles: DailyPollArticle[], previousQuestions: string[]) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY não configurada");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_DAILY_POLL_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.65,
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você é o editor de comunidade do Orange Brick, portal brasileiro de games. Crie uma pergunta opinativa, específica e equilibrada usando exclusivamente as notícias fornecidas. Não introduza fatos, datas, nomes ou rumores ausentes. A pergunta deve estimular debate sobre indústria, estratégia, tecnologia, jogos ou impacto para jogadores. Evite resposta factual óbvia, clickbait e linguagem genérica. Retorne somente JSON válido com question, options e sourcePostId. Use 3 ou 4 alternativas curtas, distintas e plausíveis." },
        { role: "user", content: JSON.stringify({ articles: articles.map((article) => ({ ...article, url: `/posts/${article.slug}` })), questionsUsedInLast14Days: previousQuestions }) },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json() as GroqResponse;
  if (!response.ok) throw new Error(data.error?.message || `Groq respondeu com HTTP ${response.status}`);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("A Groq retornou uma resposta vazia");
  return JSON.parse(content) as unknown;
}

async function loadArticles(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("posts").select("id,title,summary,category,slug,published_at").eq("is_published", true).gte("published_at", cutoff).order("published_at", { ascending: false }).limit(8);
  if (error) throw new Error(`Falha ao carregar matérias: ${error.message}`);
  return (data || []).filter((post) => post.published_at).map((post) => ({ id: post.id, title: post.title, summary: post.summary, category: post.category, slug: post.slug, publishedAt: post.published_at as string })) as DailyPollArticle[];
}

async function loadPreviousQuestions(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("community_polls").select("question").gte("created_at", cutoff).order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao carregar perguntas anteriores: ${error.message}`);
  return (data || []).map((poll) => poll.question as string);
}

export async function generateDailyPoll(supabase: SupabaseClient, force = false) {
  const promptDate = brazilDate();
  const { data: existing, error: existingError } = await supabase.from("community_polls").select("id,question,options,prompt_date,is_active").eq("prompt_date", promptDate).maybeSingle();
  if (existingError) throw new Error(`Falha ao verificar a pergunta de hoje: ${existingError.message}`);
  if (existing && !force) return { poll: existing, created: false, sourcePostId: null, usedFallback: false, fallbackReason: null };
  const articles = await loadArticles(supabase);
  if (!articles.length) throw new Error("Não há matérias publicadas nas últimas 72 horas para contextualizar a pergunta");
  const previousQuestions = await loadPreviousQuestions(supabase);
  let draft: DailyPollDraft;
  let usedFallback = false;
  let fallbackReason: string | null = null;
  try {
    draft = validateDailyPollDraft(await generateWithGroq(articles, previousQuestions), articles, previousQuestions);
  } catch (error) {
    draft = fallbackDailyPoll(articles[0], previousQuestions);
    usedFallback = true;
    fallbackReason = error instanceof Error ? error.message : "Resposta inválida da IA";
  }
  const options = draft.options.map((text, index) => ({ id: index, text }));
  const expiresAt = new Date(`${promptDate}T23:59:59-03:00`).toISOString();
  const { error: deactivateError } = await supabase.from("community_polls").update({ is_active: false }).eq("is_active", true).neq("prompt_date", promptDate);
  if (deactivateError) throw new Error(`Falha ao encerrar a pergunta anterior: ${deactivateError.message}`);
  const payload = { question: draft.question, options, prompt_date: promptDate, expires_at: expiresAt, is_active: true };
  const query = existing ? supabase.from("community_polls").update(payload).eq("id", existing.id) : supabase.from("community_polls").insert(payload);
  const { data: poll, error: saveError } = await query.select("id,question,options,prompt_date,is_active,expires_at").single();
  if (saveError) throw new Error(`Falha ao salvar a pergunta: ${saveError.message}`);
  return { poll, created: !existing, sourcePostId: draft.sourcePostId, usedFallback, fallbackReason };
}
