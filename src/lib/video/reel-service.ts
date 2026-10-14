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
  const cleanTitle = post.title.trim().toUpperCase();
  const summary = post.summary.trim();
  const hook = post.script?.hook ? `🔥 ${post.script.hook}\n\n` : "";
  const question = post.script?.ctaQuestion || "O que você achou dessa novidade? Deixa sua opinião nos comentários!";

  const categoryTags: Record<string, string[]> = {
    breaking: ["plantao", "noticias", "urgente", "furodejornalismo"],
    hardware: ["hardware", "pcgamer", "consoles", "tecnologia"],
    industry: ["industriagamer", "mercado", "gamesbusiness"],
    modding: ["modding", "gamemods", "custompc"],
    review: ["analise", "review", "gameplay"],
    opinion: ["opiniao", "debate", "comunidade"]
  };

  const extraTags = categoryTags[post.category] || ["games"];

  // Instagram
  const igHashtags = [
    "#orangebrick",
    "#games",
    "#noticiasgames",
    "#gamingbrasil",
    "#gamer",
    "#playstation",
    "#xbox",
    "#pcgaming",
    ...extraTags.map(t => `#${t}`)
  ];

  const igCaption = `${hook}🎮 ${cleanTitle}\n\n${summary}\n\n💬 ${question}\n\n🔗 Matéria completa com todos os detalhes no link da bio: orangebrick.blog/posts/${post.slug}\n\n📲 Siga @orangebrick para o melhor jornalismo independente de games!\n\n${igHashtags.join(" ")}`;

  // TikTok
  const ttHashtags = [
    "#games",
    "#noticiasgames",
    "#gamer",
    "#fyp",
    "#foryou",
    "#gamesbrasil",
    "#viral",
    ...extraTags.map(t => `#${t}`)
  ];

  const ttCaption = `${cleanTitle} 🕹️💥\n\n${summary}\n\n💬 ${question}\nSegue aí pra não perder nada! 👇\n\n${ttHashtags.join(" ")}`;

  // YouTube Shorts
  const rawYtTitle = `${cleanTitle} #Shorts`;
  const ytTitle = rawYtTitle.length > 95 ? `${rawYtTitle.slice(0, 91)}... #Shorts` : rawYtTitle;

  const ytDescription = `${cleanTitle}\n\n${summary}\n\n📰 Leia a apuração completa no portal Orange Brick:\nhttps://orangebrick.blog/posts/${post.slug}\n\n🔔 Inscreva-se no canal para acompanhar novidades diárias de games e tecnologia.\n\n#Shorts #Games #NoticiasGames #OrangeBrick`;

  return {
    instagram: {
      caption: igCaption,
      hashtags: igHashtags
    },
    tiktok: {
      caption: ttCaption,
      hashtags: ttHashtags
    },
    youtube: {
      title: ytTitle,
      description: ytDescription,
      tags: ["Shorts", "Games", "Orange Brick", "Notícias de Games", ...extraTags]
    }
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

  // Se já está gerando há menos de 10 minutos, não duplica
  if (current?.status === "generating" && current.started_at) {
    const elapsed = Date.now() - new Date(current.started_at).getTime();
    if (elapsed < 10 * 60 * 1000) {
      return { queued: false, message: "Vídeo já está sendo processado" };
    }
  }

  // Marca como gerando no manifest
  updateReelStatus(slug, {
    status: "generating",
    started_at: new Date().toISOString(),
    error: undefined
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

  let output = "";

  child.stdout?.on("data", (data) => {
    output += data.toString();
  });

  child.stderr?.on("data", (data) => {
    output += data.toString();
  });

  child.on("close", (code) => {
    isProcessingQueue = false;
    if (code === 0) {
      const fileInfo = checkReelFile(nextSlug);
      updateReelStatus(nextSlug, {
        status: "ready",
        finished_at: new Date().toISOString(),
        video_url: `/reels/${nextSlug}.mp4`,
        file_size: fileInfo.size
      });
    } else {
      console.error(`[ReelQueue] ❌ Falha no Reel de ${nextSlug} (código ${code}):\n${output.slice(-500)}`);
      updateReelStatus(nextSlug, {
        status: "failed",
        failed_at: new Date().toISOString(),
        error: `Processo finalizou com código ${code}. Verifique os logs.`
      });
    }

    // Processa o próximo da fila se houver
    if (reelQueue.length > 0) {
      setTimeout(processReelQueue, 2000);
    }
  });

  child.unref();
}
