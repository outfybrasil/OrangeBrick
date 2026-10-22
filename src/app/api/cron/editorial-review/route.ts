import { after, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { isAuthorizedEditorialDispatcher, processNextEditorialReview } from "@/lib/server/editorial-review-jobs";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const deadline = Date.now() + 240_000;
  let processed = 0;
  while (processed < 5 && Date.now() < deadline) {
    try {
      if (!(await processNextEditorialReview())) break;
      processed++;
    } catch (error) {
      console.error("Falha ao processar revisão editorial:", error instanceof Error ? error.message : "erro_desconhecido");
      break;
    }
  }
  return NextResponse.json({ processed });
}

export async function POST(request: Request) {
  if (!await isAuthorizedEditorialDispatcher(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  after(async () => { await processNextEditorialReview().catch(() => {}); });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
