"use client";

import { useEffect, useState, Suspense, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { BrickCard } from "@/components/community/BrickCard";
import { GamerPollWidget } from "@/components/community/GamerPollWidget";
import { ComposeBrickModal } from "@/components/community/ComposeBrickModal";
import { CreatePollModal } from "@/components/community/CreatePollModal";
import type { AttachedArticle } from "@/lib/types/community";
import { UserNav } from "@/components/auth/UserNav";
import { Icon } from "@/components/ui/Icon";
import { Footer } from "@/components/ui/Footer";
import { useAuth } from "@/lib/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { createDataClient } from "@/lib/supabase/client";
import { levelProgress } from "@/lib/progression";
import { getGoogleAvatarUrl, resolveAvatarUrl } from "@/lib/avatar";
import type { PrivateProgressData } from "@/lib/types/progression";
import { BackToTop } from "@/components/ui/BackToTop";

const PLATFORM_TABS = [
  { id: "TODOS", label: "Todos" },
  { id: "[PS5]", label: "PS5" },
  { id: "[XSX]", label: "Xbox Series" },
  { id: "[SWITCH 2]", label: "Switch 2" },
  { id: "[PC]", label: "PC" },
  { id: "[MOBILE]", label: "Mobile" },
];

function BrickboardContent() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [userProgress, setUserProgress] = useState<PrivateProgressData | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const { posts, poll, isLoaded, operationError, clearOperationError, addPost, deletePost, sharePost, toggleReaction, votePoll, addComment, deleteComment, toggleCommentLike, getComments } = useCommunityFeed();

  const [activeTab, setActiveTab] = useState<"latest" | "following" | "trending">("latest");
  const [visiblePostCount, setVisiblePostCount] = useState(8);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const articleSlug = searchParams.get("article");
  const topicId = searchParams.get("topic");
  const targetPostId = searchParams.get("post");
  const attachSlug = searchParams.get("attach");
  const attachTitle = searchParams.get("title");
  const [isComposeOpen, setIsComposeOpen] = useState(Boolean(attachSlug && attachTitle));
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [inlineMediaUrl, setInlineMediaUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("TODOS");
  const [preAttachedArticle, setPreAttachedArticle] = useState<AttachedArticle | null>(() => {
    if (attachSlug && attachTitle) {
      return {
        id: attachSlug,
        slug: attachSlug,
        title: attachTitle,
        summary: searchParams.get("summary") || "",
        image_url: searchParams.get("img") || null,
        category: searchParams.get("cat") || "industry",
      };
    }
    return null;
  });

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlatform =
      selectedPlatform === "TODOS" || post.platform_tag === selectedPlatform;

    const matchesArticle =
      !articleSlug ||
      post.attached_article?.slug === articleSlug ||
      post.shared_post?.original_attached_article?.slug === articleSlug;

    const matchesTopic = !topicId || post.topic_id === topicId;
    const matchesSelectedPost = !targetPostId || post.id === targetPostId;

    return matchesSearch && matchesPlatform && matchesArticle && matchesTopic && matchesSelectedPost;
  });

  const conversationTitle = articleSlug
    ? posts.find((post) => post.attached_article?.slug === articleSlug)?.attached_article?.title ||
      posts.find((post) => post.shared_post?.original_attached_article?.slug === articleSlug)
        ?.shared_post?.original_attached_article?.title
    : null;

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = { TODOS: posts.length };
    for (const post of posts) {
      if (post.platform_tag) counts[post.platform_tag] = (counts[post.platform_tag] || 0) + 1;
    }
    return counts;
  }, [posts]);

  const displayPosts = [...filteredPosts].sort((a, b) => {
    if (activeTab === "trending") {
      const score = (post: typeof a) => (post.comments_count || 0) * 3 + (post.reactions.hype || 0) + (post.reactions.flop || 0) + (post.shares_count || 0) * 2;
      return score(b) - score(a) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const visiblePosts = displayPosts.slice(0, visiblePostCount);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visiblePostCount >= displayPosts.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisiblePostCount((count) => Math.min(count + 8, displayPosts.length));
    }, { rootMargin: "320px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [displayPosts.length, visiblePostCount]);

  const requireUser = (action: () => void) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    action();
  };

  useEffect(() => {
    if (!isLoaded || !targetPostId) return;
    document.getElementById(`brick-${targetPostId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isLoaded, targetPostId]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("current_user_progress", {}).then(({ data }) => {
      if (data) setUserProgress(data as PrivateProgressData);
    });
  }, [supabase, user]);

  const trendingTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((post) => {
      const key = post.platform_tag;
      if (key) counts[key] = (counts[key] || 0) + (post.comments_count ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [posts]);

  const xpProgress = userProgress ? levelProgress(userProgress.progress.lifetime_xp, userProgress.progress.level) : 0;
  const avatarUrl = user
    ? resolveAvatarUrl(
        profile?.avatar_url || getGoogleAvatarUrl(user),
        profile?.display_name || profile?.nickname || user.user_metadata?.full_name || user.email,
        profile?.is_official
      )
    : "";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0e12]/95 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-4">
            {user && userProgress && (
              <Link href={profile?.username ? `/profile/${encodeURIComponent(profile.username)}` : "/minha-orange"} className="group hidden min-h-11 items-center gap-2.5 border-r border-white/10 pr-4 lg:flex" aria-label={`Abrir Meu Brick, nível ${userProgress.progress.level}`}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-8 shrink-0 rounded-full border border-brand-orange/40 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-orange/15 font-heading text-xs font-black text-brand-orange">{(profile?.display_name || user.email || "B").charAt(0).toUpperCase()}</span>
                )}
                <span className="w-24">
                  <span className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="text-gray-400 group-hover:text-white">Progresso</span>
                    <span className="text-brand-orange">Nv. {userProgress.progress.level}</span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden bg-white/10"><span className="block h-full bg-brand-orange" style={{ width: `${xpProgress}%` }} /></span>
                </span>
              </Link>
            )}
            <Link href="/" className="group flex min-h-11 shrink-0 items-center gap-2.5">
              <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Orange Brick Logo Icon" style={{ maxHeight: "32px", maxWidth: "44px", width: "auto", height: "auto" }} className="h-8 w-auto shrink-0 object-contain transition-transform duration-300 group-hover:scale-105" />
              <span className="hidden whitespace-nowrap font-heading text-lg font-extrabold uppercase tracking-wider text-white transition-colors group-hover:text-brand-orange sm:inline">Orange<span className="text-brand-orange">_</span>Brick</span>
            </Link>
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <label htmlFor="brickboard-search" className="sr-only">Buscar conversas</label>
            <div className="relative">
              <svg aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="brickboard-search"
                type="search"
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setVisiblePostCount(8); }}
                placeholder="Buscar conversas e leitores..."
                className="min-h-9 w-full border border-white/10 bg-white/[0.04] px-9 text-xs text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-orange/40 focus:bg-white/[0.06]"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="hidden min-h-9 items-center gap-1.5 border border-white/10 px-3 text-xs font-bold text-gray-300 transition-colors hover:border-white/25 hover:text-white sm:flex"
            >
              ← Portal
            </Link>
            <UserNav />
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-dvh w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {user && userProgress && (
          <Link
            href={profile?.username ? `/profile/${encodeURIComponent(profile.username)}` : "/minha-orange"}
            className="mb-5 flex min-h-16 items-center gap-3 border-y border-white/10 bg-white/[0.025] px-3 py-2.5 transition-colors active:bg-white/[0.06] lg:hidden"
            aria-label={`Abrir Meu Brick. Nível ${userProgress.progress.level}, ${Math.round(xpProgress)}% de progresso`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-10 shrink-0 rounded-full border border-brand-orange/40 object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-orange/15 font-heading text-sm font-black text-brand-orange" aria-hidden="true">
                {(profile?.display_name || user.email || "B").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <strong className="truncate font-heading text-sm font-bold text-white">Meu progresso</strong>
                <span className="shrink-0 text-xs font-bold text-brand-orange">Nível {userProgress.progress.level}</span>
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden bg-white/10">
                <span className="block h-full bg-brand-orange transition-[width] duration-700" style={{ width: `${xpProgress}%` }} />
              </span>
            </span>
            <svg aria-hidden="true" className="size-4 shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        )}
        {operationError && (
          <div role="alert" className="mb-5 flex items-start justify-between gap-4 border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
            <p>{operationError}</p>
            <button type="button" onClick={clearOperationError} className="min-h-8 shrink-0 px-2 font-bold text-red-200 hover:text-white" aria-label="Fechar aviso">Fechar</button>
          </div>
        )}

        {/* HERO */}
        <section className="mb-6 grid gap-4 border-b border-brand-orange/20 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-2.5 flex items-center gap-3">
              <span className="h-px w-8 bg-brand-orange" />
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand-orange">Comunidade OrangeBrick</span>
            </div>
            <h1 className="font-heading text-[clamp(2rem,7vw,4rem)] font-black leading-[0.94] tracking-[-0.03em] text-white">
              O jogo continua <span className="text-brand-orange">aqui.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">
              Opiniões, perguntas e debates da comunidade sobre as notícias que movimentam o mundo dos games.
            </p>
          </div>
          <button
            onClick={() => requireUser(() => setIsComposeOpen(true))}
            className="hidden min-h-11 items-center justify-center border border-brand-orange bg-brand-orange px-6 text-sm font-bold text-white transition-colors hover:bg-[#ff7526] lg:flex"
          >
            Abrir uma conversa
          </button>
        </section>

        {/* TABS + PLATFORM FILTERS */}
        <div className="mb-5">
          <div className="flex items-center justify-between border-b border-white/10">
            <nav className="flex items-center" aria-label="Seções do Brickboard">
              {([
                { id: "latest", label: "Recentes" },
                { id: "following", label: "Seguindo" },
                { id: "trending", label: "Top debates" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setVisiblePostCount(8); }}
                  aria-pressed={activeTab === tab.id}
                  className={`relative inline-flex min-h-11 items-center px-4 text-sm font-semibold transition-colors ${
                    activeTab === tab.id ? "text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-brand-orange" />}
                </button>
              ))}
            </nav>
            <span className="hidden pb-1 text-xs text-gray-500 sm:block">
              {displayPosts.length} {displayPosts.length === 1 ? "conversa encontrada" : "conversas encontradas"}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-0.5 overflow-x-auto border-b border-white/10 pb-2 scrollbar-none">
            {PLATFORM_TABS.map((platform) => (
              <button
                key={platform.id}
                onClick={() => { setSelectedPlatform(platform.id); setVisiblePostCount(8); }}
                aria-pressed={selectedPlatform === platform.id}
                className={`min-h-9 shrink-0 px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedPlatform === platform.id
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {platform.label} <span className="ml-1 tabular-nums text-gray-500">({platformCounts[platform.id] || 0})</span>
              </button>
            ))}
          </div>

          <p className="mt-2 text-right text-xs text-gray-500 sm:hidden">
            {displayPosts.length} {displayPosts.length === 1 ? "conversa encontrada" : "conversas encontradas"}
          </p>
        </div>

        {articleSlug && (
          <section className="mb-5 flex flex-col gap-3 border border-brand-orange/30 bg-brand-orange/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">Conversa da matéria</p>
              <h2 className="mt-1 text-balance break-words font-heading text-base font-black leading-snug text-white sm:text-lg">
                {conversationTitle || "Discussão no Brickboard"}
              </h2>
            </div>
            <Link href="/brickboard" className="inline-flex min-h-10 shrink-0 items-center justify-center border border-white/15 px-4 text-xs font-bold text-gray-200 transition-colors hover:border-white/30 hover:text-white">
              Ver toda a timeline
            </Link>
          </section>
        )}

        {targetPostId && (
          <section className="mb-5 flex items-center justify-between gap-4 border border-brand-orange/30 bg-brand-orange/[0.06] px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-brand-orange">Conversa selecionada</p>
              <p className="mt-0.5 text-sm leading-6 text-gray-300">Você chegou por um destaque da página inicial.</p>
            </div>
            <Link href="/brickboard" className="min-h-10 shrink-0 content-center text-xs font-bold text-white transition-colors hover:text-brand-orange">
              Ver timeline
            </Link>
          </section>
        )}

        {!isLoaded && (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          </div>
        )}

        {isLoaded && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">

            {/* ── FEED ── */}
            <div className="space-y-0">
              {poll && (
                <div className="mb-4 lg:hidden">
                  <GamerPollWidget poll={poll} onVote={(optionId) => requireUser(() => votePoll(optionId))} />
                </div>
              )}
              {/* Composer embutido */}
              <div className="mb-4 border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  {avatarUrl && user ? (
                    <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 aspect-square rounded-full object-cover border border-white/15 bg-[#08090C]" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = resolveAvatarUrl(null, user.email); }} />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 aspect-square items-center justify-center rounded-full border border-brand-orange/30 bg-brand-orange/20 text-brand-orange">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                  )}
                  <button
                    onClick={() => requireUser(() => setIsComposeOpen(true))}
                    className="flex-1 border border-white/10 bg-transparent px-4 py-2.5 text-left text-sm text-gray-500 transition-colors hover:border-white/20 hover:text-gray-300"
                  >
                    Compartilhe uma opinião, pergunta ou descoberta...
                  </button>
                </div>
                {inlineMediaUrl && (
                  <div className="relative mt-3 overflow-hidden rounded-xl border border-white/10 sm:ml-[48px]">
                    <img src={inlineMediaUrl} alt="Anexo" className="max-h-48 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setInlineMediaUrl(null)}
                      className="absolute right-2 top-2 rounded-full bg-black/80 p-1 text-white hover:bg-brand-orange"
                      title="Remover imagem"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-[48px]">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setInlineMediaUrl(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => requireUser(() => fileInputRef.current?.click())}
                    className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-400 transition-colors hover:border-brand-orange/40 hover:text-white"
                  >
                    <svg className="h-3.5 w-3.5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>{inlineMediaUrl ? "Alterar Imagem" : "Anexo"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => requireUser(() => setIsPollModalOpen(true))}
                    className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-400 transition-colors hover:border-brand-orange/40 hover:text-white"
                  >
                    <svg className="h-3.5 w-3.5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Enquete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => requireUser(() => setIsComposeOpen(true))}
                    className="ml-auto bg-brand-orange px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#ff7526]"
                  >
                    Publicar
                  </button>
                </div>
              </div>

              {displayPosts.length === 0 ? (
                <div className="border-y border-white/10 py-16 text-center text-gray-400 space-y-2">
                  <svg aria-hidden="true" className="mx-auto h-10 w-10 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5h-6l-4.5 4v-4h-.5A2.5 2.5 0 0 1 4 13.5v-8Z" />
                  </svg>
                  <p className="text-sm font-semibold text-white">
                    {targetPostId ? "Esta conversa não está mais disponível." : "Nenhum Brick encontrado para estes filtros."}
                  </p>
                  {!targetPostId && <p className="text-xs text-gray-400">Seja a primeira lenda a abrir o debate.</p>}
                  {!targetPostId && <button type="button" onClick={() => requireUser(() => setIsComposeOpen(true))} className="mt-4 inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-orange/90">Criar novo Brick</button>}
                  {targetPostId && (
                    <Link href="/brickboard" className="inline-flex min-h-11 items-center text-xs font-bold text-brand-orange transition-colors hover:text-white">
                      Voltar para a timeline
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {visiblePosts.map((post) => (
                    <div id={`brick-${post.id}`} key={post.id} className="scroll-mt-28">
                      <BrickCard
                        post={post}
                        onReaction={toggleReaction}
                        onDeletePost={deletePost}
                        onSharePost={sharePost}
                        onAddComment={addComment}
                        onDeleteComment={deleteComment}
                        onToggleCommentLike={toggleCommentLike}
                        getComments={getComments}
                      />
                    </div>
                  ))}
                  {visiblePostCount < displayPosts.length && (
                    <div ref={loadMoreRef} className="flex min-h-20 items-center justify-center border-t border-white/10" aria-label="Carregando mais conversas">
                      <span className="size-5 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── SIDEBAR ── */}
            <aside className="sticky top-20 hidden space-y-4 lg:block">

              {/* PERGUNTA DO DIA */}
              {poll && (
                <div className="overflow-hidden border border-white/10 bg-[#101116]">
                  <div className="flex min-h-10 items-center justify-between gap-3 bg-brand-orange/[0.12] px-4 py-2">
                    <div className="flex items-center gap-2">
<span className="grid size-5 place-items-center rounded-full bg-brand-orange text-black"><Icon name="question" size={14} /></span>
                      <span className="text-xs font-black uppercase text-brand-orange">Pergunta do dia</span>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs font-bold text-gray-300">{poll.total_votes} voto{poll.total_votes !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="p-4">
                    <p className="font-heading text-base font-black uppercase leading-snug text-white">{poll.question}</p>
                    <p className="mb-3 mt-1 text-xs text-gray-400">Resultado da comunidade:</p>
                    <div className="space-y-2">
                      {poll.options.map((option) => {
                        const pct = poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0;
                        const isSelected = poll.user_voted_option === option.id;
                        const hasVoted = poll.user_voted_option !== undefined && poll.user_voted_option !== null;
                        return (
                          <button
                            key={option.id}
                            onClick={() => requireUser(() => votePoll(option.id))}
                            disabled={isSelected}
                            className={`relative min-h-11 w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors ${
                              isSelected ? "border-brand-orange bg-brand-orange/[0.06]" : "border-white/10 bg-[#0c0d11] hover:border-brand-orange/40"
                            }`}
                          >
                            <div className="relative flex items-start gap-2.5 text-xs">
                              <span className={`mt-0.5 size-4 shrink-0 rounded-full border-2 ${isSelected ? "border-brand-orange bg-brand-orange shadow-[inset_0_0_0_3px_#0c0d11]" : "border-slate-500"}`} />
                              <span className="min-w-0 flex-1 font-semibold leading-snug text-gray-100">{option.text}</span>
                              {hasVoted && <span className={`shrink-0 font-black tabular-nums ${isSelected ? "text-brand-orange" : "text-gray-400"}`}>{pct}%</span>}
                            </div>
                            {hasVoted && <span className="relative mt-2 block h-1 overflow-hidden rounded-full bg-white/[0.07]"><span className={`block h-full rounded-full ${isSelected ? "bg-brand-orange" : "bg-slate-500"}`} style={{ width: `${pct}%` }} /></span>}
                          </button>
                        );
                      })}
                    </div>
                    {poll.ends_at && (
                      <p className="mt-3 text-xs text-gray-500">
                        Termina em {Math.max(0, Math.ceil((new Date(poll.ends_at).getTime() - now) / 3600000))}h
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* EM ALTA AGORA */}
              {trendingTopics.length > 0 && (
                <div className="overflow-hidden border border-white/10 bg-[#101116]">
                  <div className="flex min-h-10 items-center justify-between gap-3 bg-brand-orange/[0.12] px-4 py-2">
                    <span className="flex items-center gap-2 text-xs font-black uppercase text-brand-orange"><span className="grid size-5 place-items-center rounded-full bg-brand-orange text-black"><Icon name="trending-up" size={14} /></span>Em alta agora</span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs font-bold text-gray-300">Brickboard</span>
                  </div>
<div className="space-y-2 p-3">
                    {trendingTopics.map((topic, i) => (
                      <button
                        key={topic.name}
                        type="button"
                        onClick={() => { setSelectedPlatform(topic.name); setVisiblePostCount(8); }}
                        aria-label={`Filtrar conversas da plataforma ${topic.name}`}
                        className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0c0d11] p-2.5 text-left transition-colors hover:border-brand-orange/40"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-slate-600 font-heading text-xs font-black text-gray-300 group-hover:border-brand-orange group-hover:text-brand-orange">{String(i + 1).padStart(2, "0")}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-heading text-sm font-bold text-white group-hover:text-brand-orange">{topic.name}</span>
                          <span className="mt-1 block text-xs text-gray-500">{topic.count} resposta{topic.count !== 1 ? "s" : ""}</span>
                        </span>
                        <span className="text-gray-600 group-hover:text-brand-orange">→</span>
                      </button>
))}
                  </div>
                </div>
              )}

            </aside>
          </div>
        )}
      </main>

      <button
        onClick={() => requireUser(() => setIsComposeOpen(true))}
        className="mobile-overlay-sensitive fixed right-3 bottom-[calc(8.25rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/20 bg-brand-orange text-xl text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-[opacity,transform,bottom] active:scale-95 sm:hidden"
        title="Criar novo Brick"
        aria-label="Criar novo Brick"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <ComposeBrickModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setPreAttachedArticle(null);
          if (searchParams.get("attach")) {
            router.replace("/brickboard");
          }
        }}
        onPublish={(content, tag, article, media) => {
          addPost(content, tag, article, media || inlineMediaUrl || undefined);
          setInlineMediaUrl(null);
        }}
        initialArticle={preAttachedArticle}
      />

      <CreatePollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onPublishPoll={(question, options) => {
          addPost(question, undefined, undefined, undefined, options);
        }}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <Footer />
      <BackToTop />
    </>
  );
}

export default function BrickboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background-void">
          <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        </div>
      }
    >
      <BrickboardContent />
    </Suspense>
  );
}
