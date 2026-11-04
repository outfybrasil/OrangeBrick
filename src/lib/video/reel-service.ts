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
      if (stats.size > 100000) {
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
  const articleUrl = `https://orangebrick.blog/reels/${encodeURIComponent(post.slug)}`;
  const trackedArticleUrl = (source: string, medium: string) => `${articleUrl}?utm_source=${source}&utm_medium=${medium}&utm_campaign=reel&utm_content=${encodeURIComponent(post.slug)}`;
  const attribution = post.script?.ttsProvider === "elevenlabs" ? "Narração: elevenlabs.io" : "";
  const seriesByCategory: Record<string, { label: string }> = {
    breaking: { label: "Plantão OB" },
    hardware: { label: "Hard News OB" },
    industry: { label: "Radar OB" },
    modding: { label: "Gambiarra OB" },
    review: { label: "Review OB" },
    opinion: { label: "Opinião OB" },
  };
  const series = seriesByCategory[post.category] || { label: "Orange Brick" };
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
    [/\bfinal\s+fantasy\s*(?:vii|7)\b/i, "FinalFantasyVII"],
    [/\bgame\s*pass\b/i, "GamePass"],
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
    [/\bkutaragi\b/i, "KenKutaragi"],
    [/\b(?:disco|m[ií]dia\s+f[ií]sica)\b/i, "MidiaFisica"],
    [/\bhoyo(?:verse)?\b/i, "Hoyoverse"],
    [/\belden\s*ring\b/i, "EldenRing"],
    [/\bcapcom\b/i, "Capcom"],
    [/\bkonami\b/i, "Konami"],
    [/\bvalve\b/i, "Valve"],
    [/\bpc\s*gamer\b/i, "PCGamer"],
    [/\bremake\b/i, "Remake"],
    [/\bremaster\b/i, "Remaster"],
    [/\b(?:playstation|ps[45]|sony)\b/i, "PlayStation"],
    [/\b(?:xbox|microsoft)\b/i, "Xbox"],
    [/\b(?:nintendo|switch\s*2?)\b/i, "Nintendo"],
    [/\bsteam\b/i, "Steam"],
  ];
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
    "FinalFantasyVII|GamePass",
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
  const uniqueHashtags = (names: string[]) => [...new Map(names.map(name => [name.toLocaleLowerCase("pt-BR"), name])).values()];
  const contextTags = uniqueHashtags([...subjects, ...platformTags]).slice(0, 2);
  const instagramHashtagNames = uniqueHashtags([...contextTags, "Gaming", "Reels", "Viral"]).slice(0, 5);
  const tiktokHashtagNames = uniqueHashtags([...contextTags, "Gaming", "FYP", "Viral"]).slice(0, 5);
  const youtubeHashtagNames = uniqueHashtags(["Shorts", ...contextTags, "Gaming", "Viral"]).slice(0, 5);
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
      tags: uniqueHashtags([
        ...subjects,
        ...platformTags,
        ...(categoryTags[post.category] || []),
        "Gaming",
        "Video Games",
        "Gaming News",
        "Shorts",
        series.label,
        "Orange Brick",
      ]).slice(0, 15),
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

export interface LongVideoChapter {
  number: string;
  title: string;
  kicker?: string;
  start_seconds: number;
  timestamp: string;
  source?: string;
}

export interface LongVideoThumbnailOption {
  id: string;
  label: string;
  angle: string;
  headline: string;
  subline: string;
  url: string;
}

export interface LongVideoShortSuggestion {
  id: string;
  title: string;
  hook: string;
  chapter_number: string;
  start_timestamp: string;
  end_timestamp: string;
  duration_seconds: number;
  related_slug?: string;
}

export interface LongVideoQaCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export type LongVideoVisualStyle =
  | "documentario"
  | "cinema"
  | "arquivo-cofre"
  | "circuito"
  | "tribunal"
  | "mesa-de-risco"
  | "turno-da-madrugada"
  | "linha-do-tempo"
  | "raio-x"
  | "duelo"
  | "manchete"
  | "impacto";

