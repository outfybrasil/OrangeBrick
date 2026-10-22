import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { ReelScriptData } from "./reel-script";
import { enqueueRemoteReel, cancelRemoteReel, usesRemoteReels } from "./reel-remote";

export interface ReelManifestItem {
  slug: string;
  status: "ready" | "generating" | "failed" | "pending";
  video_url?: string;
  duration?: number;
  file_size?: number;
  started_at?: string;
  queued_at?: string;
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
  const danglingEnding = /\b(?:de|do|da|dos|das|em|no|na|nos|nas|para|por|com|que|e|ou|mas|a|o|as|os|um|uma|seu|sua|seus|suas|entre|sobre|até|após|antes|durante)\s*[.!?]*$/iu;
  const hasIncompleteEnding = (value: string) => /…|\.{3}/u.test(value) || value.split(/(?<=[.!?])\s+/u).some((sentence) => danglingEnding.test(sentence.trim()));
  const completeTitle = hasIncompleteEnding(title) ? "Veja a matéria completa." : title;
  const rawSummary = plainText(post.summary);
  const summary = rawSummary && !hasIncompleteEnding(rawSummary) ? rawSummary : completeTitle;
  const rawHook = plainText(post.script?.hook || title);
  const hook = hasIncompleteEnding(rawHook) ? completeTitle : rawHook;
  const narration = plainText(post.script?.narrationText || "");
  const narrationWords = narration ? narration.split(/\s+/).length : 0;
  const narrationIsComplete = narrationWords >= 75 && narrationWords <= 95 && /[.!?]$/u.test(narration) && !hasIncompleteEnding(narration);
  const suppliedQuestion = plainText(post.script?.ctaQuestion || "");
  const releaseTitle = completeTitle.match(/^(.*?)\s+(?:chega|estreia|lança|recebe|ganha)\b/i)?.[1]?.trim();
  const releaseQuestion = releaseTitle && post.category === "breaking" &&
    /\b(?:estreia|lançamento|data de lançamento|chega em)\b/i.test(summary) &&
    !/\b(?:playstation|ps[45]|xbox|nintendo|switch|sony|microsoft|ubisoft|steam)\b/i.test(releaseTitle)
    ? `Você pretende jogar ${releaseTitle} no lançamento?`
    : "";
  const fallbackQuestions: Record<string, string> = {
    breaking: "O que essa notícia muda para você como jogador?",
    hardware: "Esse hardware entra na sua lista de compras?",
    industry: "Como essa decisão pode afetar os próximos jogos?",
    modding: "Você levaria essa modificação a sério?",
    review: "Você daria uma chance a esse jogo?",
    opinion: "Você concorda com essa leitura?",
  };
  const genericQuestion = /^(?:o que você acha dessa mudança|qual é a sua opinião sobre essa notícia|o que essa notícia muda para quem joga)\?$/i;
  const question = suppliedQuestion && suppliedQuestion.endsWith("?") && !hasIncompleteEnding(suppliedQuestion) && !genericQuestion.test(suppliedQuestion)
    ? suppliedQuestion
    : releaseQuestion || fallbackQuestions[post.category] || "Que impacto essa notícia teria para você como jogador?";
  const hookPrefix = hook.replace(/[.!?…]+$/, "").trim();
  const escapedHookPrefix = hookPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const summaryAfterHook = summary.replace(new RegExp(`^${escapedHookPrefix}(?=$|[\\s,;:!?])[,;:!?\\s]*`, "iu"), "").trim();
  const supportingSummary = summaryAfterHook
    ? `${summaryAfterHook[0].toLocaleUpperCase("pt-BR")}${summaryAfterHook.slice(1)}`
    : summary === hook ? "" : summary;
  const articleUrl = `https://orangebrick.blog/posts/${post.slug}`;
  const trackedArticleUrl = (source: string, medium: string) => `${articleUrl}?utm_source=${source}&utm_medium=${medium}&utm_campaign=reel`;
  const attribution = post.script?.ttsProvider === "elevenlabs" ? "Narração: elevenlabs.io" : "";
  const seriesByCategory: Record<string, { label: string; hashtag: string }> = {
    breaking: { label: "Plantão OB", hashtag: "PlantaoOB" },
    hardware: { label: "Hard News OB", hashtag: "HardNewsOB" },
    industry: { label: "Radar OB", hashtag: "RadarOB" },
    modding: { label: "Gambiarra OB", hashtag: "GambiarraOB" },
    review: { label: "Review OB", hashtag: "ReviewOB" },
    opinion: { label: "Opinião OB", hashtag: "OpiniaoOB" },
  };
  const series = seriesByCategory[post.category] || { label: "Orange Brick", hashtag: "OrangeBrick" };
  const seriesLine = `${series.label} — Orange Brick`;
  const youtubeTitleSource = Array.from(hook).length <= 70 ? hook : completeTitle;
  const youtubeTitleCharacters = Array.from(youtubeTitleSource);
  const youtubeTitle = youtubeTitleCharacters.length <= 70
    ? youtubeTitleSource
    : `${youtubeTitleCharacters.slice(0, 69).join("").replace(/\s+\S*$/, "").trimEnd()}…`;
  const categoryTags: Record<string, string[]> = {
    breaking: ["Notícias de games"],
    hardware: ["Hardware"],
    industry: ["Indústria de games"],
    modding: ["Modding"],
    review: ["Análise de jogos"],
    opinion: ["Opinião"],
  };
  const subjectHashtags: Array<[RegExp, string]> = [
    [/\bsaros\b/i, "Saros"],
    [/\bfaraway\b/i, "Faraway"],
    [/\bedgerunners?\b/i, "CyberpunkEdgerunners"],
    [/\bcyberpunk\s*2077\b/i, "Cyberpunk2077"],
    [/\bcyberpunk\b/i, "Cyberpunk"],
    [/\bhideo\s+kojima\b/i, "HideoKojima"],
    [/\b(?:call\s+of\s+duty|cod)\b/i, "CallOfDuty"],
    [/\bmodern\s+warfare\s*4\b/i, "ModernWarfare4"],
    [/\bocarina\s+of\s+time\b/i, "OcarinaOfTime"],
    [/\bpalworld\b/i, "Palworld"],
    [/\bzelda\b/i, "Zelda"],
    [/\bpokemon\b/i, "Pokemon"],
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
    industry: "IndustriaDeGames",
    modding: "ModdingGamer",
    review: "ReviewDeGames",
    opinion: "OpiniaoDeGames",
  };
  const searchableCopy = `${title} ${summary} ${hook}`;
  const platformTags = [
    ...(/\b(?:playstation|ps[45])\b/i.test(searchableCopy) ? ["PlayStation"] : []),
    ...(/\bxbox\b/i.test(searchableCopy) ? ["Xbox"] : []),
    ...(/\bswitch\s*2\b/i.test(searchableCopy) ? ["NintendoSwitch2"] : /\b(?:nintendo|switch)\b/i.test(searchableCopy) ? ["Nintendo"] : []),
    ...(/\b(?:pc|steam)\b/i.test(searchableCopy) ? ["PCGaming"] : []),
  ];
  const subjectTags = subjectHashtags
    .filter(([pattern]) => pattern.test(searchableCopy))
    .slice(0, 2)
    .map(([, hashtag]) => hashtag);
  const relatedSubjectPairs = new Set([
    "CyberpunkEdgerunners|Cyberpunk",
    "CallOfDuty|ModernWarfare4",
    "OcarinaOfTime|Zelda",
  ]);
  const selectedSubjectTags = subjectTags.length === 2 && relatedSubjectPairs.has(subjectTags.join("|"))
    ? subjectTags
    : subjectTags.slice(0, 1);
  const ignoredSlugWords = new Set(["para", "como", "sobre", "depois", "antes", "entre", "noticia", "noticias", "news", "games", "game", "chega", "chegam", "ganha", "ganham", "recebe", "recebem", "anuncia", "anunciam", "confirma", "confirmam", "revela", "revelam", "novo", "nova", "novos", "novas", "oficial", "data", "lancamento", "jogo", "jogos"]);
  const fallbackTopic = post.slug
    .toLocaleLowerCase("pt-BR")
    .split("-")
    .find((word) => word.length >= 4 && !ignoredSlugWords.has(word));
  const subjects = [...new Set([
    ...selectedSubjectTags,
    ...(selectedSubjectTags.length === 0 && fallbackTopic ? [`${fallbackTopic[0].toLocaleUpperCase("pt-BR")}${fallbackTopic.slice(1)}`] : []),
  ])].slice(0, 2);
  const categoryHashtag = categoryHashtags[post.category] || "NoticiasDeGames";
  const newsTags = ["breaking", "hardware", "industry"].includes(post.category) ? ["NoticiasDeGames"] : [];
  const uniqueHashtags = (names: string[]) => [...new Map(names.map(name => [name.toLocaleLowerCase("pt-BR"), name])).values()];
  const contextTags = uniqueHashtags([...subjects.slice(0, 1), ...platformTags]).slice(0, 2);
  const baseHashtags = uniqueHashtags([...contextTags, series.hashtag, "OrangeBrick", categoryHashtag, ...newsTags, "GamesBrasil"]);
  const instagramHashtagNames = baseHashtags.slice(0, 5);
  const tiktokHashtagNames = baseHashtags.slice(0, 5);
  const youtubeHashtagNames = uniqueHashtags(["Shorts", ...baseHashtags]).slice(0, 5);
  const instagramHashtags = instagramHashtagNames.map((hashtag) => `#${hashtag}`);
  const tiktokHashtags = tiktokHashtagNames.map((hashtag) => `#${hashtag.toLocaleLowerCase("pt-BR")}`);
  const coreCopy = narrationIsComplete ? [narration] : [hook, supportingSummary];
  const commentPrompt = narrationIsComplete ? "" : `Responda nos comentários: ${question}`;
  const instagramCaption = [
    ...coreCopy,
    commentPrompt,
    `Matéria completa no link da bio: ${trackedArticleUrl("instagram", "reel")}`,
    "Siga @ob.labs para acompanhar as próximas notícias.",
    seriesLine,
    attribution,
    instagramHashtags.join(" "),
  ].filter(Boolean).join("\n\n");
  const tiktokCaption = [
    ...coreCopy,
    commentPrompt,
    "Matéria completa no link da bio.",
    "Siga para acompanhar as próximas notícias.",
    seriesLine,
    attribution,
    tiktokHashtags.join(" "),
  ].filter(Boolean).join("\n\n");
  const youtubeHashtags = youtubeHashtagNames.map((hashtag) => `#${hashtag}`).join(" ");
  const youtubeDescription = [
    ...coreCopy,
    commentPrompt,
    `Leia a matéria completa: ${trackedArticleUrl("youtube", "short")}`,
    "Inscreva-se no canal para acompanhar as próximas notícias.",
    seriesLine,
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
      tags: [...new Set(["Orange Brick", "Shorts", series.label, ...(categoryTags[post.category] || []), ...subjects, ...platformTags])].slice(0, 15),
    },
  };
}

