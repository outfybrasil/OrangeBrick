"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Footer } from "@/components/ui/Footer";
import { UserBadge } from "@/components/ui/UserBadge";
import { AchievementMark, LevelProgress, SeasonStanding } from "@/components/community/ProgressionUI";
import { formatXp } from "@/lib/progression";
import { resolveAvatarUrl } from "@/lib/avatar";
import { FollowButton } from "@/components/topics/FollowButton";
import type { PrivateProgressData, PublicProfileData } from "@/lib/types/progression";

type ProfileTab = "overview" | "bricks" | "achievements" | "history";

interface ProfilePost {
  id: string;
  content: string;
  platform_tag: string | null;
  created_at: string;
  image_url?: string | null;
  reaction_count?: number | null;
  comment_count?: number | null;
  attached_article: {
    slug?: string;
    title?: string;
    image_url?: string | null;
  } | null;
}

const eventLabels: Record<string, string> = {
  post_created: "Brick publicado",
  comment_created: "Comentário publicado",
  reaction_given: "Participação em uma reação",
  comment_liked: "Curtida recebida em comentário",
  poll_voted: "Voto na pergunta do dia",
  post_shared: "Brick compartilhado",
  editorial_highlight: "Destaque editorial",
  admin_adjustment: "Ajuste administrativo",
};

const rarityColors: Record<string, string> = {
  common: "text-gray-300",
  uncommon: "text-emerald-400",
  rare: "text-sky-400",
  epic: "text-violet-400",
  legendary: "text-brand-orange",
};

const rarityLabels: Record<string, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
};

