import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { getReelAdmin, REEL_BUCKET, dispatchReelWorker } from "../src/lib/video/reel-remote.ts";

const supabase = getReelAdmin();
const root = process.cwd();
const deadline = Date.now() + 20 * 60_000;
const siteUrl = (process.env.REELS_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://orangebrick.blog").replace(/\/+$/, "");

async function publishSocial(postId, jobId) {
  if (!process.env.CRON_SECRET) {
    process.stdout.write(`Reel ${jobId}: CRON_SECRET ausente, publicação automática ignorada.\n`);
    return;
  }
  const url = new URL("/api/cron/reel-social", siteUrl);
  url.searchParams.set("postId", postId);
  url.searchParams.set("jobId", jobId);
  for (let attempt = 0; attempt < 12; attempt++) {
    let result;
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
        cache: "no-store",
        signal: AbortSignal.timeout(280_000),
      });
      result = await response.json().catch(() => null);
      if (!response.ok) {
        process.stderr.write(`Reel ${jobId}: publicação automática indisponível (${response.status}) ${result?.error || ""}\n`);
        return;
      }
    } catch (error) {
      process.stderr.write(`Reel ${jobId}: falha ao acionar a publicação automática: ${error instanceof Error ? error.message : "erro desconhecido"}\n`);
      return;
    }
    const waitingForTikTok = result?.processed === false && result.platform === "tiktok" && result.status === "submitted";
    if (!result || result.processed === false && !waitingForTikTok) {
      process.stdout.write(`Reel ${jobId}: redes ${result?.platform ? `${result.platform} ${result.status}` : "sem pendências"}\n`);
      return;
    }
    if (waitingForTikTok) {
      process.stdout.write(`Reel ${jobId}: TikTok aguardando confirmacao\n`);
      if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 30_000));
      continue;
    }
    process.stdout.write(`Reel ${jobId}: redes ${result.platform} ${result.status}${result.error ? ` (${result.error})` : ""}\n`);
    if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

function render(slug) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--experimental-strip-types", "scripts/generate-reel.mjs", slug], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      timeout: 24 * 60_000,
    });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`A renderização falhou (código ${code}). Consulte a execução no GitHub Actions.`)));
  });
}

async function run() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada no executor.");
  while (Date.now() < deadline) {
    const token = crypto.randomUUID();
    const { data, error } = await supabase.rpc("claim_reel", { p_token: token });
    if (error) throw new Error(error.message);
    const job = data?.[0];
    if (!job) return;
    let uploadedPath;
    try {
      const { data: post, error: postError } = await supabase.from("posts").select("slug,is_published,archived_at,updated_at").eq("id", job.post_id).single();
      if (postError || !post) throw new Error("Matéria não encontrada.");
      if (!post.is_published || post.archived_at || post.updated_at !== job.expected_updated_at) throw new Error("A matéria mudou. Solicite uma nova geração.");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || post.slug.length > 200) throw new Error("Slug inválido.");
      await render(post.slug);
      const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/reels/manifest.json"), "utf8"));
      const item = manifest[post.slug];
      const video = fs.readFileSync(path.join(root, "public/reels", `${post.slug}.mp4`));
      if (item?.status !== "ready" || !item.script || !(item.duration > 0 && item.duration <= 120) || video.length < 100000 || video.length > 104857600) throw new Error("O executor não produziu um vídeo válido.");
      const storagePath = `${job.post_id}/${job.id}.mp4`;
      const { error: uploadError } = await supabase.storage.from(REEL_BUCKET).upload(storagePath, video, { contentType: "video/mp4", upsert: true });
      if (uploadError) throw new Error("Falha ao armazenar o vídeo no Supabase.");
      uploadedPath = storagePath;
      const { data: result, error: finishError } = await supabase.rpc("finish_reel", {
        p_job: job.id, p_token: token, p_path: storagePath, p_duration: item.duration, p_size: video.length, p_script: item.script,
      });
      if (finishError) throw new Error(finishError.message);
      if (result !== "ready") await supabase.storage.from(REEL_BUCKET).remove([storagePath]);
      process.stdout.write(`Reel ${job.id}: ${result}\n`);
      if (result === "ready") await publishSocial(job.post_id, job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gerar Reel.";
      const { data: failed, error: saveError } = await supabase.from("reel_jobs").update({ status: "failed", error: message.slice(0, 500), finished_at: new Date().toISOString() }).eq("id", job.id).eq("lock_token", token).eq("status", "running").select("id");
      if (saveError) throw new Error("Falha ao registrar o erro da geração.");
      if (uploadedPath && failed?.length) await supabase.storage.from(REEL_BUCKET).remove([uploadedPath]);
      process.stderr.write(`Reel ${job.id}: ${message}\n`);
      process.exitCode = 1;
    }
  }
  const { count, error } = await supabase.from("reel_jobs").select("id", { count: "exact", head: true }).eq("status", "queued");
  if (error) throw new Error(error.message);
  if (count) await dispatchReelWorker(process.env.GITHUB_TOKEN);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Falha no executor de Reels."}\n`);
  process.exitCode = 1;
});
