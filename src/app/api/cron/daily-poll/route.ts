import { NextResponse } from "next/server";
import { generateDailyPoll } from "@/lib/daily-poll-generator";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  try {
    const result = await generateDailyPoll(createServiceRoleClient(), new URL(request.url).searchParams.get("force") === "1");
    return NextResponse.json({ id: result.poll.id, question: result.poll.question, prompt_date: result.poll.prompt_date, created: result.created, used_fallback: result.usedFallback, fallback_reason: result.fallbackReason || null, source_post_id: result.sourcePostId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao gerar a pergunta do dia" }, { status: 500 });
  }
}
