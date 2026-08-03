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

function getCroppedBannerBlob(
  imageSrc: string,
  posX: number,
  posY: number,
  zoom: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const targetWidth = 1600;
      const targetHeight = 500;
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas failure"));

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = targetWidth / targetHeight;

      let drawWidth = img.naturalWidth;
      let drawHeight = img.naturalHeight;

      if (imgAspect > targetAspect) {
        drawWidth = img.naturalHeight * targetAspect;
      } else {
        drawHeight = img.naturalWidth / targetAspect;
      }

      const effectiveZoom = Math.max(1, zoom);
      drawWidth /= effectiveZoom;
      drawHeight /= effectiveZoom;

      const maxOffsetX = img.naturalWidth - drawWidth;
      const maxOffsetY = img.naturalHeight - drawHeight;

      const sourceX = (maxOffsetX * posX) / 100;
      const sourceY = (maxOffsetY * posY) / 100;

      ctx.drawImage(
        img,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        drawWidth,
        drawHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Blob creation failed"));
          const file = new File([blob], "banner.webp", { type: "image/webp" });
          resolve(file);
        },
        "image/webp",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
}

interface BannerCropperModalProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
  isUploading: boolean;
}

function BannerCropperModal({ imageSrc, onCancel, onConfirm, isUploading }: BannerCropperModalProps) {
  const [posY, setPosY] = useState(50);
  const [posX, setPosX] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, startX: posX, startY: posY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart.current) return;
    const deltaX = (e.clientX - dragStart.current.x) * 0.35;
    const deltaY = (e.clientY - dragStart.current.y) * 0.35;
    setPosX(Math.max(0, Math.min(100, dragStart.current.startX - deltaX)));
    setPosY(Math.max(0, Math.min(100, dragStart.current.startY - deltaY)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  const handleApply = async () => {
    try {
      const croppedFile = await getCroppedBannerBlob(imageSrc, posX, posY, zoom);
      onConfirm(croppedFile);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/20 bg-[#16181E] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-black text-white">Ajustar Enquadramento do Banner</h2>
            <p className="text-xs text-gray-400">Arraste com o mouse na prévia ou use os seletores para escolher a posição exata.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={isUploading} className="text-gray-400 hover:text-white p-2 text-lg">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Interactive Live Preview Box */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative aspect-[16/5] w-full cursor-grab overflow-hidden rounded-xl border-2 border-brand-orange bg-black active:cursor-grabbing select-none"
          >
            <img
              src={imageSrc}
              alt="Prévia do recorte do banner"
              draggable={false}
              className="h-full w-full object-cover pointer-events-none"
              style={{
                objectPosition: `${posX}% ${posY}%`,
                transform: `scale(${zoom})`,
              }}
            />
            <div className="absolute inset-0 border border-white/10 pointer-events-none" />
            <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2.5 py-1 text-[10px] font-bold text-gray-300 backdrop-blur-sm pointer-events-none">
              Proporção do perfil (1600 × 500)
            </div>
          </div>

          {/* Controls */}
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
              <label className="mb-2 flex items-center justify-between text-xs font-bold text-gray-200">
                <span>Posição Vertical (Y)</span>
                <span className="text-brand-orange font-mono">{Math.round(posY)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={posY}
                onChange={(e) => setPosY(Number(e.target.value))}
                className="w-full accent-brand-orange cursor-pointer"
              />
              <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                <button type="button" onClick={() => setPosY(0)} className="hover:text-brand-orange">Topo</button>
                <button type="button" onClick={() => setPosY(50)} className="hover:text-brand-orange">Centro</button>
                <button type="button" onClick={() => setPosY(100)} className="hover:text-brand-orange">Base</button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
              <label className="mb-2 flex items-center justify-between text-xs font-bold text-gray-200">
                <span>Posição Horizontal (X)</span>
                <span className="text-brand-orange font-mono">{Math.round(posX)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={posX}
                onChange={(e) => setPosX(Number(e.target.value))}
                className="w-full accent-brand-orange cursor-pointer"
              />
              <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                <button type="button" onClick={() => setPosX(0)} className="hover:text-brand-orange">Esquerda</button>
                <button type="button" onClick={() => setPosX(50)} className="hover:text-brand-orange">Centro</button>
                <button type="button" onClick={() => setPosX(100)} className="hover:text-brand-orange">Direita</button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
              <label className="mb-2 flex items-center justify-between text-xs font-bold text-gray-200">
                <span>Zoom</span>
                <span className="text-brand-orange font-mono">{zoom.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min={1}
                max={2.2}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-brand-orange cursor-pointer"
              />
              <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                <button type="button" onClick={() => setZoom(1)} className="hover:text-brand-orange">1.0x</button>
                <button type="button" onClick={() => setZoom(1.4)} className="hover:text-brand-orange">1.4x</button>
                <button type="button" onClick={() => setZoom(1.8)} className="hover:text-brand-orange">1.8x</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4 bg-[#111318]">
          <button type="button" onClick={onCancel} disabled={isUploading} className="min-h-11 px-4 text-xs font-bold text-gray-300 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isUploading}
            className="min-h-11 rounded-lg bg-brand-orange px-6 text-xs font-bold text-white hover:bg-[#ff7526] transition-colors disabled:opacity-50"
          >
            {isUploading ? "Processando e enviando..." : "Aplicar e Salvar Banner"}
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
        setMessage("O perfil foi salvo, mas a personalização não pôde ser aplicada.");
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
              src={resolveAvatarUrl(avatarUrl, displayName)}
              alt="Prévia do avatar"
              className="mt-7 h-24 w-24 rounded-full border-2 border-brand-orange/40 object-cover"
              referrerPolicy="no-referrer"
              onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null, displayName); }}
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
              <Field label="Banner do perfil" hint="Escolha uma imagem e ajuste a posição ideal. JPG, PNG, WebP ou AVIF (até 8 MB).">
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
