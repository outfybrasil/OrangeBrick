import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  try {
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    }

    const body = await request.json();

    if (typeof body.website === "string" && body.website.length > 0) {
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim().slice(0, 120);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
    const subject = String(body.subject || "").trim().slice(0, 160);
    const message = String(body.message || "").trim().slice(0, 5000);

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const secret = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!forwarded || forwarded === "unknown" || !secret) {
      return NextResponse.json({ error: "Não foi possível validar o envio." }, { status: 503 });
    }
    const identity = createHash("sha256").update(`${secret}:${forwarded}`).digest("hex");
    const windowStart = new Date();
    windowStart.setUTCMinutes(0, 0, 0);
    const client = serviceClient();
    const { data: allowed, error: rateError } = await client.rpc("consume_rate_limit", {
      p_action: "contact_submit",
      p_identity_hash: identity,
      p_window_start: windowStart.toISOString(),
      p_limit: 3,
    });
    if (rateError || !allowed) {
      return NextResponse.json(
        { error: "Você já enviou várias mensagens. Tente novamente mais tarde." },
        { status: 429 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const to = process.env.CONTACT_EMAIL;
    if (!apiKey || !from || !to) {
      return NextResponse.json({ error: "Canal de contato indisponível no momento." }, { status: 503 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Site] ${subject}`,
        text: `Nome: ${name}\nE-mail: ${email}\nAssunto: ${subject}\n\n${message}`,
      }),
    });

    if (!res.ok) {
      console.error("Falha ao enviar e-mail de contato:", res.status, await res.text());
      return NextResponse.json({ error: "Não foi possível enviar a mensagem. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
}
