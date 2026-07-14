import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ isAdmin: false, error: "Usuário não autenticado" });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@orangebrick.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ isAdmin: false, error: "E-mail não autorizado" });
    }

    return NextResponse.json({ isAdmin: true, email: user.email });
  } catch (err: any) {
    return NextResponse.json({ isAdmin: false, error: err.message || "Erro de servidor" });
  }
}
