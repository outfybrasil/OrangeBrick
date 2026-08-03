"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { createDataClient } from "@/lib/supabase/client";
import { getGoogleAvatarUrl, resolveAvatarUrl } from "@/lib/avatar";

export default function ProfileSetup() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createDataClient();

  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
      return;
    }
    if (profile) {
      router.push("/");
      return;
    }
    if (user) {
      const googlePic = getGoogleAvatarUrl(user) || "";
      if (googlePic && !avatarUrl) {
        queueMicrotask(() => setAvatarUrl(googlePic));
      }
    }
  }, [user, profile, isLoading, router, avatarUrl]);

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
      if (avatarFile) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
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

      const { data: usernameIsAvailable, error: availabilityError } = await supabase.rpc("username_available", {
        candidate_username: normalizedUsername,
      });
      if (availabilityError) throw availabilityError;
      if (!usernameIsAvailable) {
        setError("Este nome de usuário já está em uso.");
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: user!.id,
        nickname: trimmed,
        display_name: trimmed,
        username: normalizedUsername,
        avatar_url: durableAvatarUrl,
      });
      if (insertError) throw insertError;
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-void">
        <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background-void px-3 py-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-orange-muted/20 bg-card-slate/40 p-5 shadow-2xl sm:p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center text-2xl mx-auto mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null, nickname || user.email); }} />
            ) : (
              <span>{user.email?.[0].toUpperCase() || "?"}</span>
            )}
          </div>
          <h1 className="text-xl font-heading font-black uppercase tracking-wider">
            Bem-vindo ao <span className="text-brand-orange">Orange Brick</span>
          </h1>
          <p className="text-xs text-gray-400 font-body mt-1">
            Escolha como você será conhecido dentro da comunidade.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
              Apelido *
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Seu apelido (2-30 caracteres)"
              maxLength={30}
              className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-xl px-4 py-3 outline-none focus:border-brand-orange/50 transition-colors text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
              Usuário *
            </label>
            <div className="flex min-h-11 items-center rounded-xl border border-brand-orange-muted/20 bg-background-void px-4 focus-within:border-brand-orange/50">
              <span className="text-sm text-gray-500">@</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="seu-usuario"
                maxLength={30}
                className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none"
              />
            </div>
            <p className="mt-1 text-[10px] text-gray-500">Este será o endereço permanente do seu perfil.</p>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Foto de perfil (opcional)</label>
            <label className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-brand-orange-muted/20 bg-background-void px-4 text-sm font-semibold text-gray-200 hover:border-brand-orange/50">
              <span>{avatarFile ? avatarFile.name : "Escolher uma foto"}</span>
              <span className="text-xs text-brand-orange">Até 8 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setAvatarFile(file);
                if (file) setAvatarUrl(URL.createObjectURL(file));
              }} />
            </label>
            <p className="mt-1 text-[9px] text-gray-500">Se não escolher outra imagem, usaremos sua foto do Google.</p>
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
            {saving ? "Salvando..." : "Criar Perfil"}
          </button>
        </form>

        <p className="text-[9px] text-gray-600 text-center mt-4">
          Ao criar um perfil, você concorda com nossos{" "}
          <Link href="/termos" className="text-brand-orange hover:text-white transition-colors">
            Termos de Uso
          </Link>.
        </p>
      </div>
    </div>
  );
}
