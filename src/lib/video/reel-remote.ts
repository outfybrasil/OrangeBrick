import { createClient } from "@supabase/supabase-js";
import type { ReelJob } from "../types/database.ts";

export const REEL_BUCKET = "editorial-reels";
export const usesRemoteReels = () => process.env.VERCEL === "1" || process.env.REELS_REMOTE !== "false";

export function getReelAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Armazenamento de Reels não configurado.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function dispatchReelWorker(token = process.env.REELS_GITHUB_TOKEN) {
  if (!token) throw new Error("O executor de Reels não está configurado. Configure REELS_GITHUB_TOKEN no servidor.");
  const repository = process.env.REELS_GITHUB_REPOSITORY || "outfybrasil/OrangeBrick";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Repositório de Reels inválido.");
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/reel-generator.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ ref: process.env.REELS_GITHUB_REF || "master" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`O GitHub não confirmou a execução dos Reels (HTTP ${response.status}). Confira as permissões e o workflow.`);
}

export async function enqueueRemoteReel(slug: string, adminToken?: string) {
  if (process.env.VERCEL !== "1" && !process.env.REELS_GITHUB_TOKEN && adminToken) {
    const site = new URL(process.env.REELS_SITE_URL || "https://orange-brick.vercel.app");
    if (site.protocol !== "https:" || site.username || site.password || ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)) {
      throw new Error("Configure REELS_SITE_URL com o endereço HTTPS do site oficial.");
    }
    const response = await fetch(new URL("/api/admin/reels", site), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json", "X-Orangebrick-Reel-Relay": "1" },
      body: JSON.stringify({ slug }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    }).catch(() => {
      throw new Error("Não foi possível conectar à fila oficial de Reels. Atualize a lista antes de tentar novamente para conferir se a solicitação foi recebida.");
    });
    const result = await response.json().catch(() => null);
    if (typeof result?.queued !== "boolean" || typeof result?.message !== "string") {
      throw new Error(result?.error || "O site oficial não confirmou a solicitação do Reel.");
    }
    if (!response.ok && response.status !== 409) throw new Error(result.error || result.message);
    return { queued: result.queued, message: result.message };
  }
  if (!process.env.REELS_GITHUB_TOKEN) throw new Error("O executor de Reels não está configurado. Configure REELS_GITHUB_TOKEN no servidor.");
  const supabase = getReelAdmin();
  const { data, error } = await supabase.rpc("enqueue_reel", { p_slug: slug });
  if (error) throw new Error(error.message);
  const job = (data as ReelJob[] | null)?.[0];
  if (!job) throw new Error("A fila não confirmou a solicitação do Reel.");
  if (job.status === "running") return { queued: true, message: "Este vídeo já está em processamento." };
  try {
    await dispatchReelWorker();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao acionar o executor.";
    await supabase.from("reel_jobs").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", job.id).eq("status", "queued");
    throw error;
  }
  return { queued: true, message: "Reel na fila de renderização. O painel acompanhará o andamento automaticamente." };
}

export async function getRemoteReels(postIds: string[]) {
  const supabase = getReelAdmin();
  const { data, error } = await supabase.rpc("list_reel_jobs", { p_post_ids: postIds });
  if (error) throw new Error("Não foi possível consultar o andamento dos Reels.");
  const jobs = (data || []) as ReelJob[];
  const paths = jobs.filter((job) => job.status === "ready" && job.storage_path).map((job) => job.storage_path!);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed, error: signError } = await supabase.storage.from(REEL_BUCKET).createSignedUrls(paths, 3600);
    if (signError) throw new Error("Não foi possível acessar os vídeos armazenados.");
    for (const item of signed || []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return new Map(jobs.map((job) => [job.post_id, { ...job, video_url: job.storage_path ? urls.get(job.storage_path) : undefined }]));
}

export async function cancelRemoteReel(slug: string): Promise<{ success: boolean; message: string }> {
  const supabase = getReelAdmin();
  const { data: post, error: postErr } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
  if (postErr || !post) {
    return { success: false, message: "Matéria não encontrada." };
  }

  const { error } = await supabase
    .from("reel_jobs")
    .update({
      status: "failed",
      error: "Geração cancelada pelo usuário.",
      finished_at: new Date().toISOString(),
      lease_until: null,
    })
    .eq("post_id", post.id)
    .in("status", ["queued", "running"]);

  if (error) {
    throw new Error(`Falha ao cancelar: ${error.message}`);
  }

  return { success: true, message: "Geração remota cancelada com sucesso." };
}
