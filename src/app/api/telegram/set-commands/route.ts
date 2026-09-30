import { NextResponse } from "next/server";
import { registerBotCommands } from "@/lib/telegram/bot";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(): Promise<NextResponse> {
  try {
    const results = await registerBotCommands();
    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha ao registrar comandos";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return handle();
}

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return handle();
}
