import { generateNewsDraft } from "../src/lib/ai/gemini-news.ts";
import { sendPostForApproval } from "../src/lib/telegram/bot.ts";

const args = process.argv.slice(2);
const topic = args.find((a) => !a.startsWith("--"));
const sourceUrl = args.find((a) => a.startsWith("http"));

console.log("🧱 Orange Brick — Gerador de Notícias com Gemini 2.0");
console.log("===================================================\n");

async function run() {
  if (sourceUrl) {
    console.log(`🔗 Gerando a partir da URL: ${sourceUrl}`);
  } else if (topic) {
    console.log(`🎯 Gerando sobre o tema: "${topic}"`);
  } else {
    console.log("🌐 Pesquisando a notícia mais importante de hoje na web...");
  }

  const result = await generateNewsDraft({
    topic: sourceUrl ? undefined : topic,
    sourceUrl: sourceUrl,
  });

  console.log("\n✅ Rascunho criado com sucesso no Supabase!");
  console.log("-------------------------------------------");
  console.log(`📰 Título: ${result.post.title}`);
  console.log(`🏷️ Categoria: ${result.post.category}`);
  console.log(`📊 Palavras: ${result.wordCount}`);
  console.log(`🔗 Slug: /posts/${result.post.slug}`);
  console.log(`🖼️ Capa: ${result.post.image_url || "Nenhuma"}`);

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
    console.log("\n📱 Enviando card de aprovação para o Telegram...");
    await sendPostForApproval(result.post, result.wordCount);
    console.log("📲 Notificação enviada! Verifique seu Telegram.");
  } else {
    console.log("\n💡 Configure TELEGRAM_BOT_TOKEN e TELEGRAM_ADMIN_CHAT_ID para receber no celular.");
  }
}

run().catch((err) => {
  console.error("\n❌ Erro na geração:", err.message);
  process.exit(1);
});