export const VALID_LONG_VIDEO_STYLES: LongVideoVisualStyle[] = [
  "documentario",
  "cinema",
  "arquivo-cofre",
  "circuito",
  "tribunal",
  "mesa-de-risco",
  "turno-da-madrugada",
  "linha-do-tempo",
  "raio-x",
  "duelo",
  "manchete",
  "impacto",
];

export interface LongVideoManifestItem {
  slug: string;
  series_badge: string;
  title: string;
  subtitle: string;
  status: "generating" | "pending_review" | "approved" | "rejected" | "scheduled" | "failed";
  pipeline_stage_index: number;
  pipeline_stage_label: string;
  source_mode: "ai_dossier" | "custom_script";
  source_post_slugs: string[];
  visual_style: LongVideoVisualStyle;
  voice_id: string;
  duration_seconds: number;
  duration_formatted: string;
  monetization_midroll_eligible: boolean;
  file_size?: number;
  resolution: string;
  fps: number;
  video_url?: string;
  srt_url?: string;
  preview_sheet_url?: string;
  thumbnails: LongVideoThumbnailOption[];
  selected_thumbnail_id?: string;
  chapters: LongVideoChapter[];
  qa_checks: LongVideoQaCheck[];
  shorts_suggestions: LongVideoShortSuggestion[];
  youtube: {
    title: string;
    description: string;
    tags: string[];
    pinned_comment: string;
    visibility?: "private" | "unlisted" | "public";
    scheduled_at?: string | null;
  };
  review_notes?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  error?: string;
}

export interface DarkPipelineConfig {
  channel_name: string;
  niche: string;
  default_style: LongVideoVisualStyle;
  default_voice: string;
  target_min_minutes: number;
  daily_schedule_time: string;
  daily_conveyor_enabled: boolean;
  require_human_approval: boolean;
}

const LONG_MANIFEST_PATH = path.resolve(process.cwd(), "public", "long-videos", "manifest.json");
const TMP_LONG_MANIFEST_PATH = path.join("/tmp", "orangebrick-long-videos-manifest.json");
const DARK_CONFIG_PATH = path.resolve(process.cwd(), "public", "long-videos", "pipeline-config.json");
const TMP_DARK_CONFIG_PATH = path.join("/tmp", "orangebrick-dark-pipeline-config.json");

export function getDarkPipelineConfig(): DarkPipelineConfig {
  const fallback: DarkPipelineConfig = {
    channel_name: "Orange Brick Docs",
    niche: "Dossiês de Indústria, Hardware & Bastidores dos Games",
    default_style: "documentario",
    default_voice: "pt-BR-AntonioNeural",
    target_min_minutes: 8,
    daily_schedule_time: "19:00",
    daily_conveyor_enabled: true,
    require_human_approval: true,
  };
  try {
    if (fs.existsSync(TMP_DARK_CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_DARK_CONFIG_PATH, "utf-8"));
      return { ...fallback, ...parsed };
    }
    if (fs.existsSync(DARK_CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DARK_CONFIG_PATH, "utf-8"));
      return { ...fallback, ...parsed };
    }
  } catch {}
  return fallback;
}

export function saveDarkPipelineConfig(update: Partial<DarkPipelineConfig>): DarkPipelineConfig {
  const next = { ...getDarkPipelineConfig(), ...update };
  const payload = JSON.stringify(next, null, 2);
  try {
    const dir = path.dirname(DARK_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DARK_CONFIG_PATH, payload, "utf-8");
  } catch {
    try {
      fs.writeFileSync(TMP_DARK_CONFIG_PATH, payload, "utf-8");
    } catch {}
  }
  return next;
}

export function getLongVideoManifest(): Record<string, LongVideoManifestItem> {
  try {
    if (fs.existsSync(TMP_LONG_MANIFEST_PATH)) {
      const runtime = JSON.parse(fs.readFileSync(TMP_LONG_MANIFEST_PATH, "utf-8"));
      if (runtime && typeof runtime === "object") {
        return runtime;
      }
    }
  } catch {}
  try {
    if (fs.existsSync(LONG_MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(LONG_MANIFEST_PATH, "utf-8"));
    }
  } catch {}
  return {};
}

