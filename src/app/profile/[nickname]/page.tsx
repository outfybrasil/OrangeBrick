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
import type { PrivateProgressData, PublicProfileData } from "@/lib/types/progression";

type ProfileTab = "overview" | "bricks" | "achievements" | "history";

interface ProfilePost {
  id: string;
  content: string;
  platform_tag: string | null;
  created_at: string;
  attached_article: {
    slug?: string;
    title?: string;
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

      setProfile(loadedProfile);
      const { data: userPosts } = await supabase
        .from("community_posts")
        .select("id, content, platform_tag, created_at, attached_article")
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
  const showcasedAchievements = profile?.achievements.filter((achievement) => achievement.is_equipped).slice(0, 3) || [];
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
  const themeClass = profile.profile_theme === "fornalha"
    ? "bg-[#1b0e08]"
    : profile.profile_theme === "carvao"
      ? "bg-[#111216]"
      : "bg-background-void";
  const frameClass = profile.equipped_frame === "aco-prensado"
    ? "border-4 border-[#cbd0d6] outline outline-1 outline-white/30"
    : profile.equipped_frame === "encaixe-basico"
      ? "border-4 border-brand-orange"
      : "border border-white/15";

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

      <main className="min-h-dvh bg-background-void">
        <section className={`border-b border-white/10 ${themeClass}`}>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
              <div className="flex min-w-0 flex-col gap-7 sm:flex-row sm:items-start">
                <div className="relative w-fit shrink-0 pb-4 pr-4">
                  <div className={`h-28 w-28 overflow-hidden bg-card-slate sm:h-32 sm:w-32 ${frameClass}`}>
                    <img src={avatarUrl} alt={`Avatar de ${profile.display_name}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  {!profile.is_official && profile.progress && (
                    <div className="absolute bottom-0 right-0 min-w-16 border-4 border-background-void bg-brand-orange px-3 py-2 text-center text-white">
                      <span className="block text-[9px] font-black uppercase tracking-[0.16em]">Nível</span>
                      <strong className="font-heading text-xl leading-none">{profile.progress.level}</strong>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  {profile.equipped_title && (
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-brand-orange">{profile.equipped_title}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words font-heading text-[clamp(2rem,7vw,4.5rem)] font-black leading-[0.95] tracking-[-0.03em] text-white">
                      {profile.display_name}
                    </h1>
                    <UserBadge nickname={profile.display_name} isOfficial={profile.is_official} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400">
                    <span>@{profile.username}</span>
                    <span>Membro desde {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(profile.created_at))}</span>
                  </div>
                  <p className="mt-4 max-w-[68ch] text-sm leading-6 text-gray-300">
                    {profile.bio || (isOwner ? "Conte à comunidade quais jogos, plataformas e assuntos movem você." : "Este leitor ainda não escreveu uma apresentação.")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[...profile.favorite_platforms, ...profile.favorite_categories].map((interest) => (
                      <span key={interest} className="border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-gray-300">{interest}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                {isOwner ? (
                  <>
                    <Link href="/configuracoes/perfil#vitrine" className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-3 text-center text-xs font-bold text-white hover:bg-[#ff7526] sm:px-5">
                      Personalizar vitrine
                    </Link>
                    <Link href="/configuracoes/perfil" className="inline-flex min-h-11 items-center justify-center border border-white/15 px-3 text-center text-xs font-bold text-white hover:border-brand-orange/50 sm:px-5">
                      Editar perfil
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(window.location.href)}
                    className="min-h-11 border border-white/15 px-5 text-xs font-bold text-white hover:border-brand-orange/50"
                  >
                    Copiar link
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {!profile.is_official && profile.progress && (
          <section className="border-b border-white/10">
            <div className="mx-auto grid max-w-7xl divide-y divide-white/10 px-4 sm:px-6 lg:grid-cols-2 lg:divide-x lg:divide-y-0 lg:px-8">
              <div className="py-7 lg:pr-10">
                <LevelProgress progress={profile.progress} />
                {isOwner && privateProgress && (
                  <details className="mt-5 border-t border-white/10 pt-4">
                    <summary className="min-h-11 cursor-pointer content-center text-xs font-bold text-brand-orange">
                      Ver atividade elegível hoje
                    </summary>
                    <div className="grid grid-cols-3 gap-3 pt-3 text-center">
                      <DailyLimit value={privateProgress.daily.post_created} label="Bricks" />
                      <DailyLimit value={privateProgress.daily.comment_created} label="Comentários" />
                      <DailyLimit value={privateProgress.daily.reaction_given} label="Reações" />
                    </div>
                  </details>
                )}
              </div>
              <div className="py-7 lg:pl-10">
                <SeasonStanding season={profile.season} />
              </div>
            </div>
          </section>
        )}

        <div className="sticky top-0 z-20 border-b border-white/10 bg-background-void/95">
          <nav className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Seções do perfil">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={`relative min-h-14 shrink-0 px-4 text-sm font-bold ${activeTab === tab.id ? "text-white" : "text-gray-500 hover:text-gray-200"}`}
              >
                {tab.label}
                {activeTab === tab.id && <span className="absolute inset-x-4 bottom-0 h-0.5 bg-brand-orange" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          {activeTab === "overview" && (
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-12">
                <section>
                  <SectionHeading title="Conquistas em destaque" href="/brickboard/conquistas" />
                  {showcasedAchievements.length > 0 ? (
                    <div className="mt-5 grid gap-6 sm:grid-cols-3">
                      {showcasedAchievements.map((achievement) => <AchievementMark key={achievement.slug} achievement={achievement} />)}
                    </div>
                  ) : (
                    <EmptyState text={isOwner ? "Escolha conquistas desbloqueadas para montar sua vitrine." : "Este leitor ainda não montou uma vitrine."} />
                  )}
                </section>
                <section>
                  <SectionHeading title="Bricks recentes" />
                  <ProfilePostList posts={posts.slice(0, 5)} ownProfile={isOwner} />
                </section>
              </div>
              {profile.stats && (
                <aside>
                  <h2 className="font-heading text-lg font-bold text-white">Contribuição</h2>
                  <dl className="mt-5 divide-y divide-white/10 border-y border-white/10">
                    <Stat label="Bricks publicados" value={profile.stats.posts} />
                    <Stat label="Comentários" value={profile.stats.comments} />
                    <Stat label="Reações recebidas" value={profile.stats.reactions_received} />
                    <Stat label="Respostas geradas" value={profile.stats.replies_received} />
                    <Stat label="Conquistas" value={profile.stats.achievements} />
                  </dl>
                </aside>
              )}
            </div>
          )}

          {activeTab === "bricks" && (
            <section>
              <SectionHeading title={`Bricks de ${profile.display_name}`} />
              <ProfilePostList posts={posts} ownProfile={isOwner} />
            </section>
          )}

          {activeTab === "achievements" && (
            <section>
              <SectionHeading title="Coleção de conquistas" href={isOwner ? "/brickboard/conquistas" : undefined} />
              <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {profile.achievements.map((achievement) => <AchievementMark key={achievement.slug} achievement={achievement} />)}
              </div>
            </section>
          )}

          {activeTab === "history" && isOwner && (
            <section className="max-w-3xl">
              <SectionHeading title="Histórico de XP" />
              {privateProgress?.events.length ? (
                <ol className="mt-6 divide-y divide-white/10 border-y border-white/10">
                  {privateProgress.events.map((event, index) => (
                    <li key={`${event.occurred_at}-${index}`} className="grid grid-cols-[1fr_auto] gap-4 py-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{eventLabels[event.event_type] || event.event_type}</p>
                        <p className="mt-1 text-xs text-gray-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurred_at))}</p>
                        {event.revocation_reason && <p className="mt-1 text-xs text-red-300">{event.revocation_reason}</p>}
                      </div>
                      <span className={event.status === "revoked" ? "text-sm font-bold text-gray-500 line-through" : "text-sm font-bold text-brand-orange"}>
                        {event.xp_amount > 0 ? "+" : ""}{formatXp(event.xp_amount)} XP
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState text="Seu histórico começará a aparecer quando você participar do Brickboard." />
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
    return <EmptyState text={ownProfile ? "Sua parede ainda está vazia. Abra a primeira conversa." : "Este leitor ainda não publicou nenhum Brick."} />;
  }

  return (
    <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
      {posts.map((post) => (
        <article key={post.id} className="py-5">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            {post.platform_tag && <span className="font-bold text-brand-orange">{post.platform_tag}</span>}
            <time dateTime={post.created_at}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(post.created_at))}</time>
          </div>
          <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-6 text-gray-200">{post.content}</p>
          {post.attached_article?.slug && (
            <Link href={`/posts/${post.attached_article.slug}`} className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-brand-orange hover:text-white">
              {post.attached_article.title || "Abrir matéria relacionada"}
            </Link>
          )}
          <Link href={`/brickboard?post=${post.id}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-gray-400 hover:text-white">
            Abrir conversa
          </Link>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-heading text-lg font-bold text-white">{formatXp(value)}</dd>
    </div>
  );
}

function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
      <h2 className="font-heading text-xl font-bold text-white">{title}</h2>
      {href && <Link href={href} className="min-h-11 content-center text-xs font-bold text-brand-orange hover:text-white">Ver tudo</Link>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-5 border-y border-white/10 py-10 text-sm leading-6 text-gray-400">{text}</p>;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background-void" />}>
      <ProfilePageContent />
    </Suspense>
  );
}
