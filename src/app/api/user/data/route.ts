import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const [profile, comments, reactions] = await Promise.all([
      serviceClient.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      serviceClient.from("comments").select("*").eq("user_id", user.id),
      serviceClient.from("reactions").select("*").eq("user_id", user.id),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
      },
      profile: profile.data || null,
      comments: comments.data || [],
      reactions: reactions.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro de servidor" }, { status: 500 });
  }
}