export function saveLongVideoManifest(manifest: Record<string, LongVideoManifestItem>) {
  const payload = JSON.stringify(manifest, null, 2);
  try {
    fs.writeFileSync(TMP_LONG_MANIFEST_PATH, payload, "utf-8");
  } catch {}
  try {
    const dir = path.dirname(LONG_MANIFEST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LONG_MANIFEST_PATH, payload, "utf-8");
  } catch {}
}

export function deleteLongVideoItem(slug: string): boolean {
  const manifest = getLongVideoManifest();
  const existed = Boolean(manifest[slug]);
  delete manifest[slug];
  saveLongVideoManifest(manifest);

  try {
    const publicDir = path.resolve(process.cwd(), "public", "long-videos", slug);
    if (fs.existsSync(publicDir)) {
      fs.rmSync(publicDir, { recursive: true, force: true });
    }
  } catch {}

  try {
    const tmpDir = path.resolve(process.cwd(), "tmp", "long-videos", slug);
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch {}

  return existed;
}

export function updateLongVideoItem(slug: string, update: Partial<LongVideoManifestItem>): LongVideoManifestItem | null {
  const manifest = getLongVideoManifest();
  const existing = manifest[slug];
  if (!existing) return null;
  const next: LongVideoManifestItem = {
    ...existing,
    ...update,
    youtube: update.youtube ? { ...existing.youtube, ...update.youtube } : existing.youtube,
    updated_at: new Date().toISOString(),
  };
  manifest[slug] = next;
  saveLongVideoManifest(manifest);
  return next;
}

export function triggerLongVideoGeneration(options: {
  slug: string;
  title: string;
  subtitle: string;
  sourceMode: "ai_dossier" | "custom_script";
  sourcePostSlugs: string[];
  customScriptText?: string;
  visualStyle: LongVideoVisualStyle;
  voiceId: string;
  targetMinMinutes: number;
}): LongVideoManifestItem {
  const manifest = getLongVideoManifest();
  const now = new Date().toISOString();
  const initialItem: LongVideoManifestItem = {
    slug: options.slug,
    series_badge: `DOSSIÊ ORANGE BRICK // ESTILO ${options.visualStyle.toUpperCase()}`,
    title: options.title,
    subtitle: options.subtitle,
    status: "generating",
    pipeline_stage_index: 1,
    pipeline_stage_label: "1/8 · Estruturando roteiro, capítulos e fontes verificadas",
    source_mode: options.sourceMode,
    source_post_slugs: options.sourcePostSlugs,
    visual_style: options.visualStyle,
    voice_id: options.voiceId,
    duration_seconds: options.targetMinMinutes * 60,
    duration_formatted: `${String(options.targetMinMinutes).padStart(2, "0")}:00`,
    monetization_midroll_eligible: options.targetMinMinutes >= 8,
    resolution: "1920x1080",
    fps: 30,
    thumbnails: [],
    chapters: [],
    qa_checks: [],
    shorts_suggestions: [],
    youtube: {
      title: options.title,
      description: options.subtitle,
      tags: ["Orange Brick", "Dossiê Games", "Indústria de Games"],
      pinned_comment: "Deixe sua opinião nos comentários e inscreva-se no canal!",
      visibility: "private",
      scheduled_at: null,
    },
    created_at: manifest[options.slug]?.created_at || now,
    updated_at: now,
  };

  manifest[options.slug] = initialItem;
  saveLongVideoManifest(manifest);

  try {
    const jobDir = path.resolve(process.cwd(), "tmp", "long-videos", options.slug);
    fs.mkdirSync(jobDir, { recursive: true });
    const jobConfigPath = path.join(jobDir, "job-request.json");
    fs.writeFileSync(jobConfigPath, JSON.stringify(options, null, 2), "utf-8");

    const scriptPath = path.resolve(process.cwd(), "scripts", "generate-long-video.mjs");
    const child = spawn(process.execPath, [
      ...(fs.existsSync(path.resolve(process.cwd(), ".env.local")) ? ["--env-file=.env.local"] : []),
      scriptPath,
      `--job=${jobConfigPath}`,
    ], {
      detached: true,
      stdio: "ignore",
      cwd: process.cwd(),
    });
    child.unref();
  } catch {}

  return initialItem;
}

