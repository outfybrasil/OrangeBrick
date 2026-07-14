import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, company, email, budget, message } = body;

    if (!name || !company || !email || !message) {
      return NextResponse.json(
        { error: "Campos obrigatórios: name, company, email, message" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { error } = await (supabase.from("contact_submissions") as any).insert({
      name,
      company,
      email,
      budget: budget || "up_to_5k",
      message,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Proposta recebida com sucesso. Entraremos em contato em até 24 horas.",
    });
  } catch (err: any) {
    console.error("Erro no formulário de contato:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
