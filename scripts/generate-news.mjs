import { generateNewsDraft } from "../src/lib/ai/gemini-news.ts";
import { sendPostForApproval } from "../src/lib/telegram/bot.ts";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const topic = args.find((a) => !a.startsWith("--"));
const sourceUrl = args.find((a) => a.startsWith("http"));
const withReel = args.includes("--with-reel");

console.log("🎮 Orange Brick — Gerador de Notícias com Gemini 2.0");
console.log("===================================================\n");

async function run() {
  if (sourceUrl) {
    console.log(`🌐 Gerando a partir da URL: ${sourceUrl}`);
  } else if (topic) {
    console.log(`🎯 Gerando sobre o tema: "${topic}"`);
  } else {
    console.log("🔍 Pesquisando a notícia mais importante de hoje na web...");
  }

  const result = await generateNewsDraft({
    topic: sourceUrl ? undefined : topic,
    sourceUrl: sourceUrl,
  });

  console.log("\n✅ Rascunho criado com sucesso no Supabase!");
  console.log("-------------------------------------------");
  console.log(`📌 Título: ${result.post.title}`);
  console.log(`🏷️ Categoria: ${result.post.category}`);
  console.log(`📝 Palavras: ${result.wordCount}`);
  console.log(`🔗 Slug: /posts/${result.post.slug}`);
  console.log(`🖼️ Capa: ${result.post.image_url || "Nenhuma"}`);

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
    console.log("\n📲 Enviando card de aprovação para o Telegram...");
    await sendPostForApproval(result.post, result.wordCount);
    console.log("🔔 Notificação enviada! Verifique seu Telegram.");
  } else {
    console.log("\n⚠️ Configure TELEGRAM_BOT_TOKEN e TELEGRAM_ADMIN_CHAT_ID para receber no celular.");
  }

  if (withReel && result.post?.slug) {
    console.log("\n🎬 Flag --with-reel ativa: Iniciando geração automática de vídeo...");
    try {
      execSync(`node --experimental-strip-types --env-file=.env.local scripts/generate-reel.mjs ${result.post.slug} ${process.env.TELEGRAM_BOT_TOKEN ? "--telegram" : ""}`, { stdio: "inherit" });
    } catch (e) {
      console.warn("⚠️ Aviso: Falha ao gerar Reel automático:", e.message);
    }
  }
}

run().catch((err) => {
  console.error("\n❌ Erro na geração:", err.message);
  process.exit(1);
});
