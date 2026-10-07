"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getGoogleAvatarUrl, isAllowedUserAvatarUrl, resolveAvatarUrl } from "@/lib/avatar";
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
    let imgToDraw: HTMLImageElement = imgRef.current;
    let createdBlobUrl: string | null = null;

    try {
      if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
        const res = await fetch(imageSrc, { mode: "cors" });
        const blob = await res.blob();
        createdBlobUrl = URL.createObjectURL(blob);
        const loadedImg = new Image();
        await new Promise((resolve, reject) => {
          loadedImg.onload = resolve;
          loadedImg.onerror = reject;
          loadedImg.src = createdBlobUrl!;
        });
        imgToDraw = loadedImg;
      }
    } catch {
      // If fetch fails or CORS issue occurs, fallback to loaded imgRef.current
    }

    const realImgWidth = imgToDraw.naturalWidth || imgRef.current.naturalWidth;
    const realImgHeight = imgToDraw.naturalHeight || imgRef.current.naturalHeight;

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
      imgToDraw,
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
        if (createdBlobUrl) {
          URL.revokeObjectURL(createdBlobUrl);
        }
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
          <button type="button" onClick={onCancel} disabled={isUploading} aria-label="Fechar personalização do banner" className="flex min-h-9 min-w-9 items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth="2" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
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
            <img loading="lazy" decoding="async"
              ref={imgRef}
              src={imageSrc}
              crossOrigin="anonymous"
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
                <span className="rounded bg-brand-orange px-2 py-0.5 text-xs font-black uppercase tracking-wide text-white shadow-sm">
                  Todos os dispositivos
                </span>
                <span className="rounded bg-black/80 px-2 py-0.5 text-xs font-bold text-gray-300 backdrop-blur-sm shadow-sm">
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
              <button type="button" onClick={() => { setBoxY(0); setBoxX(0); }} className="rounded bg-white/10 px-2.5 py-1 text-xs hover:bg-brand-orange hover:text-white">Topo</button>
              <button type="button" onClick={() => { setBoxY(30); setBoxX(5); }} className="rounded bg-white/10 px-2.5 py-1 text-xs hover:bg-brand-orange hover:text-white">Centro</button>
              <button type="button" onClick={() => { setBoxY(65); setBoxX(0); }} className="rounded bg-white/10 px-2.5 py-1 text-xs hover:bg-brand-orange hover:text-white">Base</button>
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
  const { user, profile, isLoading, refreshProfile, signInWithGoogle } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
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
    if (!user) return;
    const activeProfile = profile;
    const defaultName = activeProfile?.display_name || activeProfile?.nickname || user.user_metadata?.full_name || user.email?.split("@")[0] || "Jogador";
    const defaultUsername = activeProfile?.username || (user.user_metadata?.user_name || user.email?.split("@")[0] || "jogador").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18);
    const storedAvatarUrl = activeProfile?.avatar_url || "";
    const defaultAvatar = isAllowedUserAvatarUrl(storedAvatarUrl, user.id)
      ? storedAvatarUrl
      : getGoogleAvatarUrl(user) || "";

    queueMicrotask(() => {
      setDisplayName(defaultName);
      setUsername(defaultUsername);
      setUsernameStatus("available");
      setBio(activeProfile?.bio || "");
      setAvatarUrl(defaultAvatar);
      setBannerUrl(activeProfile?.banner_url || "");
      setFavoritePlatforms(activeProfile?.favorite_platforms || []);
      setFavoriteCategories(activeProfile?.favorite_categories || []);
      setShowLifetimeXp(activeProfile?.show_lifetime_xp ?? true);
      setShowActivityStats(activeProfile?.show_activity_stats ?? true);
      setShowSeasonHistory(activeProfile?.show_season_history ?? true);
      setShowInLeaderboard(activeProfile?.show_in_leaderboard ?? true);
    });
  }, [profile, user]);

  useEffect(() => {
    if (!profile || profile.is_official) return;
    let isActive = true;
    const currentProfile = profile;

    async function loadRewards() {
      try {
        const { data } = await supabase.rpc("current_user_progress", {});
        if (!isActive || !data) return;
        const progressData = data as PrivateProgressData;
        setRewards(progressData.rewards || []);
        setSelectedTitle(progressData.rewards?.find((reward) => reward.type === "title" && reward.name === currentProfile.equipped_title)?.slug || "");
        setSelectedFrame(currentProfile.equipped_frame || "");
        setSelectedTheme(currentProfile.profile_theme || "default");
      } catch {
      }
    }

    void loadRewards();
    return () => {
      isActive = false;
    };
  }, [profile, supabase]);

  useEffect(() => {
    if (!user) return;
    const currentUsername = (profile?.username || "").toLowerCase();
    const candidate = username.trim().toLowerCase();

    if (candidate === currentUsername && candidate.length > 0) {
      queueMicrotask(() => setUsernameStatus("available"));
      return;
    }

    const isValid = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(candidate);
    if (!isValid) {
      queueMicrotask(() => setUsernameStatus(candidate.length === 0 ? "idle" : "unavailable"));
      return;
    }

    queueMicrotask(() => setUsernameStatus("checking"));
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
  }, [profile?.username, supabase, user, username]);

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
    if (!user) return;
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

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: normalizedUsername,
          bio: bio.trim() || null,
          avatarUrl: avatarUrl.trim() || getGoogleAvatarUrl(user) || null,
          favoritePlatforms,
          favoriteCategories,
          showLifetimeXp,
          showActivityStats,
          showSeasonHistory,
          showInLeaderboard,
        }),
      });

      const result = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok || result.error) {
        setMessage(result.error || "Não foi possível salvar o perfil.");
      } else {
        let cosmeticsSaved = true;
        if (profile && !profile.is_official) {
          try {
            const { error: cosmeticsError } = await supabase.rpc("set_profile_cosmetics", {
              target_title_slug: selectedTitle || null,
              target_frame_slug: selectedFrame || null,
              target_theme_slug: selectedTheme,
            });
            cosmeticsSaved = !cosmeticsError;
          } catch {
            cosmeticsSaved = false;
          }
        }
        await refreshProfile();
        setMessage(cosmeticsSaved
          ? "Perfil atualizado com sucesso!"
          : "Perfil salvo, mas não foi possível equipar os itens selecionados.");
      }
    } catch {
      setMessage("Erro de conexão ao salvar o perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main id="conteudo-principal" tabIndex={-1} className="min-h-dvh bg-background-void text-white">
        <header className="border-b border-white/10">
          <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <span className="h-4 w-20 animate-pulse rounded bg-white/10" />
            <span className="font-heading text-sm font-black">Configurações</span>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="h-8 w-36 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
              <div className="h-24 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="aspect-[16/5] w-full animate-pulse rounded-xl bg-white/5" />
            </aside>
            <div className="space-y-8">
              <div className="h-40 animate-pulse rounded-xl bg-white/5" />
              <div className="h-32 animate-pulse rounded-xl bg-white/5" />
              <div className="h-40 animate-pulse rounded-xl bg-white/5" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main id="conteudo-principal" tabIndex={-1} className="min-h-dvh bg-background-void text-white">
        <header className="border-b border-white/10">
          <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">← Início</Link>
            <span className="font-heading text-sm font-black">Configurações</span>
          </div>
        </header>

        <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-20 text-center sm:py-28">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-orange/30 bg-brand-orange/10 text-brand-orange shadow-lg shadow-brand-orange/5">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-orange">
            Acesso Restrito
          </span>
          <h1 className="mt-4 font-heading text-2xl font-black text-white sm:text-3xl">Configurações de Perfil</h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Você precisa estar conectado à sua conta do Orange Brick para personalizar seu perfil, vitrine e preferências.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle("/configuracoes/perfil")}
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-white px-8 text-sm font-bold text-black transition-all hover:bg-brand-orange hover:text-white active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Entrar com o Google
          </button>
        </div>
      </main>
    );
  }

  const isOfficial = profile?.is_official ?? false;
  const currentUsername = profile?.username || username || "jogador";

  return (
    <main id="conteudo-principal" tabIndex={-1} className="min-h-dvh bg-background-void text-white">
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
          <Link href={currentUsername ? `/profile/${currentUsername}` : "/meu-brick"} className="flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">← Meu Brick</Link>
          <span className="font-heading text-sm font-black">Configurações</span>
        </div>
      </header>

      <form onSubmit={saveProfile} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside>
            <h1 className="font-heading text-3xl font-black">Seu perfil</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">Controle sua identidade, sua vitrine e o que aparece publicamente.</p>
            <img loading="lazy" decoding="async"
              src={resolveAvatarUrl(avatarUrl || getGoogleAvatarUrl(user), displayName, isOfficial)}
              alt="Prévia do avatar"
              className="mt-7 h-24 w-24 rounded-full border-2 border-brand-orange/40 object-cover"
              referrerPolicy="no-referrer"
              onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null, displayName, isOfficial); }}
            />
            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-card-slate">
              {bannerUrl ? (
                <img loading="lazy" decoding="async" src={bannerUrl} alt="Prévia do banner" className="aspect-[16/5] w-full object-cover" />
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
                        nextUsername === (profile?.username || "").toLowerCase()
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
              <Field label="Foto de perfil" hint="JPG, PNG, WebP ou AVIF. Até 4 MB.">
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
                  {bannerUrl && <img loading="lazy" decoding="async" src={bannerUrl} alt="Banner atual" className="aspect-[16/5] w-full object-cover" />}
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
              {isOfficial ? (
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
