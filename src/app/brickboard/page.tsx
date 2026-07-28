"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { BrickCard } from "@/components/community/BrickCard";
import { GamerPollWidget } from "@/components/community/GamerPollWidget";
import { ComposeBrickModal } from "@/components/community/ComposeBrickModal";
import type { AttachedArticle } from "@/lib/types/community";
import { UserNav } from "@/components/auth/UserNav";
import { Footer } from "@/components/ui/Footer";

function BrickboardContent() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const { posts, poll, isLoaded, operationError, clearOperationError, addPost, deletePost, sharePost, toggleReaction, votePoll, addComment, deleteComment, toggleCommentLike, getComments } = useCommunityFeed();

  const [activeTab, setActiveTab] = useState<"latest" | "polls">("latest");
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

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-brand-orange-muted/10 bg-[#0d0e12]/95 py-2 backdrop-blur-md sm:static sm:bg-card-slate/10 sm:py-4 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 sm:flex-nowrap sm:gap-6 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-h-11 min-w-0 shrink-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-brand-orange sm:gap-3">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              style={{ maxHeight: "36px", maxWidth: "48px", width: "auto", height: "auto" }}
              className="h-8 w-auto shrink-0 object-contain transition-transform duration-300 group-hover:scale-[1.05] sm:h-9"
            />
            <span className="hidden whitespace-nowrap font-heading text-xl font-extrabold uppercase tracking-wider text-white transition-colors duration-300 group-hover:text-brand-orange sm:inline sm:text-2xl">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>

          <div className="order-3 w-full min-w-0 flex-none sm:order-none sm:mx-6 sm:flex-1 sm:max-w-xl">
            <label htmlFor="brickboard-search" className="sr-only">Buscar conversas</label>
            <div className="relative">
              <svg aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="brickboard-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar conversas e leitores..."
                className="min-h-11 w-full rounded-xl border border-brand-orange-muted/20 bg-background-void/90 px-10 text-xs text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-orange/60 focus:ring-1 focus:ring-brand-orange/30 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              href="/"
              aria-label="Voltar ao portal"
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-300 transition-colors hover:border-brand-orange/40 hover:text-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Portal</span>
            </Link>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="hidden min-h-11 items-center gap-1 whitespace-nowrap rounded-xl bg-brand-orange px-4 text-xs font-bold text-white transition-colors hover:bg-[#ff7526] sm:flex"
            >
              Criar Brick
            </button>

            <UserNav />
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-dvh w-full min-w-0 max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        {operationError && (
          <div role="alert" className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
            <p>{operationError}</p>
            <button type="button" onClick={clearOperationError} className="min-h-8 shrink-0 px-2 font-bold text-red-200 hover:text-white" aria-label="Fechar aviso">Fechar</button>
          </div>
        )}
        <section className="mb-8 grid gap-5 border-b border-brand-orange/20 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px w-8 bg-brand-orange" />
              <span className="font-subtitle text-xs font-bold text-brand-orange">Comunidade Orange Brick</span>
            </div>
            <h1 className="font-heading text-[clamp(2.25rem,8vw,4.75rem)] font-black leading-[0.94] tracking-[-0.03em] text-white">
              O jogo continua <span className="text-brand-orange">aqui.</span>
            </h1>
            <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-gray-300 sm:text-base">
              Opiniões, perguntas e debates da comunidade sobre as notícias que movimentam o mundo dos games.
            </p>
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="hidden min-h-11 items-center justify-center rounded-xl border border-brand-orange bg-brand-orange px-5 text-sm font-bold text-white transition-colors hover:bg-[#ff7526] lg:flex"
          >
            Abrir uma conversa
          </button>
        </section>

        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <nav className="flex min-w-0 items-center text-sm font-bold" aria-label="Seções do Brickboard">
            <button
              onClick={() => setActiveTab("latest")}
              aria-pressed={activeTab === "latest"}
              className={`relative min-h-11 px-4 py-3 transition-colors ${
                activeTab === "latest"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-200"
              }`}
            >
              Recentes
              {activeTab === "latest" && (
                <span className="absolute inset-x-4 -bottom-px h-0.5 bg-brand-orange" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              aria-pressed={activeTab === "polls"}
              className={`relative min-h-11 px-4 py-3 transition-colors ${
                activeTab === "polls"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-200"
              }`}
            >
              Pergunta do dia
              {activeTab === "polls" && (
                <span className="absolute inset-x-4 -bottom-px h-0.5 bg-brand-orange" />
              )}
            </button>
          </nav>
          <p className="hidden pb-3 text-xs text-gray-500 sm:block">
            {displayPosts.length} {displayPosts.length === 1 ? "conversa encontrada" : "conversas encontradas"}
          </p>
        </div>

        {articleSlug && (
          <section className="flex flex-col gap-3 border-y border-brand-orange/30 bg-brand-orange/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
                Conversa da matéria
              </p>
              <h2 className="mt-1 text-balance break-words font-heading text-base font-black leading-snug text-white sm:text-lg">
                {conversationTitle || "Discussão no Brickboard"}
              </h2>
            </div>
            <Link
              href="/brickboard"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-white/15 px-4 text-xs font-bold text-gray-200 transition-colors hover:border-white/30 hover:text-white"
            >
              Ver toda a timeline
            </Link>
          </section>
        )}

        {targetPostId && (
          <section className="flex items-center justify-between gap-4 border-y border-brand-orange/30 bg-brand-orange/[0.06] px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-brand-orange">Conversa selecionada</p>
              <p className="mt-1 text-sm leading-6 text-gray-300">Você chegou por um destaque da página inicial.</p>
            </div>
            <Link
              href="/brickboard"
              className="min-h-11 shrink-0 content-center text-xs font-bold text-white transition-colors hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              Ver timeline
            </Link>
          </section>
        )}

        <div className="mb-8 flex min-w-0 items-center gap-1 overflow-x-auto border-b border-white/10 pb-3 scrollbar-none">
          <span className="mr-2 shrink-0 text-xs font-bold text-gray-500">Plataforma</span>
            {[
              { id: "TODOS", label: "Todos" },
              { id: "[PS5]", label: "PS5" },
              { id: "[XSX]", label: "Xbox Series" },
              { id: "[SWITCH 2]", label: "Switch 2" },
              { id: "[PC]", label: "PC" },
              { id: "[MOBILE]", label: "Mobile" },
            ].map((platform) => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                aria-pressed={selectedPlatform === platform.id}
                className={`min-h-10 shrink-0 border-b px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedPlatform === platform.id
                    ? "border-brand-orange text-white"
                    : "border-transparent text-gray-500 hover:border-white/20 hover:text-gray-200"
                }`}
              >
                {platform.label}
              </button>
            ))}
        </div>

        {!isLoaded && (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          </div>
        )}

        {isLoaded && activeTab === "polls" && poll && (
          <div className="space-y-6">
            <GamerPollWidget poll={poll} onVote={votePoll} />
          </div>
        )}

        {isLoaded && activeTab !== "polls" && (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {displayPosts.length === 0 ? (
                <div className="border-y border-white/10 py-16 text-center text-gray-400 space-y-2">
                  <svg aria-hidden="true" className="mx-auto h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
                  </svg>
                  <p className="text-xs font-subtitle">
                    {targetPostId
                      ? "Esta conversa não está mais disponível."
                      : "Nenhum Brick encontrado para estes filtros."}
                  </p>
                  {targetPostId && (
                    <Link
                      href="/brickboard"
                      className="inline-flex min-h-11 items-center text-xs font-bold text-brand-orange transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
                    >
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

            <aside className="sticky top-6 hidden space-y-6 lg:block">
              {poll && <GamerPollWidget poll={poll} onVote={votePoll} />}

              <nav className="border-t border-brand-orange/40 pt-4" aria-label="Progressão do Brickboard">
                <h2 className="font-heading text-base font-bold text-white">Sua marca no Brickboard</h2>
                <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
                  <Link href="/brickboard/ranking" className="flex min-h-12 items-center justify-between text-xs font-bold text-gray-300 hover:text-white">
                    Ranking <span className="text-brand-orange">→</span>
                  </Link>
                  <Link href="/brickboard/conquistas" className="flex min-h-12 items-center justify-between text-xs font-bold text-gray-300 hover:text-white">
                    Conquistas <span className="text-brand-orange">→</span>
                  </Link>
                  <Link href="/brickboard/como-funciona" className="flex min-h-12 items-center justify-between text-xs font-bold text-gray-300 hover:text-white">
                    Como funciona <span className="text-brand-orange">→</span>
                  </Link>
                </div>
              </nav>

              <div className="border-t border-brand-orange/40 pt-4">
                <div className="border-b border-white/10 pb-3">
                  <h4 className="font-heading text-base font-bold text-white">
                    Antes de publicar
                  </h4>
                </div>
                <ul className="mt-3 space-y-2 font-body text-xs leading-relaxed text-gray-400">
                  <li>Respeito total aos outros leitores.</li>
                  <li>Sem guerras de console tóxicas.</li>
                  <li>Use as tags para categorizar seu post.</li>
                  <li>Sem spoilers sem aviso.</li>
                </ul>
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
