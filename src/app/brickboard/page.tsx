"use client";

import { useState, Suspense } from "react";
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

  const { posts, poll, isLoaded, addPost, deletePost, sharePost, toggleReaction, votePoll, addComment, deleteComment, toggleCommentLike, getComments } = useCommunityFeed();

  const [activeTab, setActiveTab] = useState<"hype" | "latest" | "polls">("hype");
  const attachSlug = searchParams.get("attach");
  const attachTitle = searchParams.get("title");
  const [isComposeOpen, setIsComposeOpen] = useState(Boolean(attachSlug && attachTitle));
  const [searchQuery, setSearchQuery] = useState("");
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

    return matchesSearch && matchesPlatform;
  });

  const displayPosts = [...filteredPosts].sort((a, b) => {
    if (activeTab === "hype") {
      const hypeA = (a.reactions.hype || 0) + (a.reactions.salty || 0);
      const hypeB = (b.reactions.hype || 0) + (b.reactions.salty || 0);
      return hypeB - hypeA;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <>
      <header className="sticky top-0 z-30 bg-background-void/95 backdrop-blur-md border-b border-brand-orange-muted/15 py-2">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
          <Link href="/" className="group flex min-h-11 min-w-0 shrink items-center gap-2">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              style={{ maxHeight: "32px", maxWidth: "44px", width: "auto", height: "auto" }}
              className="h-7 sm:h-8 w-auto max-h-8 object-contain transform group-hover:scale-105 transition-transform shrink-0"
            />
            <span className="hidden text-base font-heading font-extrabold uppercase tracking-wider text-white transition-colors group-hover:text-brand-orange xs:inline sm:text-lg">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              aria-label="Voltar ao portal"
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-brand-orange-muted/15 px-2 text-xs font-bold text-gray-400 transition-colors hover:text-white sm:px-3"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Portal</span>
            </Link>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="hidden min-h-11 items-center gap-1 whitespace-nowrap rounded-xl bg-brand-orange px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-orange/90 sm:flex"
            >
              + Criar Brick
            </button>

            <UserNav />
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-dvh w-full min-w-0 max-w-5xl space-y-4 px-2 py-3 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
        <div className="border-b border-brand-orange-muted/20 bg-background-void/90 sticky top-12 z-20">
          <nav className="flex min-w-0 items-center justify-around text-xs font-bold tracking-wide sm:text-sm sm:tracking-wider">
            <button
              onClick={() => setActiveTab("hype")}
              className={`relative min-h-11 min-w-0 flex-1 px-1 py-3 text-center uppercase transition-all cursor-pointer ${
                activeTab === "hype"
                  ? "text-brand-orange font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Em Alta
              {activeTab === "hype" && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-brand-orange rounded-full shadow-[0_0_8px_#FF5E00]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("latest")}
              className={`relative min-h-11 min-w-0 flex-1 px-1 py-3 text-center uppercase transition-all cursor-pointer ${
                activeTab === "latest"
                  ? "text-brand-orange font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Recentes
              {activeTab === "latest" && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-brand-orange rounded-full shadow-[0_0_8px_#FF5E00]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              className={`relative min-h-11 min-w-0 flex-1 px-1 py-3 text-center uppercase transition-all cursor-pointer ${
                activeTab === "polls"
                  ? "text-brand-orange font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Enquetes
              {activeTab === "polls" && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-brand-orange rounded-full shadow-[0_0_8px_#FF5E00]" />
              )}
            </button>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card-slate/40 border border-brand-orange-muted/15 p-2.5 rounded-xl">
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none sm:pb-0">
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
                className={`min-h-11 min-w-11 shrink-0 rounded-full border px-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedPlatform === platform.id
                    ? "bg-brand-orange/20 text-brand-orange border-brand-orange/50 shadow-sm"
                    : "bg-background-void/60 text-gray-300 border-brand-orange-muted/15 hover:text-white hover:border-brand-orange/30"
                }`}
              >
                {platform.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar Bricks..."
              className="min-h-11 w-full rounded-xl border border-brand-orange-muted/15 bg-background-void px-3 pr-11 text-xs text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-orange/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Limpar busca"
                className="absolute right-0 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-xs text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {displayPosts.length === 0 ? (
                <div className="bg-card-slate/40 border border-brand-orange-muted/15 rounded-xl p-8 text-center text-gray-400 space-y-2">
                  <span className="text-2xl block">🔍</span>
                  <p className="text-xs font-subtitle">Nenhum Brick encontrado para estes filtros.</p>
                </div>
              ) : (
                displayPosts.map((post) => (
                  <BrickCard
                    key={post.id}
                    post={post}
                    onReaction={toggleReaction}
                    onDeletePost={deletePost}
                    onSharePost={sharePost}
                    onAddComment={addComment}
                    onDeleteComment={deleteComment}
                    onToggleCommentLike={toggleCommentLike}
                    getComments={getComments}
                  />
                ))
              )}
            </div>

            <div className="space-y-4 sticky top-24 hidden lg:block">
              {poll && <GamerPollWidget poll={poll} onVote={votePoll} />}

              <div className="bg-card-slate/40 border border-brand-orange-muted/15 rounded-xl p-4 shadow-lg space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-orange-muted/10">
                  <span className="text-base">💬</span>
                  <h4 className="font-subtitle text-xs font-bold text-white uppercase tracking-wider">
                    Regras da Comunidade
                  </h4>
                </div>
                <ul className="text-[11px] text-gray-400 font-body space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Respeito total aos outros leitores.</li>
                  <li>Sem console wars tóxicas.</li>
                  <li>Use as tags para categorizar seu post.</li>
                  <li>Sem spoilers sem aviso.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <button
        onClick={() => setIsComposeOpen(true)}
        className="mobile-overlay-sensitive fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/20 bg-brand-orange text-xl text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-[opacity,transform,bottom] active:scale-95 sm:hidden"
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