let isProcessingQueue = false;
let currentRunningChild: ChildProcess | null = null;
let currentRunningSlug: string | null = null;
const reelQueue: string[] = [];
const cancelledReelChildren = new WeakSet<ChildProcess>();

export function getLocalReelQueueStatus(slug: string, manifest = getManifest()) {
  const queueIndex = reelQueue.indexOf(slug);
  const isQueued = queueIndex !== -1;
  const isRunning = currentRunningSlug === slug;
  const queuePosition = isRunning ? 1 : isQueued ? queueIndex + (currentRunningSlug ? 2 : 1) : undefined;
  const durations = Object.values(manifest)
    .filter((item) => item.status === "ready" && item.started_at && item.finished_at)
    .map((item) => (new Date(item.finished_at!).getTime() - new Date(item.started_at!).getTime()) / 1000)
    .filter((duration) => Number.isFinite(duration) && duration > 0 && duration <= 60 * 60)
    .sort((a, b) => a - b);
  const expectedDurationSeconds = durations.length ? durations[Math.floor(durations.length / 2)] : 12 * 60;
  const runningItem = currentRunningSlug ? manifest[currentRunningSlug] : undefined;
  const runningElapsedSeconds = runningItem?.started_at
    ? Math.max(0, (Date.now() - new Date(runningItem.started_at).getTime()) / 1000)
    : 0;

  return {
    isQueued,
    queuePosition,
    expectedDurationSeconds,
    estimatedRemainingSeconds: queuePosition ? Math.max(0, queuePosition * expectedDurationSeconds - runningElapsedSeconds) : undefined,
    etaUpdatedAt: new Date().toISOString(),
  };
}

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

  updateReelStatus(slug, {
    status: "generating",
    started_at: new Date().toISOString(),
    queued_at: new Date().toISOString(),
    error: undefined,
    pid: undefined,
  });

  if (!reelQueue.includes(slug)) {
    reelQueue.push(slug);
  }

  processReelQueue();

  return { queued: true, message: "Geração iniciada com sucesso" };
}

