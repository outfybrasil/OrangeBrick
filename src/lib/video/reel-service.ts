import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { ReelScriptData } from "./reel-script";
import { enqueueRemoteReel, usesRemoteReels } from "./reel-remote";

export interface ReelManifestItem {
  slug: string;
  status: "ready" | "generating" | "failed" | "pending";
  video_url?: string;
  duration?: number;
  file_size?: number;
  started_at?: string;
  finished_at?: string;
  failed_at?: string;
  error?: string;
  pid?: number;
  style?: string;
  variation?: number;
  script?: ReelScriptData;
}

export interface SocialCopys {
  instagram: {
    caption: string;
    hashtags: string[];
  };
  tiktok: {
    caption: string;
    hashtags: string[];
  };
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
}

const MANIFEST_PATH = path.resolve(process.cwd(), "public", "reels", "manifest.json");

export function getManifest(): Record<string, ReelManifestItem> {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

export function saveManifest(manifest: Record<string, ReelManifestItem>) {
  try {
    const dir = path.dirname(MANIFEST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  } catch (err) {
    console.error("[ReelService] Erro ao salvar manifest:", err);
    throw new Error("Não foi possível salvar o estado da geração do Reel.");
  }
}

export function updateReelStatus(slug: string, update: Partial<ReelManifestItem>) {
  const manifest = getManifest();
  const current = manifest[slug] || { slug, status: "pending" };
  manifest[slug] = {
    ...current,
    ...update,
    slug
  };
  saveManifest(manifest);
  return manifest[slug];
}

export function checkReelFile(slug: string): { exists: boolean; size?: number; url?: string; mtime?: string } {
  try {
    const filePath = path.resolve(process.cwd(), "public", "reels", `${slug}.mp4`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 100000) { // pelo menos 100kb
        return {
          exists: true,
          size: stats.size,
          url: `/reels/${slug}.mp4`,
          mtime: stats.mtime.toISOString()
        };
      }
    }
  } catch {}
  return { exists: false };
}

export function generateSocialCopys(post: {
  title: string;
  summary: string;
  slug: string;
  category: string;
  script?: ReelScriptData | null;
}): SocialCopys {
  const plainText = (value: string) => value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const title = plainText(post.title);
  const summary = plainText(post.summary) || title;
  const hook = plainText(post.script?.hook || title);
  const question = plainText(post.script?.ctaQuestion || "Qual é a sua opinião sobre essa notícia?");
  const articleUrl = `https://orangebrick.blog/posts/${post.slug}`;
  const attribution = post.script?.ttsProvider === "elevenlabs" ? "elevenlabs.io" : "";
  const youtubeSuffix = attribution ? " | elevenlabs.io" : "";
  const youtubeTitleBudget = 100 - Array.from(youtubeSuffix).length;
  const youtubeTitleCharacters = Array.from(hook);
  const youtubeTitle = `${youtubeTitleCharacters.length > youtubeTitleBudget
    ? `${youtubeTitleCharacters.slice(0, youtubeTitleBudget - 1).join("").replace(/\s+\S*$/, "").trimEnd()}…`
    : hook}${youtubeSuffix}`;
  const categoryTags: Record<string, string[]> = {
    breaking: ["Notícias de games"],
    hardware: ["Hardware"],
    industry: ["Indústria de games"],
    modding: ["Modding"],
    review: ["Análise de jogos"],
    opinion: ["Opinião"],
  };
  const subjectHashtags: Array<[RegExp, string]> = [
    [/\bubisoft\b/i, "Ubisoft"],
    [/\bredlynx\b/i, "RedLynx"],
    [/\btrials\b/i, "Trials"],
    [/\b(?:singapore|singapura)\b/i, "UbisoftSingapore"],
    [/\b(?:ps\s*plus|playstation\s*plus)\b/i, "PSPlus"],
    [/\bxbox\s+nano\b/i, "XboxNano"],
    [/\bcrash\s+keys\b/i, "CrashKeys"],
    [/\bzero\s+escape\b/i, "ZeroEscape"],
    [/\b(?:gta\s*(?:6|vi)|grand\s+theft\s+auto\s*(?:6|vi))\b/i, "GTA6"],
    [/\b(?:playstation|ps[45]|sony)\b/i, "PlayStation"],
    [/\b(?:xbox|microsoft)\b/i, "Xbox"],
    [/\b(?:nintendo|switch\s*2?)\b/i, "Nintendo"],
    [/\bsteam\b/i, "Steam"],
    [/\bkutaragi\b/i, "KenKutaragi"],
    [/\b(?:disco|m[ií]dia\s+f[ií]sica)\b/i, "MidiaFisica"],
    [/\bhoyo(?:verse)?\b/i, "Hoyoverse"],
    [/\belden\s*ring\b/i, "EldenRing"],
    [/\bgame\s*pass\b/i, "GamePass"],
    [/\bcapcom\b/i, "Capcom"],
    [/\bkonami\b/i, "Konami"],
    [/\bvalve\b/i, "Valve"],
    [/\bpc\s*gamer\b/i, "PCGamer"],
    [/\bremake\b/i, "Remake"],
    [/\bremaster\b/i, "Remaster"],
  ];
  const categoryHashtags: Record<string, string> = {
    breaking: "NoticiasDeGames",
    hardware: "HardwareGamer",
    industry: "IndustriaDosGames",
    modding: "ModdingGamer",
    review: "AnaliseDeJogos",
    opinion: "OpiniaoGamer",
  };
  const searchableCopy = `${title} ${summary} ${hook}`;
  const subjects = subjectHashtags
    .filter(([pattern]) => pattern.test(searchableCopy))
    .slice(0, 2)
    .map(([, hashtag]) => hashtag);
  const hashtagNames = [...new Set([
    ...subjects,
    categoryHashtags[post.category] || "Games",
    "OrangeBrick",
    "Games",
  ])].slice(0, 5);
  const instagramHashtags = hashtagNames.map((hashtag) => `#${hashtag}`);
  const tiktokHashtags = hashtagNames.map((hashtag) => `#${hashtag.toLowerCase()}`);
  const repeatedSummary = summary.toLocaleLowerCase("pt-BR").includes(hook.toLocaleLowerCase("pt-BR"));
  const coreCopy = [hook, ...(repeatedSummary ? [] : [summary]), question];
  const instagramCaption = [
    ...coreCopy,
    "Siga @OrangeBrick para acompanhar as próximas notícias de games.",
    ...(attribution ? [attribution] : []),
    instagramHashtags.join(" "),
  ].filter(Boolean).join("\n\n");
  const tiktokCaption = [
    ...coreCopy,
    "Siga @OrangeBrick para acompanhar os próximos passos.",
    ...(attribution ? [attribution] : []),
    tiktokHashtags.join(" "),
  ].filter(Boolean).join("\n\n");
  const youtubeHashtags = hashtagNames.map((hashtag) => `#${hashtag}`).join(" ");
  const youtubeDescription = [
    hook,
    ...(repeatedSummary ? [] : [summary]),
    question,
    "Inscreva-se no canal para acompanhar mais notícias e os próximos passos.",
    `Leia a matéria completa: ${articleUrl}`,
    attribution,
    youtubeHashtags,
  ].filter(Boolean).join("\n\n");

  return {
    instagram: {
      caption: instagramCaption,
      hashtags: instagramHashtags,
    },
    tiktok: {
      caption: tiktokCaption,
      hashtags: tiktokHashtags,
    },
    youtube: {
      title: youtubeTitle,
      description: youtubeDescription,
      tags: ["Orange Brick", ...(categoryTags[post.category] || []), ...subjects],
    },
  };
}

let isProcessingQueue = false;
const reelQueue: string[] = [];

export async function triggerReelGeneration(slug: string): Promise<{ queued: boolean; message: string }> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) {
    return { queued: false, message: "Slug inválido" };
  }
  if (usesRemoteReels()) return enqueueRemoteReel(slug);

  const manifest = getManifest();
  const current = manifest[slug];

  if (current?.status === "generating" && current.started_at) {
    const elapsed = Date.now() - new Date(current.started_at).getTime();
    let processRunning = false;
    if (current.pid) {
      try { process.kill(current.pid, 0); processRunning = true; }
      catch { processRunning = false; }
    }
    if (processRunning || (reelQueue.includes(slug) && elapsed < 60 * 60 * 1000)) {
      return { queued: false, message: "Vídeo já está sendo processado" };
    }
  }

  // Marca como gerando no manifest
  updateReelStatus(slug, {
    status: "generating",
    started_at: new Date().toISOString(),
    error: undefined,
    pid: undefined,
  });

  if (!reelQueue.includes(slug)) {
    reelQueue.push(slug);
  }

  processReelQueue();

  return { queued: true, message: "Geração iniciada com sucesso" };
}

