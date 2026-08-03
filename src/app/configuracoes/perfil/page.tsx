"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getGoogleAvatarUrl, resolveAvatarUrl } from "@/lib/avatar";
import type { PrivateProgressData } from "@/lib/types/progression";

const platforms = ["PS5", "Xbox Series", "Switch 2", "PC", "Mobile"];
const categories = ["breaking", "hardware", "industry", "modding", "review", "opinion"];
type UsernameStatus = "idle" | "checking" | "available" | "unavailable" | "error";

interface BannerCropperModalProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
  isUploading: boolean;
}

function BannerCropperModal({ imageSrc, onCancel, onConfirm, isUploading }: BannerCropperModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [boxY, setBoxY] = useState(30);
  const [boxX, setBoxX] = useState(5);
  const [boxHeightPct, setBoxHeightPct] = useState(35);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startX: number; startBoxY: number; startBoxX: number } | null>(null);

  const aspect = 16 / 5; // 3.2

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startY: e.clientY,
      startX: e.clientX,
      startBoxY: boxY,
      startBoxX: boxX,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaYPct = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const deltaXPct = ((e.clientX - dragRef.current.startX) / rect.width) * 100;

    const maxBoxY = Math.max(0, 100 - boxHeightPct);
    const boxWidthPct = Math.min(100, (boxHeightPct * aspect * rect.height) / rect.width);
    const maxBoxX = Math.max(0, 100 - boxWidthPct);

    setBoxY(Math.max(0, Math.min(maxBoxY, dragRef.current.startBoxY + deltaYPct)));
    setBoxX(Math.max(0, Math.min(maxBoxX, dragRef.current.startBoxX + deltaXPct)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    const realImgWidth = img.naturalWidth;
    const realImgHeight = img.naturalHeight;

    const cropYPx = (boxY / 100) * realImgHeight;
    const cropXPx = (boxX / 100) * realImgWidth;
    const cropHPx = (boxHeightPct / 100) * realImgHeight;
    const cropWPx = cropHPx * aspect;

    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      Math.max(0, cropXPx),
      Math.max(0, cropYPx),
      Math.min(realImgWidth - cropXPx, cropWPx),
      Math.min(realImgHeight - cropYPx, cropHPx),
      0,
      0,
      1600,
      500
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "banner.webp", { type: "image/webp" });
          onConfirm(file);
        }
      },
      "image/webp",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-md">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-[#16181E] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="font-heading text-xl font-black text-white">Personalizar arte do banner</h2>
          <button type="button" onClick={onCancel} disabled={isUploading} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">✕</button>
        </div>

        {/* Info Banner */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-6 py-3 text-xs text-gray-300">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-brand-orange font-bold text-xs">i</span>
          <span>Para garantir os melhores resultados, arraste a área de seleção sobre a imagem para definir o que vai aparecer no seu banner.</span>
        </div>

        {/* Main Crop Area */}
        <div className="p-6 space-y-4">
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative flex items-center justify-center overflow-hidden rounded-xl bg-[#0a0b0e] select-none min-h-[300px] max-h-[440px]"
          >
            {/* Full Image */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Imagem completa do banner"
              draggable={false}
              className="max-h-[440px] w-auto max-w-full object-contain pointer-events-none"
            />

            {/* Darkened Overlay outside Crop Box */}
            <div className="absolute inset-0 bg-black/60 pointer-events-none" />

            {/* Highlighted Crop Frame Box */}
            <div
              onMouseDown={handleMouseDown}
              style={{
                top: `${boxY}%`,
                left: `${boxX}%`,
                height: `${boxHeightPct}%`,
                aspectRatio: `${aspect}`,
              }}
              className="absolute cursor-move border-2 border-brand-orange bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
            >
              {/* Labels inside Crop Box */}
              <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 pointer-events-none">
                <span className="rounded bg-brand-orange px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                  Todos os dispositivos
                </span>
                <span className="rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-gray-300 backdrop-blur-sm shadow-sm">
                  1600 × 500
                </span>
              </div>

              {/* Corner Handles */}
              <span className="absolute -top-1.5 -left-1.5 h-3 w-3 border border-black bg-white" />
              <span className="absolute -top-1.5 -right-1.5 h-3 w-3 border border-black bg-white" />
              <span className="absolute -bottom-1.5 -left-1.5 h-3 w-3 border border-black bg-white" />
              <span className="absolute -bottom-1.5 -right-1.5 h-3 w-3 border border-black bg-white" />
            </div>
          </div>

          {/* Quick Adjust Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Tamanho da seleção:</span>
              <input
                type="range"
                min={15}
                max={80}
                value={boxHeightPct}
                onChange={(e) => setBoxHeightPct(Number(e.target.value))}
                className="accent-brand-orange cursor-pointer w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-subtitle">Posição rápida:</span>
              <button type="button" onClick={() => { setBoxY(0); setBoxX(0); }} className="rounded bg-white/10 px-2.5 py-1 text-[11px] hover:bg-brand-orange hover:text-white">Topo</button>
              <button type="button" onClick={() => { setBoxY(30); setBoxX(5); }} className="rounded bg-white/10 px-2.5 py-1 text-[11px] hover:bg-brand-orange hover:text-white">Centro</button>
              <button type="button" onClick={() => { setBoxY(65); setBoxX(0); }} className="rounded bg-white/10 px-2.5 py-1 text-[11px] hover:bg-brand-orange hover:text-white">Base</button>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4 bg-[#111318]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="min-h-11 rounded-full border border-white/20 bg-white/5 px-6 text-xs font-bold text-white transition-colors hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isUploading}
            className="min-h-11 rounded-full bg-white px-8 text-xs font-bold text-black transition-colors hover:bg-brand-orange hover:text-white disabled:opacity-50"
          >
            {isUploading ? "Salvando banner..." : "Pronto"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [favoritePlatforms, setFavoritePlatforms] = useState<string[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const [showLifetimeXp, setShowLifetimeXp] = useState(true);
  const [showActivityStats, setShowActivityStats] = useState(true);
  const [showSeasonHistory, setShowSeasonHistory] = useState(true);
  const [showInLeaderboard, setShowInLeaderboard] = useState(true);
  const [rewards, setRewards] = useState<PrivateProgressData["rewards"]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedFrame, setSelectedFrame] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
    if (!profile) return;
    queueMicrotask(() => {
      setDisplayName(profile.display_name || profile.nickname);
      setUsername(profile.username || "");
      setUsernameStatus("available");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setBannerUrl(profile.banner_url || "");
      setFavoritePlatforms(profile.favorite_platforms || []);
      setFavoriteCategories(profile.favorite_categories || []);
      setShowLifetimeXp(profile.show_lifetime_xp);
      setShowActivityStats(profile.show_activity_stats);
      setShowSeasonHistory(profile.show_season_history);
      setShowInLeaderboard(profile.show_in_leaderboard);
    });
  }, [isLoading, profile, router, user]);

  useEffect(() => {
    if (!profile || profile.is_official) return;
    let isActive = true;
    const currentProfile = profile;

    async function loadRewards() {
      const { data } = await supabase.rpc("current_user_progress", {});
      if (!isActive || !data) return;
      const progressData = data as PrivateProgressData;
      setRewards(progressData.rewards);
      setSelectedTitle(progressData.rewards.find((reward) => reward.type === "title" && reward.name === currentProfile.equipped_title)?.slug || "");
      setSelectedFrame(currentProfile.equipped_frame || "");
      setSelectedTheme(currentProfile.profile_theme || "default");
    }

    void loadRewards();
    return () => {
      isActive = false;
    };
  }, [profile, supabase]);

  useEffect(() => {
    if (!profile) return;
    const candidate = username.trim().toLowerCase();
    const isValid = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(candidate);

    if (candidate === profile.username.toLowerCase()) {
      return;
    }
    if (!isValid) {
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      const { data, error: availabilityError } = await supabase.rpc("username_available", {
        candidate_username: candidate,
      });
      if (!isActive) return;
      if (availabilityError) {
        setUsernameStatus("error");
        return;
      }
      setUsernameStatus(data ? "available" : "unavailable");
    }, 450);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [profile, supabase, username]);

  async function uploadBanner(file: File) {
    if (!user) return;
    setIsBannerUploading(true);
    setMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage("Sua sessão expirou. Entre novamente para continuar.");
      setIsBannerUploading(false);
      return;
    }
    const formData = new FormData();
    formData.set("banner", file);
    const response = await fetch("/api/user/banner", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });
    const result = await response.json() as { publicUrl?: string; error?: string };
    if (!response.ok || !result.publicUrl) {
      setMessage(result.error || "Não foi possível salvar o banner.");
    } else {
      setBannerUrl(result.publicUrl);
      setBannerCropSrc(null);
      await refreshProfile();
      setMessage("Banner atualizado com sucesso!");
    }
    setIsBannerUploading(false);
  }

  async function uploadAvatar(file: File) {
    setIsAvatarUploading(true);
    setMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage("Sua sessão expirou. Entre novamente para continuar.");
      setIsAvatarUploading(false);
      return;
    }
    const formData = new FormData();
    formData.set("avatar", file);
    const response = await fetch("/api/user/avatar", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData });
    const result = await response.json() as { publicUrl?: string; error?: string };
    if (!response.ok || !result.publicUrl) setMessage(result.error || "Não foi possível salvar a foto.");
    else {
      setAvatarUrl(result.publicUrl);
      await refreshProfile();
      setMessage("Foto de perfil atualizada.");
    }
    setIsAvatarUploading(false);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;
    setIsSaving(true);
    setMessage(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(normalizedUsername)) {
      setMessage("O usuário deve ter de 3 a 30 caracteres, usando letras, números ou hífen.");
      setIsSaving(false);
      return;
    }
    if (usernameStatus !== "available") {
      setMessage(usernameStatus === "unavailable" ? "Escolha outro nome de usuário antes de salvar." : "Aguarde a confirmação do nome de usuário.");
      setIsSaving(false);
      return;
    }

    const durableAvatarUrl = avatarUrl.trim() || getGoogleAvatarUrl(user) || null;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        username: normalizedUsername,
        bio: bio.trim() || null,
        avatar_url: durableAvatarUrl,
        favorite_platforms: favoritePlatforms,
        favorite_categories: favoriteCategories,
        show_lifetime_xp: showLifetimeXp,
        show_activity_stats: showActivityStats,
        show_season_history: showSeasonHistory,
        show_in_leaderboard: showInLeaderboard,
      })
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message.includes("duplicate") ? "Este nome de usuário já está em uso." : "Não foi possível salvar o perfil.");
    } else {
      const cosmeticsError = profile.is_official
        ? null
        : (await supabase.rpc("set_profile_cosmetics", {
            target_title_slug: selectedTitle || null,
            target_frame_slug: selectedFrame || null,
            target_theme_slug: selectedTheme,
          })).error;

      if (cosmeticsError) {
        setMessage("O perfil foi salvo, mas a personalização não pôde ser applied.");
      } else {
        await refreshProfile();
        setMessage("Perfil atualizado.");
      }
    }
    setIsSaving(false);
  }

  if (isLoading || !profile) {
    return <div className="min-h-dvh bg-background-void" />;
  }

  return (
    <main className="min-h-dvh bg-background-void text-white">
      {/* Banner Cropper Modal */}
      {bannerCropSrc && (
        <BannerCropperModal
          imageSrc={bannerCropSrc}
          onCancel={() => setBannerCropSrc(null)}
          onConfirm={(file) => void uploadBanner(file)}
          isUploading={isBannerUploading}
        />
      )}

      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href={`/profile/${profile.username}`} className="flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">← Meu perfil</Link>
          <span className="font-heading text-sm font-black">Configurações</span>
        </div>
      </header>

      <form onSubmit={saveProfile} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside>
            <h1 className="font-heading text-3xl font-black">Seu perfil</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">Controle sua identidade, sua vitrine e o que aparece publicamente.</p>
            <img
              src={resolveAvatarUrl(avatarUrl, displayName, profile.is_official)}
              alt="Prévia do avatar"
              className="mt-7 h-24 w-24 rounded-full border-2 border-brand-orange/40 object-cover"
              referrerPolicy="no-referrer"
              onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null, displayName, profile.is_official); }}
            />
            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-card-slate">
              {bannerUrl ? (
                <img src={bannerUrl} alt="Prévia do banner" className="aspect-[16/5] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/5] items-center justify-center text-xs text-gray-500">Sem banner</div>
              )}
            </div>
          </aside>

          <div className="space-y-12">
            <SettingsSection title="Identidade">
              <Field label="Nome exibido">
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} required className="min-h-12 w-full border border-white/15 bg-black/20 px-4 text-sm outline-none focus:border-brand-orange/60" />
              </Field>
              <Field label="Usuário" hint="O endereço público do seu perfil.">
                <div className={`flex min-h-12 items-center border bg-black/20 px-4 focus-within:border-brand-orange/60 ${usernameStatus === "unavailable" || usernameStatus === "error" ? "border-red-400/60" : usernameStatus === "available" ? "border-emerald-400/40" : "border-white/15"}`}>
                  <span className="text-gray-500">@</span>
                  <input
                    value={username}
                    onChange={(event) => {
                      const nextUsername = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setUsername(nextUsername);
                      setUsernameStatus(
                        nextUsername === profile.username.toLowerCase()
                          ? "available"
                          : /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(nextUsername)
                            ? "checking"
                            : "idle",
                      );
                    }}
                    maxLength={30}
                    required
                    aria-describedby="username-status"
                    aria-invalid={usernameStatus === "unavailable" || usernameStatus === "error"}
                    className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none"
                  />
                </div>
                <p id="username-status" aria-live="polite" className={`mt-2 min-h-5 text-xs ${usernameStatus === "available" ? "text-emerald-300" : usernameStatus === "unavailable" || usernameStatus === "error" ? "text-red-300" : "text-gray-500"}`}>
                  {usernameStatus === "checking" && "Verificando disponibilidade…"}
                  {usernameStatus === "available" && "Nome de usuário disponível."}
                  {usernameStatus === "unavailable" && "Esse nome já está em uso ou é reservado."}
                  {usernameStatus === "error" && "Não foi possível verificar agora. Tente novamente."}
                  {usernameStatus === "idle" && "Use de 3 a 30 caracteres: letras, números ou hífen."}
                </p>
              </Field>
              <Field label="Biografia" hint={`${bio.length}/160 caracteres`}>
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={4} className="w-full resize-none border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none focus:border-brand-orange/60" />
              </Field>
              <Field label="Foto de perfil" hint="JPG, PNG, WebP ou AVIF. Até 8 MB.">
                <div className="flex flex-wrap items-center gap-3 border border-white/15 bg-black/20 p-3">
                  <label className="inline-flex min-h-11 cursor-pointer items-center bg-brand-orange px-4 text-xs font-bold text-white hover:bg-[#ff7526]">
                    {isAvatarUploading ? "Processando…" : "Escolher foto"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={isAvatarUploading} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ""; }} />
                  </label>
                  <button type="button" onClick={() => setAvatarUrl(getGoogleAvatarUrl(user) || "")} className="min-h-11 px-3 text-xs font-bold text-gray-300 hover:text-white">Usar foto do Google</button>
                </div>
              </Field>
              <Field label="Banner do perfil" hint="Escolha uma imagem e ajuste a seleção desejada.">
                <div className="overflow-hidden border border-white/15 bg-black/20 rounded-xl">
                  {bannerUrl && <img src={bannerUrl} alt="Banner atual" className="aspect-[16/5] w-full object-cover" />}
                  <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm font-semibold text-gray-200">
                    <label className="flex cursor-pointer items-center gap-2 hover:text-brand-orange transition-colors">
                      <span>{isBannerUploading ? "Processando imagem…" : bannerUrl ? "Trocar banner" : "Escolher banner"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        disabled={isBannerUploading}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setBannerCropSrc(url);
                          }
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setBannerCropSrc(bannerUrl)}
                        className="text-xs font-bold text-brand-orange hover:underline"
                      >
                        Ajustar enquadramento do banner atual
                      </button>
                    )}
                  </div>
                </div>
              </Field>
            </SettingsSection>

            <SettingsSection title="Afinidades">
              <ChoiceGroup title="Plataformas" options={platforms} selected={favoritePlatforms} onChange={setFavoritePlatforms} />
              <ChoiceGroup title="Categorias" options={categories} selected={favoriteCategories} onChange={setFavoriteCategories} />
            </SettingsSection>

            <SettingsSection title="Vitrine" id="vitrine">
              {profile.is_official ? (
                <p className="border-y border-white/10 py-5 text-sm leading-6 text-gray-400">Perfis oficiais usam a identidade visual do Orange Brick.</p>
              ) : (
                <>
                  <CosmeticChoice
                    title="Título"
                    description="Escolha o título exibido no topo do seu perfil."
                    options={rewards.filter((reward) => reward.type === "title")}
                    value={selectedTitle}
                    onChange={setSelectedTitle}
                    emptyLabel="Sem título"
                  />
                  <CosmeticChoice
                    title="Moldura do avatar"
                    description="Personalize o contorno do seu avatar no perfil."
                    options={rewards.filter((reward) => reward.type === "frame")}
                    value={selectedFrame}
                    onChange={setSelectedFrame}
                    emptyLabel="Padrão"
                  />
                  <fieldset>
                    <legend className="text-xs font-bold text-gray-200">Tema visual</legend>
                    <p className="mt-1 text-xs leading-5 text-gray-500">Mude a atmosfera da sua página pública de leitor.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { slug: "default", name: "Orange Standard" },
                        ...rewards.filter((reward) => reward.type === "theme"),
                      ].map((option) => {
                        const active = selectedTheme === option.slug;
                        return (
                          <button
                            key={option.slug}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelectedTheme(option.slug)}
                            className={`min-h-11 border px-4 text-xs font-semibold transition-colors ${active ? "border-brand-orange bg-brand-orange/10 text-white" : "border-white/15 text-gray-400 hover:border-white/30 hover:text-white"}`}
                          >
                            {option.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </>
              )}
            </SettingsSection>

            <SettingsSection title="Privacidade da conta">
              <PrivacyToggle
                label="Exibir XP total acumulado no perfil"
                description="Mostra o histórico global de XP mesmo após o fechamento da temporada."
                checked={showLifetimeXp}
                onChange={setShowLifetimeXp}
              />
              <PrivacyToggle
                label="Exibir contador de contribuições comunitárias"
                description="Mostra o total de bricks criados, comentários e reações recebidas."
                checked={showActivityStats}
                onChange={setShowActivityStats}
              />
              <PrivacyToggle
                label="Exibir histórico de temporadas passadas"
                description="Permite que leitores vejam seu nível final em edições anteriores do Brickboard."
                checked={showSeasonHistory}
                onChange={setShowSeasonHistory}
              />
              <PrivacyToggle
                label="Aparecer no ranking público da temporada"
                description="Seu usuário será listado no leaderboard geral do Brickboard."
                checked={showInLeaderboard}
                onChange={setShowInLeaderboard}
              />
            </SettingsSection>

            <div className="flex items-center justify-between border-t border-white/10 pt-6">
              {message && <p className="text-xs text-brand-orange">{message}</p>}
              <button
                type="submit"
                disabled={isSaving}
                className="ml-auto inline-flex min-h-11 items-center bg-brand-orange px-6 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#ff7526] disabled:opacity-50"
              >
                {isSaving ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}

function SettingsSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-6 border-b border-white/10 pb-10">
      <h2 className="font-heading text-lg font-black uppercase tracking-wider text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-4 text-xs font-bold text-gray-200">
        {label}
        {hint && <span className="font-normal text-gray-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ChoiceGroup({ title, options, selected, onChange }: { title: string; options: string[]; selected: string[]; onChange: (values: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-bold text-gray-200">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? selected.filter((value) => value !== option) : [...selected, option].slice(-4))}
              className={`min-h-11 border px-3 text-xs font-semibold ${active ? "border-brand-orange bg-brand-orange/10 text-white" : "border-white/15 text-gray-400 hover:text-white"}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function CosmeticChoice({
  title,
  description,
  options,
  value,
  onChange,
  emptyLabel,
  emptyValue = "",
}: {
  title: string;
  description: string;
  options: PrivateProgressData["rewards"];
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  emptyValue?: string;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-bold text-gray-200">{title}</legend>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[{ slug: emptyValue, name: emptyLabel, type: "" }, ...options].map((option) => {
          const active = value === option.slug;
          return (
            <button
              key={option.slug || "none"}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.slug)}
              className={`min-h-11 border px-4 text-xs font-semibold transition-colors ${active ? "border-brand-orange bg-brand-orange/10 text-white" : "border-white/15 text-gray-400 hover:border-white/30 hover:text-white"}`}
            >
              {option.name}
            </button>
          );
        })}
      </div>
      {!options.length && <p className="mt-3 text-xs text-gray-500">Nenhuma opção desbloqueada ainda.</p>}
    </fieldset>
  );
}

function PrivacyToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 border-b border-white/10 pb-5">
      <span>
        <strong className="block text-sm text-white">{label}</strong>
        <span className="mt-1 block max-w-xl text-xs leading-5 text-gray-400">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-[#ff5e00]" />
    </label>
  );
}
