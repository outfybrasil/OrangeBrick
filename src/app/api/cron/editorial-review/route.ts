import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { processNextEditorialReview } from "@/lib/server/editorial-review-jobs";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const processed = await processNextEditorialReview();
  return NextResponse.json({ processed });
}
