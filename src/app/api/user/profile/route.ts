import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceDataClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { getGoogleAvatarUrl } from "@/lib/avatar";

export const dynamic = "force-dynamic";

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "brickboard",
  "configuracoes",
  "orange-brick",
  "orangebrick",
  "perfil",
  "profile",
]);

function normalizeUsername(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const service = createServiceDataClient();
    const { data: { user }, error } = await service.auth.getUser(token);
    if (!error && user) return user;
  }
  const ssr = await createServerSupabaseClient();
  const { data: { user } } = await ssr.auth.getUser();
  return user ?? null;
}

export async function GET(request: Request) {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const service = createServiceDataClient();
  const { data: profile } = await service
    .from("public_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  if (profile) {
    return NextResponse.json({ profile });
  }

  const initialName = (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Jogador"
  ).slice(0, 30);

  const cleanUsername = (
    user.user_metadata?.user_name ||
    user.email?.split("@")[0] ||
    "jogador"
  ).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18);

  const provisionalUsername = `${cleanUsername || "jogador"}-${user.id.slice(0, 4)}`;

  const { error: insertError } = await service
    .from("profiles")
    .insert({
      user_id: user.id,
      nickname: initialName,
      display_name: initialName,
      username: provisionalUsername,
      avatar_url: getGoogleAvatarUrl(user) || null,
    });

  if (insertError) {
    return NextResponse.json({ error: "Falha ao provisionar perfil inicial" }, { status: 500 });
  }

  const { data: createdProfile } = await service
    .from("public_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  return NextResponse.json({ profile: createdProfile });
}

export async function POST(request: Request) {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json() as {
    displayName?: string;
    username?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    favoritePlatforms?: string[];
    favoriteCategories?: string[];
    showLifetimeXp?: boolean;
    showActivityStats?: boolean;
    showSeasonHistory?: boolean;
    showInLeaderboard?: boolean;
    selectedTitle?: string | null;
    selectedFrame?: string | null;
    selectedTheme?: string | null;
  };

  const displayName = (body.displayName || "").trim();
  if (displayName.length < 2 || displayName.length > 30) {
    return NextResponse.json({ error: "O nome exibido deve ter de 2 a 30 caracteres." }, { status: 400 });
  }

  const rawUsername = (body.username || "").trim();
  const normalizedUser = normalizeUsername(rawUsername);
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(normalizedUser)) {
    return NextResponse.json(
      { error: "O nome de usuário deve ter de 3 a 30 caracteres e conter apenas letras, números e hífens." },
      { status: 400 }
    );
  }

  if (RESERVED_USERNAMES.has(normalizedUser)) {
    return NextResponse.json({ error: "Este nome de usuário é reservado do sistema." }, { status: 400 });
  }

  const service = createServiceDataClient();

  const { data: existingUser } = await service
    .from("profiles")
    .select("user_id")
    .eq("username", normalizedUser)
    .neq("user_id", user.id)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json({ error: "Este nome de usuário já está em uso." }, { status: 409 });
  }

  const durableAvatarUrl = (body.avatarUrl || "").trim() || getGoogleAvatarUrl(user) || null;

  const { error: upsertError } = await service
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        nickname: displayName,
        display_name: displayName,
        username: normalizedUser,
        bio: (body.bio || "").trim() || null,
        avatar_url: durableAvatarUrl,
        favorite_platforms: body.favoritePlatforms || [],
        favorite_categories: body.favoriteCategories || [],
        show_lifetime_xp: body.showLifetimeXp ?? true,
        show_activity_stats: body.showActivityStats ?? true,
        show_season_history: body.showSeasonHistory ?? true,
        show_in_leaderboard: body.showInLeaderboard ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    return NextResponse.json({ error: "Falha ao salvar as alterações do perfil." }, { status: 500 });
  }

  if (body.selectedTheme !== undefined || body.selectedTitle !== undefined || body.selectedFrame !== undefined) {
    await service
      .from("profiles")
      .update({
        profile_theme: body.selectedTheme || "default",
        equipped_title: body.selectedTitle || null,
        equipped_frame: body.selectedFrame || null,
      })
      .eq("user_id", user.id);
  }

  const { data: updatedProfile } = await service
    .from("public_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  return NextResponse.json({ success: true, profile: updatedProfile });
}
