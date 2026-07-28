import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EVENT_NAMES = new Set(["article", "brickboard", "radar", "return_summary"]);

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") && request.headers.get("sec-fetch-site") !== "same-origin") {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { eventName?: unknown; target?: unknown } | null;
  const eventName = typeof body?.eventName === "string" ? body.eventName : "";
  const target = typeof body?.target === "string" ? body.target.trim().slice(0, 180) : null;
  if (!EVENT_NAMES.has(eventName)) return NextResponse.json({ error: "Evento inválido" }, { status: 400 });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const secret = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return NextResponse.json({ error: "Serviço indisponível" }, { status: 503 });
  const identity = createHash("sha256").update(`${secret}:${forwarded}`).digest("hex");
  const windowStart = new Date();
  windowStart.setUTCMinutes(0, 0, 0);
  const client = serviceClient();
  const { data: allowed, error: rateError } = await client.rpc("consume_rate_limit", {
    p_action: "home_engagement",
    p_identity_hash: identity,
    p_window_start: windowStart.toISOString(),
    p_limit: 60,
  });
  if (rateError || !allowed) return new NextResponse(null, { status: 204 });
  const { error } = await client.from("home_engagement_events").insert({ event_name: eventName, target });
  return error
    ? NextResponse.json({ error: "Não foi possível registrar o evento" }, { status: 500 })
    : new NextResponse(null, { status: 204 });
}
