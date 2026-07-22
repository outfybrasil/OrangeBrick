import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user || !isAdminUser(user)) {
      return NextResponse.json({ isAdmin: false, error: "Não autorizado" });
    }

    return NextResponse.json({ isAdmin: true, email: user.email });
  } catch (err: any) {
    return NextResponse.json({ isAdmin: false, error: err.message || "Erro de servidor" });
  }
}