function processReelQueue() {
  if (isProcessingQueue || reelQueue.length === 0) return;

  const nextSlug = reelQueue.shift();
  if (!nextSlug) return;

  isProcessingQueue = true;

  const scriptPath = path.resolve(process.cwd(), "scripts", "generate-reel.mjs");
  const nodeBin = process.execPath;

  const child = spawn(nodeBin, [
    "--experimental-strip-types",
    ...(fs.existsSync(path.resolve(process.cwd(), ".env.local")) ? ["--env-file=.env.local"] : []),
    scriptPath,
    nextSlug
  ], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    cwd: process.cwd()
  });

  updateReelStatus(nextSlug, { pid: child.pid });

  let output = "";

  child.stdout?.on("data", (data) => {
    output = (output + data.toString()).slice(-4000);
  });

  child.stderr?.on("data", (data) => {
    output = (output + data.toString()).slice(-4000);
  });

  let spawnError: Error | undefined;
  child.once("error", (error) => {
    spawnError = error;
  });

  child.on("close", (code) => {
    isProcessingQueue = false;
    if (code === 0 && checkReelFile(nextSlug).exists) {
      const fileInfo = checkReelFile(nextSlug);
      updateReelStatus(nextSlug, {
        status: "ready",
        pid: undefined,
        finished_at: new Date().toISOString(),
        video_url: `/reels/${nextSlug}.mp4`,
        file_size: fileInfo.size
      });
    } else {
      const reason = spawnError
        ? `Não foi possível iniciar o renderizador: ${spawnError.message}`
        : code === 0
          ? "O renderizador terminou sem criar um vídeo válido."
          : `O renderizador terminou com código ${code ?? "desconhecido"}. Consulte os logs do servidor.`;
      console.error(`[ReelQueue] Falha no Reel de ${nextSlug}: ${reason}\n${output.slice(-500)}`);
      updateReelStatus(nextSlug, {
        status: "failed",
        pid: undefined,
        failed_at: new Date().toISOString(),
        error: reason
      });
    }

    // Processa o próximo da fila se houver
    if (reelQueue.length > 0) {
      setTimeout(processReelQueue, 2000);
    }
  });

  child.unref();
}
