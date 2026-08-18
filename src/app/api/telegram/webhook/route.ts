import { NextResponse } from "next/server";
import { handleTelegramWebhook } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token")?.trim();
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim().replace(/^["']|["']$/g, "");

  if (expectedSecret && secretHeader && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await request.json();
    await handleTelegramWebhook(update);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Erro no webhook do Telegram:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Orange Brick Telegram Bot Webhook Active",
    timestamp: new Date().toISOString(),
  });
}