function PlatformIcon({ platform }: { platform: string }) {
  const lower = platform.toLowerCase();
  if (lower.includes("xbox"))
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 512 512" fill="currentColor">
        <path d="M126.8 248.3c39.7-58.6 77.9-92.8 77.9-92.8s-42.1-48.9-92.8-67.4l-3.3-.8A224.13 224.13 0 0 0 77.2 391c0-4.4.6-70.3 49.6-142.7Z" />
        <path d="M480 256a223.71 223.71 0 0 0-76.6-168.7l-3.2.9c-50.7 18.5-92.9 67.4-92.9 67.4s38.2 34.2 77.9 92.8c49 72.4 49.6 138.3 49.5 142.7A222.8 222.8 0 0 0 480 256Z" />
        <path d="M201.2 80.9c29.3 13.1 54.6 34.6 54.6 34.6s25.5-21.4 54.8-34.6c36.8-16.5 64.9-11.3 72.3-9.5a224.06 224.06 0 0 0-253.8 0c7.2-1.8 35.2-7.1 72.1 9.5Z" />
        <path d="M358.7 292.9C312.4 236 255.8 199 255.8 199s-56.3 37-102.7 93.9c-39.8 48.9-54.6 84.8-62.6 107.8l-1.3 4.8a224 224 0 0 0 333.6 0l-1.4-4.8c-8-23-22.9-58.9-62.7-107.8Z" />
      </svg>
    );
  if (lower.includes("pc") || lower.includes("window"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851" />
      </svg>
    );
  if (lower.includes("playstation") || lower.includes("ps"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.984 2.596v14.082l3.54 1.008V5.916c0-.72.317-1.224.826-.996.59.24.703.84.703 1.561v5.336c1.67.756 4.293.24 4.293-3.293 0-3.437-1.139-5.053-4.395-5.941-1.07-.296-2.85-.587-4.967-.987m7.789 13.32c-1.586.667-3.297.793-4.998.457l-.012 2.54 3.424 1.006c1.857-.502 3.396-1.477 4.195-2.773l-2.61-1.23m-11.476 2.15l3.478 1.5V17.72L3.6 15.994c.388.955 1.046 1.741 1.697 2.072" />
      </svg>
    );
  if (lower.includes("nintendo") || lower.includes("switch"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10.04 20.4H8.3C5.98 20.4 4.1 18.52 4.1 16.2V7.8C4.1 5.48 5.98 3.6 8.3 3.6h1.74v16.8zM8.3 2C5.09 2 2.5 4.59 2.5 7.8v8.4C2.5 19.41 5.09 22 8.3 22h3.34V2H8.3zm4.87 5.76c.94 0 1.7.76 1.7 1.7 0 .93-.76 1.69-1.7 1.69-.93 0-1.69-.76-1.69-1.69 0-.94.76-1.7 1.69-1.7zm3.53-3.16H15C12.68 4.6 10.8 6.48 10.8 8.8v2.4h5.9V7.6c0-.66.53-1.2 1.2-1.2.66 0 1.2.54 1.2 1.2v8.8c0 .66-.54 1.2-1.2 1.2-.67 0-1.2-.54-1.2-1.2v-3.2H10.8v4c0 2.32 1.88 4.2 4.2 4.2h1.7C19.11 21.4 21.5 19 21.5 16.2V7.8c0-2.8-2.39-5.2-4.8-3.2z" />
      </svg>
    );
  return null;
}

function ContributionBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-brand-orange transition-[width] duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ProfilePageContent() {
  const params = useParams<{ nickname: string }>();
  const username = decodeURIComponent(params.nickname || "");
  const supabase = useMemo(() => createDataClient(), []);
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [privateProgress, setPrivateProgress] = useState<PrivateProgressData | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      setIsLoading(true);
      setError(null);
      const { data, error: profileError } = await supabase.rpc("public_profile", {
        target_username: username,
      });
      const loadedProfile = data as PublicProfileData | null;

      if (!isActive) return;
      if (profileError) {
        setError("Não foi possível carregar este perfil.");
        setIsLoading(false);
        return;
      }
      if (!loadedProfile) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { data: publicIdentity } = await supabase
        .from("profiles")
        .select("banner_url")
        .eq("user_id", loadedProfile.user_id)
        .maybeSingle<{ banner_url: string | null }>();
      setProfile({ ...loadedProfile, banner_url: publicIdentity?.banner_url || null });
      const { data: userPosts } = await supabase
        .from("community_posts")
        .select("id, content, platform_tag, created_at, image_url, reaction_count, comment_count, attached_article")
        .eq("user_id", loadedProfile.user_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!isActive) return;
      setPosts((userPosts || []) as unknown as ProfilePost[]);

      if (user?.id === loadedProfile.user_id && !loadedProfile.is_official) {
        const { data: ownProgress } = await supabase.rpc("current_user_progress", {});
        if (isActive) setPrivateProgress(ownProgress as PrivateProgressData | null);
      } else {
        setPrivateProgress(null);
      }
      setIsLoading(false);
    }

    if (username) void loadProfile();
    return () => {
      isActive = false;
    };
  }, [supabase, user?.id, username]);

  const isOwner = Boolean(user && profile?.user_id === user.id);
  const showcasedAchievements = profile?.achievements.filter((a) => a.is_equipped).slice(0, 3) || [];
  const allAchievements = profile?.achievements || [];
  const avatarUrl = profile ? resolveAvatarUrl(profile.avatar_url, profile.display_name) : "";

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
      </div>
    );
  }

  if (error) {
    return <ProfileUnavailable title="Não foi possível abrir o perfil" description={error} />;
  }

  if (!profile) {
    return <ProfileUnavailable title="Perfil não encontrado" description="Este endereço não pertence a um leitor do Brickboard." />;
  }

  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: "overview", label: "Visão geral" },
    { id: "bricks", label: "Bricks" },
    { id: "achievements", label: "Conquistas" },
    ...(isOwner ? [{ id: "history" as const, label: "Histórico" }] : []),
  ];
  const frameClass =
    profile.equipped_frame === "aco-prensado"
      ? "border-4 border-[#cbd0d6] outline outline-1 outline-white/30 rounded-full"
      : profile.equipped_frame === "encaixe-basico"
        ? "border-4 border-brand-orange rounded-full"
        : "border-2 border-brand-orange/40 rounded-full";
  const statsMax = profile.stats
    ? Math.max(profile.stats.posts, profile.stats.comments, profile.stats.reactions_received, profile.stats.replies_received, profile.stats.achievements, 1)
    : 1;

  return (
    <>
      <header className="border-b border-white/10 bg-background-void">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/brickboard" className="flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">
            ← Brickboard
          </Link>
          <Link href="/" className="font-heading text-sm font-black uppercase tracking-wide text-white">
            Orange<span className="text-brand-orange">_</span>Brick
          </Link>
        </div>
      </header>

      <main className="min-h-dvh bg-[#0E0F14]">
        {/* ── HERO BANNER ── */}
        <div className="relative overflow-hidden border-b border-white/10">
          {profile.banner_url && (
            <img src={profile.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          )}
          {profile.banner_url && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0E0F14]/95 via-[#0E0F14]/70 to-[#0E0F14]/25" />}
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 60% at 75% 50%, rgba(255,90,20,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 90% 20%, rgba(255,60,0,0.12) 0%, transparent 60%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={`h-28 w-28 overflow-hidden rounded-full sm:h-32 sm:w-32 ${frameClass}`}>
                  <img src={avatarUrl} alt={`Avatar de ${profile.display_name}`} className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null, profile.display_name); }} />
                </div>
                {!profile.is_official && profile.progress && (
                  <div className="absolute -bottom-1 -right-1 min-w-9 rounded-full border-2 border-[#0E0F14] bg-brand-orange px-2 py-0.5 text-center text-white shadow-md">
                    <span className="block text-[8px] font-black uppercase tracking-wider">Nv.</span>
                    <strong className="font-heading text-xs leading-none">{profile.progress.level}</strong>
                  </div>
                )}
              </div>

              {/* Name + meta + bio + platforms */}
              <div className="min-w-0 flex-1">
                {profile.equipped_title && (
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">{profile.equipped_title}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words font-heading text-3xl font-black leading-none tracking-tight text-white sm:text-4xl">{profile.display_name}</h1>
                  <UserBadge nickname={profile.display_name} isOfficial={profile.is_official} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span>@{profile.username}</span>
                  <span className="text-white/20">·</span>
                  <span>Membro desde {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(profile.created_at))}</span>
                </div>
                <p className="mt-3 max-w-[56ch] text-sm leading-6 text-gray-300">
                  {profile.bio || (isOwner ? "Conte à comunidade quais jogos, plataformas e assuntos movem você." : "Este leitor ainda não escreveu uma apresentação.")}
                </p>
                {profile.favorite_platforms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.favorite_platforms.map((p) => (
                      <span key={p} className="flex items-center gap-1.5 border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-gray-300">
                        <PlatformIcon platform={p} />
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats + CTAs */}
              <div className="flex shrink-0 flex-col items-end gap-4">
                {profile.stats && (
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <strong className="block font-heading text-2xl font-black text-white">{profile.stats.posts}</strong>
                      <span className="text-[10px] text-gray-400">Bricks</span>
                    </div>
                    <div className="text-center">
                      <strong className="block font-heading text-2xl font-black text-white">{profile.stats.comments}</strong>
                      <span className="text-[10px] text-gray-400">Comentário{profile.stats.comments !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="text-center">
                      <strong className="block font-heading text-2xl font-black text-white">{profile.stats.achievements}</strong>
                      <span className="text-[10px] text-gray-400">Conquista{profile.stats.achievements !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  {isOwner ? (
                    <>
                      <Link href="/configuracoes/perfil#vitrine" className="inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 text-xs font-bold text-white hover:bg-[#ff7526] transition-colors">Personalizar vitrine</Link>
                      <Link href="/configuracoes/perfil" className="inline-flex min-h-10 items-center justify-center border border-white/20 px-4 text-xs font-bold text-white hover:border-brand-orange/50 transition-colors">Editar perfil</Link>
                    </>
                  ) : (
                    <><FollowButton type="profile" value={profile.user_id} label="Seguir leitor" /><button type="button" onClick={() => void navigator.clipboard?.writeText(window.location.href)} className="min-h-10 border border-white/20 px-4 text-xs font-bold text-white hover:border-brand-orange/50 transition-colors">Copiar link</button></>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0E0F14]/95 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Seções do perfil">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id} className={`relative min-h-14 shrink-0 px-5 text-sm font-semibold transition-colors ${activeTab === tab.id ? "text-white" : "text-gray-500 hover:text-gray-300"}`}>
                {tab.label}
                {activeTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-brand-orange" />}
              </button>
            ))}
          </nav>
        </div>

        {/* ── CONTENT ── */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {activeTab === "overview" && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
              {/* Left column */}
              <div className="space-y-10">
                <section>
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Conquistas em destaque</h2>
                    <Link href="/brickboard/conquistas" className="text-xs font-bold text-brand-orange hover:text-white transition-colors">Ver tudo</Link>
                  </div>
                  {showcasedAchievements.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      {showcasedAchievements.map((achievement) => (
                        <div key={achievement.slug} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/[0.05]">
                            <img src={`/icons/achievements/${achievement.slug}.png`} alt="" className="h-10 w-10 object-contain" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading text-sm font-bold text-white">{achievement.name}</p>
                            <p className="mt-0.5 text-[11px] leading-4 text-gray-400 line-clamp-2">{achievement.description}</p>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold ${rarityColors[achievement.rarity] || "text-gray-300"}`}>{rarityLabels[achievement.rarity] || achievement.rarity}</span>
                            {achievement.unlocked_at && (
                              <span className="text-[10px] text-gray-500">Conquistada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(achievement.unlocked_at))}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-white/10 py-10 text-center text-sm text-gray-500">
                      {isOwner ? "Escolha conquistas desbloqueadas para montar sua vitrine." : "Este leitor ainda não montou uma vitrine."}
                    </p>
                  )}
                </section>

                <section>
                  <h2 className="mb-5 text-base font-bold text-white">Bricks recentes</h2>
                  <ProfilePostList posts={posts.slice(0, 5)} ownProfile={isOwner} />
                  {posts.length > 5 && (
                    <button type="button" onClick={() => setActiveTab("bricks")} className="mt-4 flex items-center gap-1.5 text-sm font-bold text-brand-orange hover:text-white transition-colors">
                      Ver todos os bricks
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  )}
                </section>

                {!profile.is_official && profile.progress && (
                  <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
                    <LevelProgress progress={profile.progress} />
                    {isOwner && privateProgress && (
                      <details className="mt-4 border-t border-white/10 pt-4">
                        <summary className="min-h-8 cursor-pointer text-xs font-bold text-brand-orange">Ver atividade elegível hoje</summary>
                        <div className="grid grid-cols-3 gap-3 pt-3 text-center">
                          <DailyLimit value={privateProgress.daily.post_created} label="Bricks" />
                          <DailyLimit value={privateProgress.daily.comment_created} label="Comentários" />
                          <DailyLimit value={privateProgress.daily.reaction_given} label="Reações" />
                        </div>
                      </details>
                    )}
                    {profile.season && (
                      <div className="mt-5 border-t border-white/10 pt-5">
                        <SeasonStanding season={profile.season} />
                      </div>
                    )}
                  </section>
                )}
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">
                <aside className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">Sobre</h2>
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-sm leading-6 text-gray-300">
                    {profile.bio || (isOwner ? "Conte à comunidade quais jogos, plataformas e assuntos movem você." : "Este leitor ainda não escreveu uma apresentação.")}
                  </p>
                </aside>

                {profile.stats && (
                  <aside className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white">Contribuição</h2>
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <dl className="space-y-4">
                      {[
                        { label: "Bricks publicados", value: profile.stats.posts },
                        { label: "Comentários", value: profile.stats.comments },
                        { label: "Reações recebidas", value: profile.stats.reactions_received },
                        { label: "Respostas geradas", value: profile.stats.replies_received },
                        { label: "Conquistas", value: profile.stats.achievements },
                      ].map(({ label, value }) => (
                        <div key={label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <dt className="text-gray-400">{label}</dt>
                            <dd className="font-bold text-white">{value}</dd>
                          </div>
                          <ContributionBar value={value} max={statsMax} />
                        </div>
                      ))}
                    </dl>
                  </aside>
                )}

                {(profile.favorite_categories.length > 0 || profile.favorite_platforms.length > 0) && (
                  <aside className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white">Interesses</h2>
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[...profile.favorite_platforms, ...profile.favorite_categories].map((interest) => (
                        <span key={interest} className="border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-gray-300">{interest}</span>
                      ))}
                    </div>
                  </aside>
                )}
              </div>
            </div>
          )}

          {activeTab === "bricks" && (
            <section className="max-w-3xl">
              <h2 className="mb-6 text-base font-bold text-white">Bricks de {profile.display_name}</h2>
              <ProfilePostList posts={posts} ownProfile={isOwner} />
            </section>
          )}

          {activeTab === "achievements" && (
            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Coleção de conquistas <span className="ml-1.5 text-sm font-normal text-gray-500">({allAchievements.filter((a) => a.unlocked_at).length}/{allAchievements.length})</span></h2>
                {isOwner && <Link href="/brickboard/conquistas" className="text-xs font-bold text-brand-orange hover:text-white transition-colors">Gerenciar vitrine</Link>}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {allAchievements.map((achievement) => <AchievementMark key={achievement.slug} achievement={achievement} />)}
              </div>
            </section>
          )}

          {activeTab === "history" && isOwner && (
            <section className="max-w-2xl">
              <h2 className="mb-6 text-base font-bold text-white">Histórico de XP</h2>
              {privateProgress?.events.length ? (
                <ol className="divide-y divide-white/10 rounded-lg border border-white/10">
                  {privateProgress.events.map((event, index) => (
                    <li key={`${event.occurred_at}-${index}`} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{eventLabels[event.event_type] || event.event_type}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurred_at))}</p>
                        {event.revocation_reason && <p className="mt-0.5 text-xs text-red-300">{event.revocation_reason}</p>}
                      </div>
                      <span className={event.status === "revoked" ? "text-sm font-bold text-gray-500 line-through" : "text-sm font-bold text-brand-orange"}>
                        {event.xp_amount > 0 ? "+" : ""}{formatXp(event.xp_amount)} XP
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-lg border border-white/10 py-12 text-center text-sm text-gray-400">Seu histórico começará a aparecer quando você participar do Brickboard.</p>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ProfilePostList({ posts, ownProfile }: { posts: ProfilePost[]; ownProfile: boolean }) {
  if (!posts.length) {
    return (
      <p className="rounded-lg border border-white/10 py-12 text-center text-sm text-gray-400">
        {ownProfile ? "Sua parede ainda está vazia. Abra a primeira conversa." : "Este leitor ainda não publicou nenhum Brick."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <article key={post.id} className="flex gap-4 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
          {post.attached_article?.image_url && (
            <div className="w-32 shrink-0 overflow-hidden sm:w-40">
              <img src={post.attached_article.image_url} alt={post.attached_article.title || ""} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1 py-4 pr-4">
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              {post.platform_tag && <span className="font-bold text-brand-orange uppercase tracking-wider">{post.platform_tag}</span>}
              <time dateTime={post.created_at} className="text-gray-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(post.created_at))}</time>
            </div>
            {post.attached_article?.title ? (
              <>
                <p className="font-heading text-sm font-bold leading-6 text-white line-clamp-2">{post.attached_article.title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-400 line-clamp-2">{post.content}</p>
              </>
            ) : (
              <p className="max-w-[64ch] whitespace-pre-wrap text-sm leading-6 text-gray-200 line-clamp-3">{post.content}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-500">
              <Link href={`/brickboard?post=${post.id}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {post.comment_count ?? 0}
              </Link>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                {post.reaction_count ?? 0}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProfileUnavailable({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-void px-4 text-center">
      <div className="max-w-md">
        <h1 className="font-heading text-3xl font-black text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">{description}</p>
        <Link href="/brickboard" className="mt-6 inline-flex min-h-11 items-center bg-brand-orange px-5 text-xs font-bold text-white">
          Voltar ao Brickboard
        </Link>
      </div>
    </main>
  );
}

function DailyLimit({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-t border-white/15 pt-3">
      <strong className="block font-heading text-xl text-white">{value}</strong>
      <span className="text-[11px] text-gray-400">{label}</span>
    </div>
  );
}



export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0E0F14]" />}>
      <ProfilePageContent />
    </Suspense>
  );
}
