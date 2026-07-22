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

function BrickboardContent() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const { posts, poll, isLoaded, addPost, deletePost, toggleReaction, votePoll, addComment, deleteComment, getComments } = useCommunityFeed();

  const [activeTab, setActiveTab] = useState<"hype" | "latest" | "polls">("hype");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [preAttachedArticle, setPreAttachedArticle] = useState<AttachedArticle | null>(null);

  // Check URL params for pre-attached article from "Discutir no Brickboard"
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

  // Sort posts by tab
  const displayPosts = [...posts].sort((a, b) => {
    if (activeTab === "hype") {
      const hypeA = (a.reactions.hype || 0) + (a.reactions.salty || 0);
      const hypeB = (b.reactions.hype || 0) + (b.reactions.salty || 0);
      return hypeB - hypeA;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <>
      <header className="sticky top-0 z-30 bg-background-void/90 backdrop-blur-md border-b border-brand-orange-muted/10 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              className="h-8 sm:h-9 w-auto max-h-9 object-contain transform group-hover:scale-[1.05] transition-transform duration-300 shrink-0"
            />
            <span className="hidden sm:inline text-lg sm:text-xl font-heading font-extrabold text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="text-xs font-subtitle font-bold text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-xl border border-brand-orange-muted/15"
            >
              ← Voltar ao Portal
            </Link>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-subtitle text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-[0_0_15px_rgba(255,94,0,0.3)] transition-all cursor-pointer whitespace-nowrap"
            >
              + Criar Brick
            </button>

            <UserNav />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-dvh">
        {/* BANNER PRINCIPAL DO BRICKBOARD */}
        <div className="relative rounded-2xl border border-brand-orange/30 bg-gradient-to-r from-card-slate via-background-void to-card-slate p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-orange animate-ping" />
                <span className="text-xs font-subtitle font-bold text-brand-orange uppercase tracking-widest">
                  Rede Social Gamer
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-white uppercase tracking-wider">
                Brickboard <span className="text-brand-orange">Comunidade</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 font-body mt-1 max-w-2xl leading-relaxed">
                O espaço livre para os leitores do Orange Brick soltarem o verbo, debaterem lançamentos, postarem prints e votarem nas enquetes do mercado.
              </p>
            </div>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="shrink-0 px-6 py-3 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-subtitle text-xs font-bold uppercase tracking-wider shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              ✍️ Publicar sua Opinião
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center justify-between border-b border-brand-orange-muted/15 pb-2 overflow-x-auto scrollbar-none">
          <nav className="flex items-center gap-2 font-subtitle text-xs font-bold">
            <button
              onClick={() => setActiveTab("hype")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "hype"
                  ? "bg-brand-orange/20 text-brand-orange border border-brand-orange/40 shadow-[0_0_12px_rgba(255,94,0,0.15)]"
                  : "text-gray-400 hover:text-white hover:bg-card-slate/50"
              }`}
            >
              🔥 Em Alta (Mais Hypados)
            </button>
            <button
              onClick={() => setActiveTab("latest")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "latest"
                  ? "bg-brand-orange/20 text-brand-orange border border-brand-orange/40 shadow-[0_0_12px_rgba(255,94,0,0.15)]"
                  : "text-gray-400 hover:text-white hover:bg-card-slate/50"
              }`}
            >
              ⚡ Notícias & Takes Recentes
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "polls"
                  ? "bg-brand-orange/20 text-brand-orange border border-brand-orange/40 shadow-[0_0_12px_rgba(255,94,0,0.15)]"
                  : "text-gray-400 hover:text-white hover:bg-card-slate/50"
              }`}
            >
              📊 Enquetes da Comunidade
            </button>
          </nav>

          <span className="text-[11px] font-subtitle text-gray-500 hidden sm:inline-block">
            {posts.length} Bricks publicados
          </span>
        </div>

        {/* CONTEÚDO PRINCIPAL DA ABA */}
        {!isLoaded && (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          </div>
        )}

        {isLoaded && activeTab === "polls" && poll && (
          <div className="space-y-6">
            <GamerPollWidget poll={poll} onVote={votePoll} />
          </div>
        )}

        {isLoaded && activeTab !== "polls" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* ESQUERDA: FEED DE BRICKS (2 COLUNAS) */}
            <div className="lg:col-span-2 space-y-6">
              {displayPosts.map((post) => (
                <BrickCard key={post.id} post={post} onReaction={toggleReaction} onDeletePost={deletePost} onAddComment={addComment} onDeleteComment={deleteComment} getComments={getComments} />
              ))}
            </div>

            {/* DIREITA: ENQUETE & DEBATES SIDEBAR (1 COLUNA) */}
            <div className="space-y-6 sticky top-20">
              {poll && <GamerPollWidget poll={poll} onVote={votePoll} />}

              <div className="bg-card-slate/40 border border-brand-orange-muted/15 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-orange-muted/10">
                  <span className="text-base">💬</span>
                  <h4 className="font-subtitle text-xs font-bold text-white uppercase tracking-wider">
                    Regras da Comunidade
                  </h4>
                </div>
                <ul className="text-xs text-gray-400 font-body space-y-2 list-disc list-inside leading-relaxed">
                  <li>Respeito total aos outros jogadores.</li>
                  <li>Sem console wars tóxicas ou ofensas.</li>
                  <li>Use as tags de plataforma para organizar o feed.</li>
                  <li>Evite spoilers de jogos sem avisar.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

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
