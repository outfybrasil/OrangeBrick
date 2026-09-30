import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyAdmin } from "@/lib/telegram/bot";
import { getSiteUrl } from "@/lib/site-url";
import { readResponseBuffer } from "@/lib/server/network";
import { getRateLimitIdentity, getRateLimitWindowStart } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  try {
    const site = request.headers.get("sec-fetch-site");
    const origin = request.headers.get("origin");
    if ((site && site !== "same-origin" && site !== "same-site" && site !== "none")
      || (origin && origin !== new URL(request.url).origin)) {
      return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    }

    let parsedBody: unknown;
    try {
      const body = await readResponseBuffer(new Response(request.body), 16 * 1024);
      parsedBody = JSON.parse(body.toString("utf8"));
    } catch (error) {
      const tooLarge = error instanceof Error && error.message.includes("ultrapassa");
      return NextResponse.json(
        { error: tooLarge ? "A requisição ultrapassa o tamanho permitido." : "JSON inválido." },
        { status: tooLarge ? 413 : 400 },
      );
    }
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }
    const body = parsedBody as Record<string, unknown>;

    if (typeof body.website === "string" && body.website.length > 0) {
      return NextResponse.json({ ok: true });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 160) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 5000) : "";

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const secret = process.env.RATE_LIMIT_SALT || (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
    const identity = getRateLimitIdentity(request, secret || "");
    if (!identity) {
      return NextResponse.json({ error: "Não foi possível validar o envio." }, { status: 503 });
    }
    const windowStart = getRateLimitWindowStart(new Date(), 60 * 60 * 1000);
    const client = serviceClient();
    const { data: allowed, error: rateError } = await client.rpc("consume_rate_limit", {
      p_action: "contact_submit",
      p_identity_hash: identity,
      p_window_start: windowStart.toISOString(),
      p_limit: 3,
    });
    if (rateError) {
      console.error("Contact form rate-limit failure", rateError);
      return NextResponse.json(
        { error: "Não foi possível validar o envio. Tente novamente mais tarde." },
        { status: 503 },
      );
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "Você já enviou várias mensagens. Tente novamente mais tarde." },
        { status: 429 },
      );
    }

    const { error: insertError } = await client.from("contact_submissions").insert({
      name,
      company: "Geral",
      subject,
      email,
      budget: "up_to_5k",
      message,
      ip_hash: identity,
    });

    if (insertError) {
      console.error("Falha ao registrar mensagem de contato:", insertError);
      return NextResponse.json({ error: "Não foi possível enviar a mensagem. Tente novamente." }, { status: 500 });
    }

    await notifyAdmin(
      `📨 <b>Novo contato pelo site</b>\n\n<a href="${getSiteUrl()}/admin/contact">Abrir caixa de entrada</a>`,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error("Falha inesperada no formulário de contato", reference, error);
    return NextResponse.json(
      { error: "Não foi possível enviar a mensagem. Tente novamente.", reference },
      { status: 500 },
    );
  }
}
