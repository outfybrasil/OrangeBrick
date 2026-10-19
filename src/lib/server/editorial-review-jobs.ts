import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { reviewNewsDraft } from "../ai/gemini-news.ts";
import { validateStoredEditorialPost } from "../content-validation.ts";
import { inspectPublicationImagesInDatabase } from "./manual-publication-images.ts";
import type { Post } from "../types/database.ts";

export type EditorialReviewJob = {
  id: string; batch_id: string; post_id: string; expected_updated_at: string;
  actor_id: string; channel: "admin" | "telegram";
  status: "queued" | "running" | "completed" | "needs_review" | "failed" | "skipped";
  report: { title?: string; changes?: string[]; remaining?: string[] };
};

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000) }) },
  });
}

export async function enqueueEditorialReviews(ids: string[], actor: string, channel: "admin" | "telegram"): Promise<EditorialReviewJob[]> {
  const { data, error } = await client().rpc("enqueue_editorial_reviews", { p_ids: ids, p_actor: actor, p_channel: channel });
  if (error) throw new Error("Não foi possível iniciar a revisão automática. Tente novamente.");
  return (data || []) as EditorialReviewJob[];
}

export async function loadEditorialReviews(): Promise<EditorialReviewJob[]> {
  const { data, error } = await client().from("editorial_review_jobs").select("id,batch_id,post_id,expected_updated_at,actor_id,channel,status,report")
    .order("created_at", { ascending: false }).limit(150);
  if (error) throw new Error("Não foi possível carregar o andamento das revisões.");
  return (data || []) as EditorialReviewJob[];
}

export async function isAuthorizedEditorialDispatcher(request: Request): Promise<boolean> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const { data, error } = await client().from("editorial_review_dispatch_auth").select("secret_hash").eq("id", true).single();
  if (error || typeof data?.secret_hash !== "string") return false;
  const expected = Buffer.from(data.secret_hash, "hex");
  const actual = createHash("sha256").update(token).digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function processNextEditorialReview(): Promise<boolean> {
  const supabase = client();
  const token = randomUUID();
  const { data: claimed, error: claimError } = await supabase.rpc("claim_editorial_review", { p_token: token });
  if (claimError) throw new Error("Não foi possível adquirir a tarefa editorial.");
  const job = (claimed as EditorialReviewJob[] | null)?.[0];
  if (!job) return false;
  let candidate: Post | null = null;
  let status: "completed" | "needs_review" | "failed" = "needs_review";
  let title = "Matéria em revisão";
  let remaining: string[] = [];
  const changes: string[] = [];
  try {
    const { data: current, error } = await supabase.from("posts").select("*").eq("id", job.post_id).single();
    if (error || !current) throw new Error("A matéria não está disponível para revisão.");
    const post = current as Post;
    title = post.title;
    if (post.is_published || post.archived_at || Date.parse(post.updated_at) !== Date.parse(job.expected_updated_at)) {
      remaining = ["A matéria foi alterada ou publicada. Reabra a revisão para usar a versão atual."];
    } else {
      const result = await reviewNewsDraft(post);
      candidate = result.post;
      title = candidate.title;
      const images = await inspectPublicationImagesInDatabase([candidate], supabase);
      remaining = [...new Set([...validateStoredEditorialPost(candidate), ...(images.get(candidate.id) || [])])];
      if (candidate.title !== post.title) changes.push("Título revisado");
      if (candidate.summary !== post.summary) changes.push("Resumo revisado");
      if (candidate.body !== post.body) changes.push("Texto, imagens e legendas conferidos");
      if (candidate.image_url !== post.image_url) changes.push("Capa substituída");
      changes.push("Fontes relidas e afirmações conferidas", "Rascunho mantido sem agendamento");
      status = remaining.length ? "needs_review" : "completed";
    }
  } catch (error) {
    candidate = null;
    const message = error instanceof Error ? error.message : "";
    remaining = [/^(A checagem factual|A prova citada|A apuração|Nenhuma fonte específica|Nenhuma das fontes encontradas|Não foi possível ler uma fonte|A matéria não está disponível)/.test(message)
      ? message : "A IA ou uma das fontes não respondeu com uma correção verificável. O rascunho original foi mantido; tente novamente ou revise manualmente."];
  }
  const report = { title, changes, remaining };
  const { data: finalStatus, error: saveError } = await supabase.rpc("finish_editorial_review", {
    p_job: job.id, p_token: token, p_candidate: candidate, p_report: report, p_status: status,
  });
  if (saveError) throw new Error("A revisão não pôde ser salva com segurança. A fila tentará novamente.");
  if (candidate && finalStatus !== "skipped" && resultImageUrls(candidate).length) {
    await supabase.from("editorial_images").update({ post_id: job.post_id, updated_at: new Date().toISOString() }).is("post_id", null).in("public_url", resultImageUrls(candidate));
  }
  if (job.channel === "telegram") {
    const { sendTelegramMessageWithRetry } = await import("../telegram/bot.ts");
    const label = finalStatus === "completed" ? "✅ Pronta para sua confirmação" : "⚠️ Precisa de revisão";
    await sendTelegramMessageWithRetry({
      chat_id: job.actor_id,
      text: `${label}\n\n${title}\n\n${finalStatus === "skipped" ? "A matéria mudou durante a revisão; nenhuma alteração foi aplicada." : remaining.length ? remaining.slice(0, 5).join("\n") : changes.join("\n")}\n\nNenhuma matéria foi publicada automaticamente.`,
      reply_markup: { inline_keyboard: [[{ text: "Ver matéria", callback_data: `drw:${job.post_id}` }, { text: "Ver rascunhos", callback_data: "pgd:0" }]] },
    });
  }
  return true;
}

function resultImageUrls(post: Post): string[] {
  try {
    const body: unknown = JSON.parse(post.body);
    return [post.image_url || "", ...(Array.isArray(body) ? body.filter((block) => block?.type === "image" && typeof block.url === "string").map((block) => block.url as string) : [])].filter(Boolean);
  } catch { return []; }
}