export function cancelReelGeneration(slug: string): { success: boolean; message: string } {
  const queueIndex = reelQueue.indexOf(slug);
  if (queueIndex !== -1) {
    reelQueue.splice(queueIndex, 1);
  }

  const activeChild = currentRunningSlug === slug ? currentRunningChild : null;

  if (activeChild) {
    cancelledReelChildren.add(activeChild);
    try {
      activeChild.kill("SIGTERM");
    } catch {}
  }

  const manifest = getManifest();
  const current = manifest[slug];
  if (current?.pid && !activeChild) {
    try {
      process.kill(current.pid);
    } catch {}
  }

  updateReelStatus(slug, {
    status: "failed",
    pid: undefined,
    failed_at: new Date().toISOString(),
    error: "Geração cancelada pelo usuário.",
  });

  if (reelQueue.length > 0 && !isProcessingQueue) {
    setTimeout(processReelQueue, 1000);
  }

  return { success: true, message: "Geração de Reel cancelada com sucesso." };
}

export async function cancelReel(slug: string): Promise<{ success: boolean; message: string }> {
  if (usesRemoteReels()) {
    return cancelRemoteReel(slug);
  }
  return cancelReelGeneration(slug);
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

  currentRunningChild = child;
  currentRunningSlug = nextSlug;

  updateReelStatus(nextSlug, { pid: child.pid, started_at: new Date().toISOString(), queued_at: undefined });

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
    const wasCancelled = cancelledReelChildren.has(child);

    isProcessingQueue = false;
    if (currentRunningChild === child) currentRunningChild = null;
    if (currentRunningSlug === nextSlug) currentRunningSlug = null;

    if (wasCancelled) {
      if (reelQueue.length > 0) setTimeout(processReelQueue, 2000);
      return;
    }

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
      const outputTail = output
        .replace(/\x1b\[[0-9;]*m/g, "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-4)
        .join(" | ")
        .slice(-400);
      const baseReason = spawnError
        ? `Não foi possível iniciar o renderizador: ${spawnError.message}`
        : code === 0
          ? "O renderizador terminou sem criar um vídeo válido."
          : `O renderizador terminou com código ${code ?? "desconhecido"}.`;
      const reason = outputTail ? `${baseReason} ${outputTail}` : `${baseReason} Consulte os logs do servidor.`;
      console.error(`[ReelQueue] Falha no Reel de ${nextSlug}: ${reason}\n${output.slice(-1500)}`);
      updateReelStatus(nextSlug, {
        status: "failed",
        pid: undefined,
        failed_at: new Date().toISOString(),
        error: reason
      });
    }

    if (reelQueue.length > 0) {
      setTimeout(processReelQueue, 2000);
    }
  });

  child.unref();
}
