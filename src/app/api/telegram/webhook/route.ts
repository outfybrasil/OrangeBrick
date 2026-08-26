import { NextResponse, after } from "next/server";
import { timingSafeEqual } from "crypto";
import { handleTelegramWebhook, notifyNewCommunityReports } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function verifyWebhookSecret(request: Request): string | null {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    return "TELEGRAM_WEBHOOK_SECRET não configurado neste ambiente.";
  }
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (!provided) {
    return "Header x-telegram-bot-api-secret-token ausente.";
  }
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (providedBuffer.length !== expectedBuffer.length) {
    return "Token secreto do webhook inválido.";
  }
  return timingSafeEqual(providedBuffer, expectedBuffer) ? null : "Token secreto do webhook inválido.";
}

export async function POST(request: Request) {
  const secretError = verifyWebhookSecret(request);
  if (secretError) {
    return NextResponse.json({ error: secretError }, { status: 401 });
  }
  try {
    const update = await request.json();
    after(async () => {
      await notifyNewCommunityReports().catch(() => {});
    });
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
