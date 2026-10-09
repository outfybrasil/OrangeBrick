"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { createDataClient } from "@/lib/supabase/client";
import { getGoogleAvatarUrl, resolveAvatarUrl } from "@/lib/avatar";
import { safeReturnTo } from "@/lib/auth/return-to";
import { hasCompletedOnboarding, ONBOARDING_GUIDE_PATH } from "@/lib/auth/onboarding";
import { PLATFORMS_CONFIG, PLATFORM_SLUGS, type PlatformSlug } from "@/lib/types/platform";

function ProfileSetupLoading() {
  return (
    <main id="conteudo-principal" tabIndex={-1} className="min-h-dvh flex items-center justify-center bg-background-void">
      <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
    </main>
  );
}

function ProfileSetupContent() {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createDataClient();

  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [favoritePlatforms, setFavoritePlatforms] = useState<PlatformSlug[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestedReturnTo = searchParams.get("returnTo") ?? searchParams.get("next");
  const returnTo = safeReturnTo(requestedReturnTo, ONBOARDING_GUIDE_PATH);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/entrar");
      return;
    }
    if (!user) return;
    if (hasCompletedOnboarding(user.user_metadata)) {
      router.replace(requestedReturnTo ? returnTo : "/configuracoes/perfil");
      return;
    }

    const metadataName = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";
    const metadataUsername = typeof user.user_metadata?.user_name === "string"
      ? user.user_metadata.user_name
      : "";
    const metadataPlatforms = Array.isArray(user.user_metadata?.favorite_platforms)
      ? user.user_metadata.favorite_platforms.filter((platform: unknown): platform is PlatformSlug =>
          typeof platform === "string" && PLATFORM_SLUGS.includes(platform as PlatformSlug)
        )
      : [];
    const profilePlatforms = profile?.favorite_platforms?.filter((platform): platform is PlatformSlug =>
      PLATFORM_SLUGS.includes(platform as PlatformSlug)
    ) || [];

    const initialAvatarUrl = profile?.avatar_url || getGoogleAvatarUrl(user) || "";
    queueMicrotask(() => {
      setNickname((current) => current || profile?.nickname || metadataName);
      setUsername((current) => current || metadataUsername || profile?.username || "");
      setBio((current) => current || profile?.bio || "");
      setFavoritePlatforms((current) => current.length
        ? current
        : profilePlatforms.length ? profilePlatforms : metadataPlatforms
      );
      if (initialAvatarUrl) setAvatarUrl((current) => current || initialAvatarUrl);
    });
  }, [user, profile, isLoading, router, requestedReturnTo, returnTo]);

  const toggleFavoritePlatform = (platform: PlatformSlug) => {
    setFavoritePlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    const normalizedUsername = username.trim().toLowerCase();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Nickname precisa ter entre 2 e 30 caracteres.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(normalizedUsername)) {
      setError("O usuário deve ter de 3 a 30 caracteres, usando letras, números ou hífen.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let durableAvatarUrl = avatarUrl.trim() || null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sua sessão expirou. Entre novamente.");

      if (avatarFile) {
        const formData = new FormData();
        formData.set("avatar", avatarFile);
        const response = await fetch("/api/user/avatar", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível salvar o avatar.");
        durableAvatarUrl = result.publicUrl;
      }

      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: trimmed,
          username: normalizedUsername,
          bio: bio.trim() || null,
          avatarUrl: durableAvatarUrl,
          favoritePlatforms,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar seu perfil.");
      await refreshProfile();
      router.push(returnTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return <ProfileSetupLoading />;
  }

  return (
    <main id="conteudo-principal" tabIndex={-1} className="flex min-h-dvh items-center justify-center bg-background-void px-3 py-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-orange-muted/20 bg-card-slate/40 p-5 shadow-2xl sm:p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center text-2xl mx-auto mb-3">
            {avatarUrl ? (
              <img loading="lazy" decoding="async" src={avatarUrl} alt="Prévia da foto de perfil" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null, nickname || user.email); }} />
            ) : (
              <span>{user.email?.[0].toUpperCase() || "?"}</span>
            )}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">Seu primeiro passo</p>
          <h1 className="mt-2 text-xl font-heading font-black uppercase tracking-wider">
            Configure seu perfil
          </h1>
          <p className="text-xs text-gray-400 font-body mt-1">
            Escolha como as pessoas vão reconhecer você no Orange Brick.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="profile-nickname" className="block text-xs uppercase font-bold text-gray-400 mb-1">
              Apelido *
            </label>
            <input
              id="profile-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Seu apelido (2-30 caracteres)"
              maxLength={30}
              className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-xl px-4 py-3 outline-none focus:border-brand-orange/50 transition-colors text-sm"
            />
          </div>

          <div>
            <label htmlFor="profile-username" className="mb-1 block text-xs font-bold uppercase text-gray-400">
              Usuário *
            </label>
            <div className="flex min-h-11 items-center rounded-xl border border-brand-orange-muted/20 bg-background-void px-4 focus-within:border-brand-orange/50">
              <span className="text-sm text-gray-500">@</span>
              <input
                id="profile-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="seu-usuario"
                maxLength={30}
                className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Este será o endereço permanente do seu perfil.</p>
          </div>

          <div>
            <label htmlFor="profile-bio" className="mb-1 block text-xs font-bold uppercase text-gray-400">
              Sobre você
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Que tipo de jogo você curte?"
              maxLength={160}
              rows={3}
              className="w-full resize-none border border-brand-orange-muted/20 bg-background-void px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-orange/50"
            />
            <p className="mt-1 text-right text-xs text-gray-500">{bio.length}/160</p>
          </div>

          <fieldset>
            <legend className="mb-2 block text-xs font-bold uppercase text-gray-400">Plataformas favoritas</legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_SLUGS.map((platform) => {
                const selected = favoritePlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleFavoritePlatform(platform)}
                    className={`min-h-10 border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${selected ? "border-brand-orange bg-brand-orange/10 text-white" : "border-white/15 text-gray-300 hover:border-white/35"}`}
                  >
                    {PLATFORMS_CONFIG[platform].shortName}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Foto de perfil (opcional)</label>
            <label className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-brand-orange-muted/20 bg-background-void px-4 text-sm font-semibold text-gray-200 hover:border-brand-orange/50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-orange">
              <span>{avatarFile ? avatarFile.name : "Escolher uma foto"}</span>
              <span className="text-xs text-brand-orange">Até 4 MB</span>
              <input aria-label="Escolher foto de perfil" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setAvatarFile(file);
                if (file) setAvatarUrl(URL.createObjectURL(file));
              }} />
            </label>
            <p className="mt-1 text-xs text-gray-500">Se não escolher outra imagem, usaremos sua foto do Google.</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-[0_0_15px_rgba(255,94,0,0.3)] transition-all cursor-pointer disabled:opacity-50 text-sm uppercase tracking-wider"
          >
            {saving ? "Salvando..." : "Salvar perfil e continuar"}
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center mt-4">
          Ao criar um perfil, você concorda com nossos{" "}
          <Link href="/termos" className="text-brand-orange hover:text-white transition-colors">
            Termos de Uso
          </Link>.
        </p>
      </div>
    </main>
  );
}

export default function ProfileSetup() {
  return (
    <Suspense fallback={<ProfileSetupLoading />}>
      <ProfileSetupContent />
    </Suspense>
  );
}
