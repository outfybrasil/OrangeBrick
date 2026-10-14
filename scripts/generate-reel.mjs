import { createClient } from "@supabase/supabase-js";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { randomInt } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateReelScript } from "../src/lib/video/reel-script.ts";
import { generateCompositionHtml, getReelSceneStarts } from "../src/lib/video/reel-composition.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
let targetSlug = args.find((a) => !a.startsWith("--"));
const isLatest = args.includes("--latest");
const sendTelegram = args.includes("--telegram");

console.log("\n🎬 Orange Brick — Gerador de Vídeos Curtos (Reels / Shorts)");
console.log("=========================================================\n");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureFfmpegPath() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe", "ffmpeg-9.0.1-essentials_build", "bin"),
    "C:\\Program Files\\ffmpeg\\bin",
    "C:\\ffmpeg\\bin"
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      if (!process.env.PATH?.includes(c)) {
        process.env.PATH = `${c};${process.env.PATH || ""}`;
      }
      return c;
    }
  }
  return null;
}
ensureFfmpegPath();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Erro: Variáveis do Supabase não configuradas no .env.local");
    process.exit(1);
  }
  if (!geminiKey) {
    console.error("❌ Erro: GEMINI_API_KEY não configurada no .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let post = null;

  if (isLatest || !targetSlug) {
    console.log("🔍 Buscando a matéria mais recente...");
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error("❌ Erro ao buscar último post:", error?.message);
      process.exit(1);
    }
    post = data;
  } else {
    // Clean target slug if a full URL was passed
    if (targetSlug.includes("/posts/")) {
      targetSlug = targetSlug.split("/posts/")[1].replace(/\/$/, "");
    }

    console.log(`🔍 Buscando matéria: "${targetSlug}"...`);
    let query = supabase.from("posts").select("*");
    if (UUID_REGEX.test(targetSlug)) {
      query = query.eq("id", targetSlug);
    } else {
      query = query.eq("slug", targetSlug);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      console.error(`❌ Post "${targetSlug}" não encontrado:`, error?.message);
      process.exit(1);
    }
    post = data;
  }

  console.log(`📌 Post encontrado: ${post.title}`);
  console.log(`📂 Categoria: ${post.category} | Slug: ${post.slug}\n`);

  // Atualiza status no manifest
  const manifestPath = path.join(ROOT_DIR, "public", "reels", "manifest.json");
  try {
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : {};
    manifest[post.slug] = {
      slug: post.slug,
      status: "generating",
      started_at: new Date().toISOString()
    };
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  } catch {}

  // 1. Generate Script with Gemini
  console.log("🤖 1/5: Gerando roteiro dinâmico com Gemini 3.8 Flash...");
  const script = await generateReelScript(post, geminiKey);
  console.log(`   Hook: "${script.hook}"`);
  console.log(`   Destaque: "${script.headline}"`);

  // Setup work directory
  const workDir = path.join(ROOT_DIR, "tmp", "reels", post.slug);
  const assetsDir = path.join(workDir, "assets");
  const compDir = path.join(workDir, "composition");
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(compDir, { recursive: true });

  // 2. Download Images
  console.log("\n🖼️ 2/5: Coletando imagens editoriais...");
  const imageUrls = [];
  if (post.image_url) imageUrls.push(post.image_url);

  // Extract images from post content blocks if present
  try {
    const blocks = typeof post.body === "string" && post.body.startsWith("[") ? JSON.parse(post.body) : [];
    for (const b of blocks) {
      if (b.type === "image" && b.url && !imageUrls.includes(b.url)) {
        imageUrls.push(b.url);
      }
    }
  } catch {}

  const localImages = [];
  for (let i = 0; i < Math.max(imageUrls.length, 1); i++) {
    const url = imageUrls[i];
    const fileName = `img_${i}.webp`;
    const dest = path.join(assetsDir, fileName);
    if (url) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(dest, buf);
          localImages.push(`assets/${fileName}`);
        }
      } catch (err) {
        console.warn(`   Aviso: Falha ao baixar imagem ${url}:`, err.message);
      }
    }
  }

  // 3. Generate Audio (TTS)
  console.log("\n🎙️ 3/5: Sintetizando narração em português (ElevenLabs ou Edge TTS)...");
  const ttsScript = path.join(ROOT_DIR, "src", "lib", "video", "reel-tts.py");
  const pyCmd = process.platform === "win32" ? "py" : "python3";

  const ttsRes = spawnSync(pyCmd, [
    ttsScript,
    "--text", script.narrationText,
    "--out-dir", workDir,
    "--voice", "pt-BR-AntonioNeural"
  ], { stdio: "inherit" });

  if (ttsRes.status !== 0) {
    console.error("❌ Erro na síntese de voz.");
    process.exit(1);
  }

  const ttsMetadata = JSON.parse(fs.readFileSync(path.join(workDir, "tts-provider.json"), "utf-8"));
  script.ttsProvider = ttsMetadata.provider;
  const sentences = JSON.parse(fs.readFileSync(path.join(workDir, "sentences.json"), "utf-8"));
  const voiceDuration = sentences.length ? sentences[sentences.length - 1].end : 40.0;
  const variation = randomInt(0, 1000000);
  const totalDuration = Math.round((voiceDuration + 2.5) * 10) / 10;
  console.log(`   Duração da narração: ${voiceDuration}s (Total: ${totalDuration}s)`);

  // 4. Mix Audio (Voice + BGM + SFX)
  console.log("\n🔊 4/5: Mixando áudio, trilha sonora e efeitos...");
  const mixerScript = path.join(ROOT_DIR, "src", "lib", "video", "reel-mixer.py");
  const audioAssetsDir = path.join(ROOT_DIR, "assets", "reels", "audio");
  fs.writeFileSync(path.join(workDir, "production.json"), JSON.stringify({
    variation,
    sceneStarts: getReelSceneStarts(totalDuration, variation),
  }, null, 2));
  const masterAudio = path.join(workDir, "master_audio.m4a");

  const mixRes = spawnSync(pyCmd, [
    mixerScript,
    "--work-dir", workDir,
    "--assets-dir", audioAssetsDir,
    "--duration", String(totalDuration),
    "--out", masterAudio
  ], { stdio: "inherit" });

  if (mixRes.status !== 0) {
    console.error("❌ Erro na mixagem de áudio.");
    process.exit(1);
  }

  // 5. Render Video with HyperFrames
  console.log("\n🎥 5/5: Construindo composição e renderizando em 1080x1920 (HyperFrames)...");
  
  // Copy assets into composition folder
  const compAssetsDir = path.join(compDir, "assets");
  fs.mkdirSync(compAssetsDir, { recursive: true });
  for (const f of fs.readdirSync(assetsDir)) {
    fs.copyFileSync(path.join(assetsDir, f), path.join(compAssetsDir, f));
  }

  // Write HyperFrames files
  fs.writeFileSync(path.join(compDir, "hyperframes.json"), JSON.stringify({
    "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
    "paths": { "assets": "assets" }
  }, null, 2));

  fs.writeFileSync(path.join(compDir, "package.json"), JSON.stringify({
    "name": "reel-composition",
    "type": "module"
  }, null, 2));

  const html = generateCompositionHtml({
    script,
    category: post.category,
    duration: totalDuration,
    variation,
    sentences,
    imagePaths: localImages
  });
  fs.writeFileSync(path.join(compDir, "index.html"), html, "utf-8");

  // Render MP4
  const renderMp4 = path.join(workDir, "render.mp4");
  const renderCmd = `npx --yes hyperframes@0.8.147 render --fps 30 --workers 2 -o "${renderMp4}"`;
  console.log("   Iniciando renderização de quadros...");
  execSync(renderCmd, { cwd: compDir, stdio: "inherit" });

  // Mux final video
  const finalVideoDir = path.join(ROOT_DIR, "public", "reels");
  fs.mkdirSync(finalVideoDir, { recursive: true });
  const finalVideo = path.join(finalVideoDir, `${post.slug}.mp4`);

  console.log("\n✨ Finalizando montagem com FFmpeg...");
  const muxCmd = `ffmpeg -y -i "${renderMp4}" -i "${masterAudio}" -c:v copy -c:a copy -shortest "${finalVideo}"`;
  execSync(muxCmd, { stdio: "inherit" });

  // Salva no manifest.json
  try {
    const stats = fs.statSync(finalVideo);
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : {};
    manifest[post.slug] = {
      slug: post.slug,
      status: "ready",
      finished_at: new Date().toISOString(),
      video_url: `/reels/${post.slug}.mp4`,
      duration: totalDuration,
      variation,
      file_size: stats.size,
      script
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  } catch {}

  console.log("\n=========================================================");
  console.log("🎉 SUCESSO! VÍDEO DO REEL GERADO COM PERFEIÇÃO!");
  console.log("=========================================================");
  console.log(`📁 Arquivo local: ${finalVideo}`);
  console.log(`🌐 Link local: /reels/${post.slug}.mp4\n`);

  // Optional: Send to Telegram
  if (sendTelegram && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
    console.log("📲 Enviando vídeo para o Telegram do Administrador...");
    try {
      const formData = new FormData();
      formData.append("chat_id", process.env.TELEGRAM_ADMIN_CHAT_ID);
      formData.append("caption", `🎬 <b>Novo Reel Gerado!</b>\n\n📌 <b>${post.title}</b>\n🔗 /posts/${post.slug}`);
      formData.append("parse_mode", "HTML");
      const videoBuffer = fs.readFileSync(finalVideo);
      formData.append("video", new Blob([videoBuffer], { type: "video/mp4" }), `${post.slug}.mp4`);

      const telRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendVideo`, {
        method: "POST",
        body: formData
      });
      if (telRes.ok) {
        console.log("✅ Vídeo enviado com sucesso para o Telegram!");
      } else {
        const errText = await telRes.text();
        console.warn("⚠️ Aviso ao enviar para Telegram:", errText);
      }
    } catch (e) {
      console.warn("⚠️ Erro ao enviar para Telegram:", e.message);
    }
  }
}

run().catch((err) => {
  console.error("\n❌ Erro fatal durante a execução:", err);
  process.exit(1);
});
