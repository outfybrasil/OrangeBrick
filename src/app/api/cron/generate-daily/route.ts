import { NextResponse } from "next/server";
import { generateNewsDraft, NoFreshTopicError } from "@/lib/ai/gemini-news";
import { sendPostForApproval, sendTelegramApi, notifyAdmin } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
}

async function notifyAdminNoFreshTopic(reason: string) {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId) return;
  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text: `📭 <b>Cron diário: nenhuma pauta inédita gerada.</b>\n${reason}\n\nUse <code>/hoje</code> ou <code>/gerar &lt;tema&gt;</code> se quiser forçar uma cobertura.`,
    parse_mode: "HTML",
  }).catch(() => {});
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateNewsDraft();

    // Envia a prévia com botão para aprovação no Telegram
    await sendPostForApproval(result.post, result.wordCount).catch((err) => {
      console.error("Falha ao enviar notificação no Telegram:", err);
    });

    return NextResponse.json({
      ok: true,
      post: {
        id: result.post.id,
        title: result.post.title,
        slug: result.post.slug,
        category: result.post.category,
        wordCount: result.wordCount,
      },
    });
  } catch (err: unknown) {
    if (err instanceof NoFreshTopicError) {
      console.log("Cron diário sem pauta nova:", err.message);
      await notifyAdminNoFreshTopic(err.message);
      return NextResponse.json({ ok: false, reason: err.message });
    }
    const message = err instanceof Error ? err.message : "Falha na geração";
    console.error("Erro na geração automática diária:", err);
    await notifyAdmin(`❌ <b>Cron diário falhou.</b>\n<code>${message.replace(/</g, "&lt;")}</code>\n\nUse <code>/hoje</code> para tentar manualmente.`).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
