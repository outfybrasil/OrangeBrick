import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const client = serviceClient();
  const { data: { user } } = await client.auth.getUser(authorization.slice(7));
  return user?.app_metadata?.is_admin === true ? user : null;
}

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const client = serviceClient();
  const members = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: "Não foi possível carregar a equipe" }, { status: 500 });
    members.push(...data.users
      .filter((member) => member.app_metadata?.is_admin === true)
      .map((member) => ({
        id: member.id,
        email: member.email || "E-mail indisponível",
        name: typeof member.user_metadata?.display_name === "string"
          ? member.user_metadata.display_name
          : typeof member.user_metadata?.full_name === "string"
            ? member.user_metadata.full_name
            : "Administrador",
        createdAt: member.created_at,
        lastSignInAt: member.last_sign_in_at || null,
      })));
    if (data.users.length < 1000) break;
  }

  return NextResponse.json({ members });
}
