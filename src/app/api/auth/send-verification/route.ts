import { NextResponse, type NextRequest } from "next/server";
import { sendVerificationEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, confirmationUrl, userName } = body;

    if (!email || typeof email !== "string" || !confirmationUrl || typeof confirmationUrl !== "string") {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios ausentes (email, confirmationUrl)." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Endereço de e-mail inválido." },
        { status: 400 }
      );
    }

    const result = await sendVerificationEmail({
      to: email.trim(),
      confirmationUrl,
      userName: typeof userName === "string" ? userName : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Falha ao enviar e-mail." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
