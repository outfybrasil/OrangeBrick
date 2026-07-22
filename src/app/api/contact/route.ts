import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

const ipRequests = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de enviar novamente." }, { status: 429 });
    }

    const body = await request.json();
    const { name, company, email, budget, message } = body;

    if (!name || !company || !email || !message) {
      return NextResponse.json({ error: "Campos obrigatórios: name, company, email, message" }, { status: 400 });
    }

    if (typeof name !== "string" || name.length > 100) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_REGEX.test(email) || email.length > 254) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }
    if (typeof message !== "string" || message.length > 5000) {
      return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });
    }
    if (typeof company !== "string" || company.length > 200) {
      return NextResponse.json({ error: "Empresa inválida" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await (supabase.from("contact_submissions" as any) as any).insert({
      name: name.trim(),
      company: company.trim(),
      email: email.trim().toLowerCase(),
      budget: budget || "up_to_5k",
      message: message.trim(),
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Proposta recebida com sucesso. Entraremos em contato em até 24 horas.",
    });
  } catch (err: any) {
    console.error("Erro no formulário de contato:", err);
    return NextResponse.json({ error: err.message || "Erro interno no servidor" }, { status: 500 });
  }
}
