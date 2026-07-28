"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { BrickCard } from "@/components/community/BrickCard";
import { GamerPollWidget } from "@/components/community/GamerPollWidget";
import { ComposeBrickModal } from "@/components/community/ComposeBrickModal";
import type { AttachedArticle } from "@/lib/types/community";
import { UserNav } from "@/components/auth/UserNav";
import { Footer } from "@/components/ui/Footer";
import { useAuth } from "@/lib/contexts/AuthContext";
import { createDataClient } from "@/lib/supabase/client";
import { formatXp, levelProgress } from "@/lib/progression";
import { resolveAvatarUrl } from "@/lib/avatar";
import type { PrivateProgressData } from "@/lib/types/progression";

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
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [userProgress, setUserProgress] = useState<PrivateProgressData | null>(null);
  const [renderTimestamp] = useState(() => Date.now());

  const { posts, poll, isLoaded, operationError, clearOperationError, addPost, deletePost, sharePost, toggleReaction, votePoll, addComment, deleteComment, toggleCommentLike, getComments } = useCommunityFeed();

  const [activeTab, setActiveTab] = useState<"latest" | "following" | "trending" | "polls">("latest");
  const articleSlug = searchParams.get("article");
  const topicId = searchParams.get("topic");
  const targetPostId = searchParams.get("post");
  const attachSlug = searchParams.get("attach");
  const attachTitle = searchParams.get("title");
  const [isComposeOpen, setIsComposeOpen] = useState(Boolean(attachSlug && attachTitle));
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

  const displayPosts = [...filteredPosts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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
    if (!posts.length) return [];
    const counts: Record<string, number> = {};
    posts.forEach((post) => {
      const key = post.platform_tag || (post.attached_article?.title ? post.attached_article.title.split(" ").slice(0, 3).join(" ") : null);
      if (key) counts[key] = (counts[key] || 0) + (post.comments_count ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [posts]);

  const xpProgress = userProgress ? levelProgress(userProgress.progress.lifetime_xp, userProgress.progress.level) : 0;
  const nextLevelXp = userProgress ? Math.ceil(userProgress.progress.lifetime_xp / xpProgress * 100) : 500;
  const avatarUrl = user ? resolveAvatarUrl(user.user_metadata?.avatar_url || null, user.user_metadata?.full_name || "?") : "";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0e12]/95 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-h-11 shrink-0 items-center gap-2.5">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              style={{ maxHeight: "32px", maxWidth: "44px", width: "auto", height: "auto" }}
              className="h-8 w-auto shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="hidden whitespace-nowrap font-heading text-lg font-extrabold uppercase tracking-wider text-white transition-colors group-hover:text-brand-orange sm:inline">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>

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
                onChange={(event) => setSearchQuery(event.target.value)}
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
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-orange">Comunidade OrangeBrick</span>
            </div>
            <h1 className="font-heading text-[clamp(2rem,7vw,4rem)] font-black leading-[0.94] tracking-[-0.03em] text-white">
              O jogo continua <span className="text-brand-orange">aqui.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">
              Opiniões, perguntas e debates da comunidade sobre as notícias que movimentam o mundo dos games.
            </p>
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
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
                { id: "trending", label: "Em alta" },
                { id: "polls", label: "Pergunta do dia" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                  className={`relative min-h-11 px-4 text-sm font-semibold transition-colors ${
                    activeTab === tab.id ? "text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-brand-orange" />}
                </button>
              ))}
            </nav>
            <span className="pb-1 text-xs text-gray-500">
              {displayPosts.length} {displayPosts.length === 1 ? "conversa encontrada" : "conversas encontradas"}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-0.5 overflow-x-auto border-b border-white/10 pb-2 scrollbar-none">
            {PLATFORM_TABS.map((platform) => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                aria-pressed={selectedPlatform === platform.id}
                className={`min-h-9 shrink-0 px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedPlatform === platform.id
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {platform.label}
              </button>
            ))}
          </div>
        </div>

        {articleSlug && (
          <section className="mb-5 flex flex-col gap-3 border border-brand-orange/30 bg-brand-orange/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">Conversa da matéria</p>
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

        {isLoaded && activeTab === "polls" && poll && (
          <div className="max-w-xl">
            <GamerPollWidget poll={poll} onVote={votePoll} />
          </div>
        )}

        {isLoaded && activeTab !== "polls" && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">

            {/* ── FEED ── */}
            <div className="space-y-0">
              {/* Composer embutido */}
              <div className="mb-4 border border-white/10 bg-white/[0.02] p-4">
                <div className="flex gap-3">
                  {avatarUrl && user ? (
                    <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-brand-orange/20 text-brand-orange">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                  )}
                  <button
                    onClick={() => setIsComposeOpen(true)}
                    className="flex-1 border border-white/10 bg-transparent px-4 py-2.5 text-left text-sm text-gray-500 transition-colors hover:border-white/20 hover:text-gray-300"
                  >
                    Compartilhe uma opinião, pergunta ou descoberta...
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 pl-11">
                  <button onClick={() => setIsComposeOpen(true)} className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-gray-400 transition-colors hover:border-white/20 hover:text-white">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Imagem
                  </button>
                  <button onClick={() => setIsComposeOpen(true)} className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-gray-400 transition-colors hover:border-white/20 hover:text-white">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Link
                  </button>
                  <button onClick={() => setIsComposeOpen(true)} className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-gray-400 transition-colors hover:border-white/20 hover:text-white">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Enquete
                  </button>
                  <button onClick={() => setIsComposeOpen(true)} className="ml-auto bg-brand-orange px-4 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#ff7526]">
                    Publicar
                  </button>
                </div>
              </div>

              {displayPosts.length === 0 ? (
                <div className="border-y border-white/10 py-16 text-center text-gray-400 space-y-2">
                  <svg aria-hidden="true" className="mx-auto h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
                  </svg>
                  <p className="text-xs">
                    {targetPostId ? "Esta conversa não está mais disponível." : "Nenhum Brick encontrado para estes filtros."}
                  </p>
                  {targetPostId && (
                    <Link href="/brickboard" className="inline-flex min-h-11 items-center text-xs font-bold text-brand-orange transition-colors hover:text-white">
                      Voltar para a timeline
                    </Link>
                  )}
                </div>
              ) : (
                displayPosts.map((post) => (
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
                ))
              )}
            </div>

            {/* ── SIDEBAR ── */}
            <aside className="sticky top-20 hidden space-y-4 lg:block">

              {/* PERGUNTA DO DIA */}
              {poll && (
                <div className="border border-white/10 bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-orange">Pergunta do dia</span>
                    </div>
                    <span className="text-[11px] text-gray-500">{poll.total_votes} participações</span>
                  </div>
                  <div className="p-4">
                    <p className="mb-4 text-sm font-bold text-white leading-snug">{poll.question}</p>
                    <div className="space-y-2">
                      {poll.options.map((option) => {
                        const pct = poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0;
                        const isSelected = poll.user_voted_option === option.id;
                        const hasVoted = poll.user_voted_option !== undefined && poll.user_voted_option !== null;
                        return (
                          <button
                            key={option.id}
                            onClick={() => votePoll(option.id)}
                            disabled={isSelected}
                            className={`relative w-full overflow-hidden border px-3 py-2.5 text-left transition-colors ${
                              isSelected ? "border-brand-orange/60 bg-brand-orange/10" : "border-white/10 bg-transparent hover:border-white/20"
                            }`}
                          >
                            {hasVoted && (
                              <div className="absolute inset-y-0 left-0 bg-white/5 transition-all duration-700" style={{ width: `${pct}%` }} />
                            )}
                            <div className="relative flex items-center justify-between gap-2 text-xs">
                              <span className={isSelected ? "font-semibold text-white" : "text-gray-300"}>{option.text}</span>
                              {hasVoted && <span className={`font-bold tabular-nums shrink-0 ${isSelected ? "text-brand-orange" : "text-gray-500"}`}>{pct}%</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {poll.ends_at && (
                      <p className="mt-3 text-[11px] text-gray-600">
                        Termina em {Math.max(0, Math.ceil((new Date(poll.ends_at).getTime() - renderTimestamp) / 3600000))}h
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* EM ALTA AGORA */}
              {trendingTopics.length > 0 && (
                <div className="border border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <svg className="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-orange">Em alta agora</span>
                  </div>
                  <div className="divide-y divide-white/10 px-4">
                    {trendingTopics.map((topic, i) => (
                      <div key={topic.name} className="flex items-center gap-3 py-3">
                        <span className="w-4 shrink-0 text-center text-sm font-black text-brand-orange">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{topic.name}</p>
                          <p className="text-[11px] text-gray-500">{topic.count} resposta{topic.count !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUA MARCA NO BRICKBOARD */}
              <div className="border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <svg className="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white">Sua marca no Brickboard</span>
                </div>
                {user && userProgress ? (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-brand-orange/10 border border-brand-orange/30">
                        <svg className="h-6 w-6 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white">Nível {userProgress.progress.level}</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden bg-white/10">
                          <div className="h-full bg-brand-orange transition-[width] duration-700" style={{ width: `${xpProgress}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {formatXp(userProgress.progress.lifetime_xp)} / {formatXp(nextLevelXp)} XP
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/brickboard/ranking" className="flex flex-col items-center gap-1 border border-white/10 py-3 text-center transition-colors hover:border-white/20">
                        <span className="font-heading text-xl font-black text-white">#—</span>
                        <span className="text-[10px] text-gray-500">Ranking geral</span>
                      </Link>
                      <Link href="/brickboard/conquistas" className="flex flex-col items-center gap-1 border border-white/10 py-3 text-center transition-colors hover:border-white/20">
                        <span className="font-heading text-xl font-black text-white">{userProgress.rewards?.length ?? 0}</span>
                        <span className="text-[10px] text-gray-500">Conquistas</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    <div className="divide-y divide-white/10">
                      <Link href="/brickboard/ranking" className="flex min-h-10 items-center justify-between text-xs font-semibold text-gray-300 hover:text-white">
                        Ranking <span className="text-brand-orange">→</span>
                      </Link>
                      <Link href="/brickboard/conquistas" className="flex min-h-10 items-center justify-between text-xs font-semibold text-gray-300 hover:text-white">
                        Conquistas <span className="text-brand-orange">→</span>
                      </Link>
                      <Link href="/brickboard/como-funciona" className="flex min-h-10 items-center justify-between text-xs font-semibold text-gray-300 hover:text-white">
                        Como funciona <span className="text-brand-orange">→</span>
                      </Link>
                    </div>
                  </div>
                )}
                <div className="border-t border-white/10 px-4 py-3">
                  <Link href="/brickboard/como-funciona" className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-white transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    Regras da comunidade e boas práticas →
                  </Link>
                </div>
              </div>

            </aside>
          </div>
        )}
      </main>

      <button
        onClick={() => setIsComposeOpen(true)}
        className="mobile-overlay-sensitive fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/20 bg-brand-orange text-xl text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-[opacity,transform,bottom] active:scale-95 sm:hidden"
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
        onPublish={addPost}
        initialArticle={preAttachedArticle}
      />

      <Footer />
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
