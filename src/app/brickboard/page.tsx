"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { BrickCard } from "@/components/community/BrickCard";
import { GamerPollWidget } from "@/components/community/GamerPollWidget";
import { ComposeBrickModal } from "@/components/community/ComposeBrickModal";
import type { AttachedArticle } from "@/lib/types/community";
import { UserNav } from "@/components/auth/UserNav";
import { Footer } from "@/components/ui/Footer";
import { BookmarkDrawer } from "@/components/ui/BookmarkDrawer";

function BrickboardContent() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const { posts, poll, isLoaded, addPost, deletePost, sharePost, toggleReaction, votePoll, addComment, deleteComment, toggleCommentLike, getComments } = useCommunityFeed();

  const [activeTab, setActiveTab] = useState<"hype" | "latest" | "polls">("hype");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("TODOS");
  const [preAttachedArticle, setPreAttachedArticle] = useState<AttachedArticle | null>(null);

  useEffect(() => {
    const attachSlug = searchParams.get("attach");
    const title = searchParams.get("title");
    const summary = searchParams.get("summary");
    const img = searchParams.get("img");
    const cat = searchParams.get("cat");

    if (attachSlug && title) {
      setPreAttachedArticle({
        id: attachSlug,
        slug: attachSlug,
        title,
        summary: summary || "",
        image_url: img || null,
        category: cat || "industry",
      });
      setIsComposeOpen(true);
    }
  }, [searchParams]);

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
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              style={{ maxHeight: "32px", maxWidth: "44px", width: "auto", height: "auto" }}
              className="h-7 sm:h-8 w-auto max-h-8 object-contain transform group-hover:scale-105 transition-transform shrink-0"
            />
            <span className="text-base sm:text-lg font-heading font-extrabold text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsBookmarkOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-card-slate/60 border border-brand-orange-muted/15 text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1"
              title="Ver matérias salvas"
            >
              <span>🔖</span>
              <span className="hidden sm:inline font-subtitle font-bold">Salvos</span>
            </button>

            <Link
              href="/"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-brand-orange-muted/15 text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 font-subtitle font-bold"
            >
              <span>←</span>
              <span className="hidden sm:inline">Portal</span>
            </Link>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="hidden sm:flex items-center gap-1 px-4 py-1.5 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-subtitle text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              + Criar Brick
            </button>

            <UserNav />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6 min-h-dvh">
        <div className="border-b border-brand-orange-muted/20 bg-background-void/90 sticky top-12 z-20">
          <nav className="flex items-center justify-around font-subtitle text-xs sm:text-sm font-bold">
            <button
              onClick={() => setActiveTab("hype")}
              className={`flex-1 py-3 text-center transition-all cursor-pointer relative ${
                activeTab === "hype"
                  ? "text-brand-orange font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🔥 Em Alta
              {activeTab === "hype" && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-brand-orange rounded-full shadow-[0_0_8px_#FF5E00]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("latest")}
              className={`flex-1 py-3 text-center transition-all cursor-pointer relative ${
                activeTab === "latest"
                  ? "text-brand-orange font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ⚡ Recentes
              {activeTab === "latest" && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-brand-orange rounded-full shadow-[0_0_8px_#FF5E00]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              className={`flex-1 py-3 text-center transition-all cursor-pointer relative ${
                activeTab === "polls"
                  ? "text-brand-orange font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              📊 Enquetes
              {activeTab === "polls" && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-brand-orange rounded-full shadow-[0_0_8px_#FF5E00]" />
              )}
            </button>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card-slate/40 border border-brand-orange-muted/15 p-2.5 rounded-xl">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {["TODOS", "[PS5]", "[XSX]", "[SWITCH 2]", "[PC]", "[MOBILE]"].map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-subtitle font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  selectedPlatform === platform
                    ? "bg-brand-orange/20 text-brand-orange border-brand-orange/50 shadow-[0_0_8px_rgba(255,94,0,0.2)]"
                    : "bg-background-void/60 text-gray-400 border-brand-orange-muted/15 hover:text-white"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar Bricks..."
              className="w-full bg-background-void border border-brand-orange-muted/15 focus:border-brand-orange/50 px-3 py-1.5 text-xs font-body text-white placeholder-gray-500 rounded-lg outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
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
        className="fixed bottom-5 right-4 z-40 sm:hidden w-13 h-13 bg-brand-orange text-white text-xl rounded-full shadow-[0_0_20px_rgba(255,94,0,0.5)] flex items-center justify-center border-2 border-white/20 active:scale-95 transition-transform cursor-pointer"
        title="Criar novo Brick"
      >
        ✍️
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

      <BookmarkDrawer
        isOpen={isBookmarkOpen}
        onClose={() => setIsBookmarkOpen(false)}
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
