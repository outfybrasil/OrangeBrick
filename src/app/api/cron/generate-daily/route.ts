import { NextResponse } from "next/server";
import { generateNewsDraft } from "@/lib/ai/gemini-news";
import { sendPostForApproval } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
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
    const message = err instanceof Error ? err.message : "Falha na geração";
    console.error("Erro na geração automática diária:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
