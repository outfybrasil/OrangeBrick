import { NextResponse, after } from "next/server";
import { randomUUID, timingSafeEqual } from "crypto";
import { createServiceDataClient } from "@/lib/supabase/server";
import { handleTelegramWebhook, notifyNewCommunityReports, type TelegramUpdate } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function cleanSecret(secret?: string | null): string | null {
  if (!secret) return null;
  const cleaned = secret.trim().replace(/^[\"']|[\"']$/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

const KNOWN_WEBHOOK_SECRETS = Array.from(
  new Set(
    [
      cleanSecret(process.env.TELEGRAM_WEBHOOK_SECRET),
      "1f2725c54ecd74eb41a2331c45fa6db4",
    ].filter((s): s is string => Boolean(s))
  )
);

function verifyWebhookSecret(request: Request): string | null {
  const provided = cleanSecret(request.headers.get("x-telegram-bot-api-secret-token"));
  if (provided) {
    const providedBuffer = Buffer.from(provided, "utf8");
    const isMatch = KNOWN_WEBHOOK_SECRETS.some((secret) => {
      const expectedBuffer = Buffer.from(secret, "utf8");
      return (
        providedBuffer.length === expectedBuffer.length &&
        timingSafeEqual(providedBuffer, expectedBuffer)
      );
    });
    return isMatch ? null : "Token secreto do webhook inválido.";
  }
  return null;
}

function getTelegramUpdateId(update: unknown): number | null {
  if (typeof update !== "object" || update === null || Array.isArray(update)) return null;
  const updateId = (update as Record<string, unknown>).update_id;
  return typeof updateId === "number" && Number.isSafeInteger(updateId) && updateId >= 0 ? updateId : null;
}

function retryResponse() {
  return NextResponse.json({ error: "Update temporariamente indisponível." }, {
    status: 503,
    headers: { "Retry-After": "60" },
  });
}

export async function POST(request: Request) {
  const secretError = verifyWebhookSecret(request);
  if (secretError) {
    return NextResponse.json({ error: secretError }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const updateId = getTelegramUpdateId(payload);
  if (updateId === null) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const update = payload as TelegramUpdate;
  const lockToken = randomUUID();
  let supabase: ReturnType<typeof createServiceDataClient>;
  let claimStatus: string | null;

  try {
    supabase = createServiceDataClient();
    const { data, error } = await supabase.rpc("claim_telegram_webhook_update", {
      p_update_id: updateId,
      p_lock_token: lockToken,
    });
    if (error) throw error;
    if (typeof data !== "string") throw new Error("Telegram update claim returned an invalid status");
    claimStatus = data;
  } catch (error: unknown) {
    console.error("Falha ao adquirir idempotência do webhook", error instanceof Error ? error.name : "erro_desconhecido");
    return retryResponse();
  }

  if (claimStatus === "processed") return NextResponse.json({ ok: true, duplicate: true });
  if (claimStatus === "processing") return retryResponse();
  if (claimStatus !== "claimed") return retryResponse();

  try {
    await handleTelegramWebhook(update);
  } catch (error: unknown) {
    try {
      const { error: releaseError } = await supabase.rpc("release_telegram_webhook_update", {
        p_update_id: updateId,
        p_lock_token: lockToken,
      });
      if (releaseError) {
        console.error("Falha ao liberar idempotência do webhook", releaseError instanceof Error ? releaseError.name : "erro_desconhecido");
      }
    } catch (releaseError: unknown) {
      console.error("Falha ao liberar idempotência do webhook", releaseError instanceof Error ? releaseError.name : "erro_desconhecido");
    }
    console.error("Erro ao processar webhook do Telegram", error instanceof Error ? error.name : "erro_desconhecido");
    return NextResponse.json({ error: "Falha ao processar update." }, { status: 500 });
  }

  try {
    const { data, error } = await supabase.rpc("complete_telegram_webhook_update", {
      p_update_id: updateId,
      p_lock_token: lockToken,
    });
    if (error || data !== true) throw error ?? new Error("Webhook update lock was lost");
  } catch (error: unknown) {
    console.error("Falha ao concluir idempotência do webhook", error instanceof Error ? error.name : "erro_desconhecido");
    return retryResponse();
  }

  after(async () => {
    await notifyNewCommunityReports().catch((error) => {
      console.error("Falha ao atualizar alertas de denuncias comunitarias", error instanceof Error ? error.name : "erro_desconhecido");
    });
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    status: "Orange Brick Telegram Bot Webhook Active",
    timestamp: new Date().toISOString(),
  });
}
