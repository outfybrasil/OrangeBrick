import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { audiencePath } from "@/lib/audience";
import { createServiceDataClient } from "@/lib/supabase/server";
import { getRateLimitIdentity, getRateLimitWindowStart } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") !== "same-origin") return new NextResponse(null, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 1024) return new NextResponse(null, { status: 413 });
  const raw = await request.text();
  if (raw.length > 1024) return new NextResponse(null, { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  if (!body || typeof body !== "object" || typeof body.path !== "string" || body.path !== audiencePath(body.path) && body.path !== "/perfil" || !/^[a-f0-9]{32}$/i.test(body.device || "") || !/^[a-f0-9-]{36}$/i.test(body.id || "")) return new NextResponse(null, { status: 400 });
  const secret = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const identity = getRateLimitIdentity(request, secret);
  if (!identity) return new NextResponse(null, { status: 503 });
  const client = createServiceDataClient();
  const { data: allowed, error: rateError } = await client.rpc("consume_rate_limit", { p_action: "audience", p_identity_hash: identity, p_window_start: getRateLimitWindowStart(new Date(), 60_000).toISOString(), p_limit: 60 });
  if (rateError || !allowed) return new NextResponse(null, { status: 429 });
  const { error } = await client.from("audience_pageviews").upsert({ id: body.id, path: body.path, visitor_hash: createHmac("sha256", secret).update(body.device).digest("hex") }, { onConflict: "id", ignoreDuplicates: true });
  return new NextResponse(null, { status: error ? 503 : 204 });
}
