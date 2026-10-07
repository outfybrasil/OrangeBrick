"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/ui/Footer";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { useSavedBricks } from "@/lib/hooks/useSavedBricks";
import { resolveAvatarUrl, getGoogleAvatarUrl } from "@/lib/avatar";
import { createDataClient } from "@/lib/supabase/client";
import { AuthModal } from "@/components/auth/AuthModal";
import type { CommunityPost } from "@/lib/types/community";
import type { ReleaseRadarItem } from "@/lib/types/database";

export default function MeuBrickPage() {
  const router = useRouter();
  const { user, profile, isLoading, signOut, refreshProfile } = useAuth();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { savedBricks, toggleSaveBrick } = useSavedBricks();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"bricks" | "jogos" | "salvos" | "settings">(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "salvos" || hash === "saved") return "salvos";
      if (hash === "jogos" || hash === "games") return "jogos";
      if (hash === "settings" || hash === "configuracoes") return "settings";
    }
    return "bricks";
  });
  const [savedFilter, setSavedFilter] = useState<"all" | "articles" | "bricks">("all");
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [votedReleases, setVotedReleases] = useState<ReleaseRadarItem[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > 4 * 1024 * 1024) {
      setAvatarFeedback({ type: "error", text: "A imagem deve ter no máximo 4 MB." });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setAvatarFeedback({ type: "error", text: "Formato inválido. Use JPG, PNG, WebP ou AVIF." });
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarFeedback(null);

    try {
      const supabase = createDataClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAvatarFeedback({ type: "error", text: "Sessão expirada. Entre novamente para continuar." });
        setIsUploadingAvatar(false);
        return;
      }

      const formData = new FormData();
      formData.set("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const data = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok || !data.publicUrl) {
        setAvatarFeedback({ type: "error", text: data.error || "Não foi possível salvar a foto." });
      } else {
        await refreshProfile();
        setAvatarFeedback({ type: "success", text: "Foto de perfil atualizada!" });
        setTimeout(() => setAvatarFeedback(null), 4000);
      }
    } catch {
      setAvatarFeedback({ type: "error", text: "Erro ao enviar a imagem. Tente novamente." });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSelectTab = useCallback((tab: "bricks" | "jogos" | "salvos" | "settings") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "salvos" || hash === "saved") {
        setActiveTab("salvos");
      } else if (hash === "jogos" || hash === "games") {
        setActiveTab("jogos");
      } else if (hash === "settings" || hash === "configuracoes") {
        setActiveTab("settings");
      } else if (hash === "bricks" || hash === "posts") {
        setActiveTab("bricks");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const currentUserId = user.id;
    const currentUsername = profile?.username;
    const supabase = createDataClient();
    let isMounted = true;

    async function loadUserData() {
      setLoadingPosts(true);
      try {
        const [postsRes, votesRes, followsFollowersRes, followsFollowingRes] = await Promise.all([
          supabase
            .from("community_posts")
            .select("id, user_id, author_name, author_username, author_avatar, content, media_url, media_alt, platform_tag, attached_article, created_at, is_pinned, is_official")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.rpc("get_my_release_hype_votes"),
          currentUsername
            ? supabase
                .from("user_follows")
                .select("*", { count: "exact", head: true })
                .eq("follow_type", "profile")
                .eq("follow_value", currentUsername)
            : Promise.resolve({ count: 0 }),
          supabase
            .from("user_follows")
            .select("*", { count: "exact", head: true })
            .eq("follow_type", "profile")
            .eq("user_id", currentUserId),
        ]);

        if (!isMounted) return;

        if (postsRes.data) {
          const mapped: CommunityPost[] = (postsRes.data as Array<Record<string, unknown>>).map((row) => ({
            id: String(row.id),
            user_id: String(row.user_id),
            author_name: String(row.author_name || "Jogador"),
            author_username: row.author_username ? String(row.author_username) : null,
            author_avatar: row.author_avatar ? String(row.author_avatar) : "",
            content: String(row.content || ""),
            media_url: row.media_url ? String(row.media_url) : null,
            media_alt: row.media_alt ? String(row.media_alt) : null,
            platform_tag: row.platform_tag ? String(row.platform_tag) : null,
            attached_article: (row.attached_article as CommunityPost["attached_article"]) || null,
            reactions: { hype: 0, flop: 0, salty: 0 },
            comments_count: 0,
            created_at: String(row.created_at),
            is_pinned: Boolean(row.is_pinned),
            is_official: Boolean(row.is_official),
          }));
          setUserPosts(mapped);
        }

        if (followsFollowersRes && "count" in followsFollowersRes) {
          setFollowersCount(followsFollowersRes.count || 0);
        }
        if (followsFollowingRes && "count" in followsFollowingRes) {
          setFollowingCount(followsFollowingRes.count || 0);
        }

        const voteRows = (votesRes.data || []) as Array<{ release_id: string; vote_type: string }>;
        const releaseIds = voteRows.map((v) => v.release_id);
        if (releaseIds.length > 0) {
          const { data: radarData } = await supabase
            .from("release_radar_items")
            .select("*")
            .in("id", releaseIds);
          if (radarData && isMounted) {
            setVotedReleases(radarData as ReleaseRadarItem[]);
          }
        }
      } catch {
      } finally {
        if (isMounted) setLoadingPosts(false);
      }
    }

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [user, profile?.username]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background-void text-white">
        <SiteHeader variant="strip" />
        <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="space-y-6 animate-pulse">
            <div className="h-44 rounded-2xl bg-white/[0.04] border border-white/10" />
            <div className="h-12 w-80 rounded-xl bg-white/[0.04]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-44 rounded-xl bg-white/[0.04]" />
              <div className="h-44 rounded-xl bg-white/[0.04]" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-background-void text-white">
        <SiteHeader variant="strip" />
        <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111619] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-brand-orange">
              <span>Meu Brick</span>
              <span className="text-gray-500">·</span>
              <span>Área do Jogador</span>
            </div>

            <h1 className="mt-4 text-balance font-heading text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Sua central gamer no <span className="text-brand-orange">Orange Brick</span>.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
              O Meu Brick é o seu espaço pessoal para gerenciar suas publicações no Brickboard, acompanhar os jogos que você está jogando, organizar matérias salvas e personalizar seu perfil público.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-brand-orange/30">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand-orange/20 text-brand-orange font-mono">01</span>
                  Perfil Gamer Personalizado
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  Mostre suas plataformas favoritas, seus jogos prediletos e o que está jogando atualmente no seu perfil público.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-brand-orange/30">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand-orange/20 text-brand-orange font-mono">02</span>
                  Histórico no Brickboard
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  Acesse, gerencie e acompanhe as reações e respostas de todos os seus Bricks e opiniões em um só lugar.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-brand-orange/30">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand-orange/20 text-brand-orange font-mono">03</span>
                  Itens & Matérias Salvas
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  Guarde matérias completas e discussões para ler depois com sincronização contínua.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-brand-orange/30">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand-orange/20 text-brand-orange font-mono">04</span>
                  Votos no Radar de Lançamentos
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  Vote nos jogos que você pretende comprar ou acompanhar de perto e veja a expectativa da comunidade.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex min-h-12 items-center justify-center rounded-xl bg-brand-orange px-6 text-sm font-black text-white shadow-[0_0_20px_rgba(255,94,0,0.3)] transition-colors hover:bg-[#ff7526]"
              >
                Entrar na minha conta
              </button>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.05] px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Criar conta gratuita
              </button>
              <Link
                href="/"
                className="flex min-h-12 items-center justify-center px-4 text-xs font-semibold text-gray-400 hover:text-white"
              >
                ← Voltar ao portal
              </Link>
            </div>
          </div>
        </main>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
        <Footer />
      </div>
    );
  }

  const googleAvatar = getGoogleAvatarUrl(user);
  const effectiveAvatar = profile?.avatar_url || googleAvatar;
  const authorName =
    profile?.display_name ||
    profile?.nickname ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Jogador";
  const avatarUrl = resolveAvatarUrl(effectiveAvatar, authorName, profile?.is_official);

  const displayNick = profile?.username
    ? `@${profile.username}`
    : profile?.nickname
      ? `@${profile.nickname.toLowerCase().replace(/\s+/g, "")}`
      : user.user_metadata?.user_name
        ? `@${user.user_metadata.user_name.toLowerCase().replace(/\s+/g, "")}`
        : user.user_metadata?.full_name
          ? `@${user.user_metadata.full_name.toLowerCase().replace(/\s+/g, "")}`
          : "@jogador";

  const totalSaved = bookmarks.length + savedBricks.length;
  const favoritePlatforms = profile?.favorite_platforms?.length
    ? profile.favorite_platforms
    : ["PC", "PlayStation", "Xbox"];
  const favoriteCategories = profile?.favorite_categories?.length
    ? profile.favorite_categories
    : ["RPG", "Exploração", "História"];

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <SiteHeader variant="strip" />
      <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111619] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div
            className="relative h-44 sm:h-56 w-full overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: profile?.banner_url
                ? `url(${profile.banner_url})`
                : "linear-gradient(135deg, #182026 0%, #111619 50%, #0b0e10 100%)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#111619] via-[#111619]/40 to-transparent" />
            <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-gray-300 backdrop-blur-md">
              Área do Jogador
            </div>
          </div>

          <div className="px-5 pb-6 pt-0 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-16">
              <div className="relative group/avatar size-24 sm:size-28 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  onChange={handleAvatarFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label="Alterar foto de perfil"
                  className="relative h-full w-full overflow-hidden rounded-2xl border-4 border-[#111619] bg-[#1a2126] shadow-2xl cursor-pointer block focus-visible:outline-2 focus-visible:outline-brand-orange text-left p-0"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={authorName}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center font-heading text-3xl font-black text-brand-orange">
                      {authorName[0].toUpperCase()}
                    </div>
                  )}

                  {isUploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1.5 p-2 text-center z-20">
                      <div className="size-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Salvando</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2 text-center z-10 backdrop-blur-[2px]">
                      <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Alterar</span>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label="Alterar foto de perfil"
                  className="absolute -bottom-1 -right-1 z-20 size-8 rounded-xl bg-brand-orange text-black border-2 border-[#111619] shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-xs font-bold text-white transition-colors hover:border-brand-orange/40 hover:bg-white/[0.08]"
                >
                  Alterar foto
                </button>
                {profile?.username ? (
                  <Link
                    href={`/u/${encodeURIComponent(profile.username)}`}
                    className="flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-xs font-bold text-white transition-colors hover:border-brand-orange/40 hover:bg-white/[0.08]"
                  >
                    Ver Perfil Público ↗
                  </Link>
                ) : (
                  <Link
                    href="/profile/setup?next=/meu-brick"
                    className="flex min-h-10 items-center justify-center rounded-xl bg-brand-orange px-4 text-xs font-black text-white transition-colors hover:bg-[#ff7526]"
                  >
                    Configurar @username
                  </Link>
                )}
                <Link
                  href="/configuracoes/perfil"
                  className="flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-xs font-bold text-white transition-colors hover:border-brand-orange/40 hover:bg-white/[0.08]"
                >
                  Editar perfil
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      signOut().then(() => router.push("/"));
                    });
                  }}
                  className="flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-3 text-xs font-semibold text-gray-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                >
                  Sair
                </button>
              </div>
            </div>

            {avatarFeedback && (
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                  avatarFeedback.type === "success"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/15 border border-red-500/30 text-red-300"
                }`}
              >
                <span>{avatarFeedback.text}</span>
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-black text-white sm:text-3xl">
                  {authorName}
                </h1>
                {profile?.is_official && (
                  <span className="rounded bg-brand-orange/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-orange">
                    Oficial
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-brand-orange font-bold">
                {displayNick}
              </p>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">
              {profile?.bio || "Histórias boas, mundos abertos e mais uma missão."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span>
                <strong className="font-mono text-white">{followingCount}</strong> seguindo
              </span>
              <span>
                <strong className="font-mono text-white">{followersCount}</strong> seguidores
              </span>
              <span className="rounded-full border border-brand-orange/30 bg-brand-orange/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-brand-orange">
                PERFIL GAMER
              </span>
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#0d1012] px-5 py-2 sm:px-8" role="tablist" aria-label="Conteúdo do perfil">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "bricks"}
                aria-controls="profile-bricks"
                onClick={() => handleSelectTab("bricks")}
                className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all ${
                  activeTab === "bricks"
                    ? "bg-brand-orange text-black font-black shadow-[0_0_15px_rgba(255,94,0,0.35)]"
                    : "border border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/15 hover:text-white"
                }`}
              >
                Bricks
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-mono ${
                  activeTab === "bricks" ? "bg-black/20 text-black font-black" : "bg-white/10 text-gray-300"
                }`}>
                  {userPosts.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "jogos"}
                aria-controls="profile-jogos"
                onClick={() => handleSelectTab("jogos")}
                className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all ${
                  activeTab === "jogos"
                    ? "bg-brand-orange text-black font-black shadow-[0_0_15px_rgba(255,94,0,0.35)]"
                    : "border border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/15 hover:text-white"
                }`}
              >
                Jogos
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-mono ${
                  activeTab === "jogos" ? "bg-black/20 text-black font-black" : "bg-white/10 text-gray-300"
                }`}>
                  {votedReleases.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "salvos"}
                aria-controls="profile-salvos"
                onClick={() => handleSelectTab("salvos")}
                className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all ${
                  activeTab === "salvos"
                    ? "bg-brand-orange text-black font-black shadow-[0_0_15px_rgba(255,94,0,0.35)]"
                    : "border border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/15 hover:text-white"
                }`}
              >
                Salvos
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-mono ${
                  activeTab === "salvos" ? "bg-black/20 text-black font-black" : "bg-white/10 text-gray-300"
                }`}>
                  {totalSaved}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "settings"}
                aria-controls="profile-settings"
                onClick={() => handleSelectTab("settings")}
                className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all ${
                  activeTab === "settings"
                    ? "bg-brand-orange text-black font-black shadow-[0_0_15px_rgba(255,94,0,0.35)]"
                    : "border border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/15 hover:text-white"
                }`}
              >
                Configurações
              </button>
            </div>
          </div>
        </section>

        <div className="mt-8">
          {activeTab === "bricks" && (
            <div id="profile-bricks" role="tabpanel" className="space-y-8">
              <section className="rounded-2xl border border-white/10 bg-[#111619] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base font-black uppercase tracking-wider text-white">
                    Jogando agora
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSelectTab("jogos")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange transition-colors hover:text-white"
                  >
                    Ver todos →
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {votedReleases.length > 0 ? (
                    votedReleases.slice(0, 3).map((game) => (
                      <Link
                        key={game.id}
                        href="/lancamentos"
                        className="group flex overflow-hidden rounded-xl border border-white/10 bg-[#161b20] transition-colors hover:border-brand-orange/40 hover:bg-[#1a2127]"
                      >
                        <div className="relative size-20 shrink-0 bg-[#0d1012]">
                          {game.image_url ? (
                            <img src={game.image_url} alt={game.game} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-bold text-gray-600">OB</div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-center p-3 min-w-0">
                          <p className="truncate text-xs font-bold text-white group-hover:text-brand-orange">
                            {game.game}
                          </p>
                          <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-brand-orange">
                            <span className="size-1.5 rounded-full bg-brand-orange animate-pulse" />
                            Em andamento
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-xs text-gray-400">
                      <div>
                        <p className="font-bold text-white">Nenhum jogo em andamento selecionado</p>
                        <p className="mt-0.5 text-gray-500">Vote ou marque jogos no Radar de Lançamentos para exibi-los aqui.</p>
                      </div>
                      <Link
                        href="/lancamentos"
                        className="inline-flex min-h-9 items-center justify-center rounded-lg bg-brand-orange px-3 text-xs font-bold text-white hover:bg-[#ff7526]"
                      >
                        Explorar Radar de Lançamentos
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-base font-black uppercase tracking-wider text-white">
                      Meus Bricks
                    </h2>
                    <Link
                      href="/brickboard"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-brand-orange px-3.5 text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-[#ff7526]"
                    >
                      + Novo Brick
                    </Link>
                  </div>

                  {loadingPosts ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-32 rounded-xl bg-white/[0.04] border border-white/10" />
                      <div className="h-32 rounded-xl bg-white/[0.04] border border-white/10" />
                    </div>
                  ) : userPosts.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#111619] p-8 text-center sm:p-12">
                      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-orange/15 text-brand-orange">
                        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                        </svg>
                      </div>
                      <h3 className="mt-4 font-heading text-lg font-bold text-white">Você ainda não publicou nenhum Brick.</h3>
                      <p className="mt-1 text-xs text-gray-400 max-w-md mx-auto">
                        Compartilhe novidades, debata matérias recentes ou conte o que está achando da sua jogatina com a comunidade do OrangeBrick.
                      </p>
                      <Link
                        href="/brickboard"
                        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-orange px-5 text-xs font-black text-white hover:bg-[#ff7526]"
                      >
                        Publicar primeiro Brick
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userPosts.map((post) => (
                        <article key={post.id} className="rounded-2xl border border-white/10 bg-[#111619] p-4 sm:p-5 transition-colors hover:border-white/20">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#161b20]">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-xs font-bold text-brand-orange">
                                    {(profile?.display_name || "J")[0].toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-white">{profile?.display_name || "Jogador"}</span>
                                <span className="ml-1 text-[11px] text-gray-500 font-mono">
                                  {profile?.username ? `@${profile.username}` : ""}
                                </span>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] text-gray-500">
                              {new Date(post.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </span>
                          </div>

                          <p className="mt-3 text-sm leading-relaxed text-gray-200 break-words">
                            {post.content}
                          </p>

                          {post.media_url && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                              <img src={post.media_url} alt={post.media_alt || "Imagem anexada sem descrição alternativa."} className="max-h-80 w-full object-cover" />
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs text-gray-400">
                            <div className="flex items-center gap-3">
                              {post.platform_tag && (
                                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-gray-300">
                                  {post.platform_tag}
                                </span>
                              )}
                            </div>
                            <Link href={`/brickboard?post=${post.id}`} className="font-semibold text-brand-orange hover:text-white transition-colors">
                              Ver no Brickboard →
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <aside className="rounded-2xl border border-white/10 bg-[#111619] p-5 space-y-5">
                  <div>
                    <h3 className="font-heading text-sm font-black uppercase tracking-wider text-white">
                      Seu perfil gamer
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      Informações públicas exibidas para outros jogadores no BrickBoard.
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Plataformas</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {favoritePlatforms.map((platform) => (
                        <span
                          key={platform}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs font-semibold text-gray-200"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Principais interesses</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {favoriteCategories.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-lg border border-brand-orange/20 bg-brand-orange/10 px-2.5 py-1 text-xs font-semibold text-brand-orange"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Sobre mim</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-300">
                      {profile?.bio || "Jogos são mais do que diversão: são histórias, lugares e pessoas que nos inspiram."}
                    </p>
                  </div>

                  <div className="border-t border-white/[0.08] pt-3">
                    <Link
                      href="/configuracoes/perfil"
                      className="inline-flex w-full min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-xs font-bold text-white transition-colors hover:border-brand-orange/40 hover:bg-white/[0.08]"
                    >
                      Editar preferências gamer →
                    </Link>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {activeTab === "jogos" && (
            <div id="profile-jogos" role="tabpanel" className="space-y-6">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111619] p-5">
                <div>
                  <h2 className="font-heading text-lg font-black uppercase tracking-wider text-white">
                    Minha Coleção & Radar
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Jogos que você marcou com expectativa ou que está acompanhando no OrangeBrick.
                  </p>
                </div>
                <Link
                  href="/lancamentos"
                  className="inline-flex min-h-9 items-center justify-center rounded-xl bg-brand-orange px-3.5 text-xs font-black uppercase text-white hover:bg-[#ff7526]"
                >
                  Radar completo →
                </Link>
              </div>

              {votedReleases.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#111619] p-8 text-center sm:p-12">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-orange/15 text-brand-orange">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-bold text-white">Nenhum jogo no seu radar.</h3>
                  <p className="mt-1 text-xs text-gray-400 max-w-md mx-auto">
                    Participe dos votos do Radar de Lançamentos para registrar o hype dos seus jogos favoritos e vê-los reunidos aqui.
                  </p>
                  <Link
                    href="/lancamentos"
                    className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-orange px-5 text-xs font-black text-white hover:bg-[#ff7526]"
                  >
                    Explorar Radar de Lançamentos
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {votedReleases.map((item) => (
                    <Link
                      key={item.id}
                      href="/lancamentos"
                      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111619] transition-all hover:border-brand-orange/50 hover:bg-[#161b20]"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-[#0d1012]">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.game} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs font-bold text-gray-600">OB</div>
                        )}
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-brand-orange backdrop-blur-sm">
                          {item.release_label || item.release_date || "Em breve"}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="line-clamp-2 text-xs font-bold text-white group-hover:text-brand-orange">
                          {item.game}
                        </p>
                        {item.platforms && (
                          <p className="mt-auto pt-2 font-mono text-[10px] text-gray-500">
                            {Array.isArray(item.platforms) ? item.platforms.join(" · ") : String(item.platforms)}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "salvos" && (
            <div id="profile-salvos" role="tabpanel" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111619] p-5">
                <div>
                  <h2 className="font-heading text-lg font-black uppercase tracking-wider text-white">
                    Publicações e Matérias Salvas
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Tudo o que você guardou para reler ou consultar com tranquilidade.
                  </p>
                </div>
                <div className="flex gap-1.5 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSavedFilter("all")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      savedFilter === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Tudo ({totalSaved})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavedFilter("articles")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      savedFilter === "articles" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Matérias ({bookmarks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavedFilter("bricks")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      savedFilter === "bricks" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Bricks ({savedBricks.length})
                  </button>
                </div>
              </div>

              {totalSaved === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#111619] p-8 text-center sm:p-12">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-orange/15 text-brand-orange">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-bold text-white">Guarde as boas conversas.</h3>
                  <p className="mt-1 text-xs text-gray-400 max-w-md mx-auto">
                    Use o ícone de salvar em uma matéria do portal ou em uma publicação do BrickBoard para guardar e acessar tudo rapidamente por aqui.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link
                      href="/brickboard"
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-orange px-5 text-xs font-black text-white hover:bg-[#ff7526]"
                    >
                      Explorar o BrickBoard →
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 px-5 text-xs font-bold text-white hover:bg-white/[0.04]"
                    >
                      Ver notícias do portal
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(savedFilter === "all" || savedFilter === "articles") && bookmarks.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-gray-400">
                        Matérias Salvas ({bookmarks.length})
                      </h3>
                      {bookmarks.map((bm) => (
                        <div
                          key={bm.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111619] p-4 transition-colors hover:border-white/20"
                        >
                          <Link
                            href={`/posts/${bm.slug}`}
                            className="min-w-0 flex-1 truncate text-xs font-bold text-white hover:text-brand-orange"
                          >
                            {bm.title}
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(bm)}
                            className="shrink-0 text-xs font-semibold text-gray-500 hover:text-red-400"
                            aria-label={`Remover ${bm.title}`}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(savedFilter === "all" || savedFilter === "bricks") && savedBricks.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-gray-400">
                        Bricks Salvos ({savedBricks.length})
                      </h3>
                      {savedBricks.map((brick) => (
                        <div
                          key={brick.id}
                          className="rounded-2xl border border-white/10 bg-[#111619] p-4 transition-colors hover:border-white/20"
                        >
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="font-bold text-white">{brick.author_name}</span>
                            <button
                              type="button"
                              onClick={() => toggleSaveBrick(brick)}
                              className="text-xs text-gray-500 hover:text-red-400"
                            >
                              Remover
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-gray-300 line-clamp-3">{brick.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div id="profile-settings" role="tabpanel" className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/configuracoes/perfil"
                className="rounded-2xl border border-white/10 bg-[#111619] p-5 transition-all hover:border-brand-orange/40 hover:bg-[#161b20]"
              >
                <h4 className="font-heading text-sm font-bold text-white">Editar Perfil Gamer</h4>
                <p className="mt-1 text-xs text-gray-400">
                  Altere seu avatar, banner, bio, plataformas favoritas e o jogo que está jogando.
                </p>
              </Link>

              <Link
                href="/configuracoes/notificacoes"
                className="rounded-2xl border border-white/10 bg-[#111619] p-5 transition-all hover:border-brand-orange/40 hover:bg-[#161b20]"
              >
                <h4 className="font-heading text-sm font-bold text-white">Notificações</h4>
                <p className="mt-1 text-xs text-gray-400">
                  Gerencie preferências de avisos sobre matérias, enquetes e respostas da comunidade.
                </p>
              </Link>

              <Link
                href="/privacidade"
                className="rounded-2xl border border-white/10 bg-[#111619] p-5 transition-all hover:border-brand-orange/40 hover:bg-[#161b20]"
              >
                <h4 className="font-heading text-sm font-bold text-white">Privacidade & Dados</h4>
                <p className="mt-1 text-xs text-gray-400">
                  Consulte os termos de privacidade, exporte seus dados ou gerencie cookies.
                </p>
              </Link>

              <Link
                href="/brickboard/conquistas"
                className="rounded-2xl border border-white/10 bg-[#111619] p-5 transition-all hover:border-brand-orange/40 hover:bg-[#161b20]"
              >
                <h4 className="font-heading text-sm font-bold text-white">Conquistas & Temporada</h4>
                <p className="mt-1 text-xs text-gray-400">
                  Veja suas insígnias desbloqueadas e seu progresso na temporada atual.
                </p>
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
