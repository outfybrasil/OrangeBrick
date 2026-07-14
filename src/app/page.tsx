"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { MultimediaSection } from "@/components/feed/MultimediaSection";
import { Footer } from "@/components/ui/Footer";
import type { PostCategory } from "@/lib/types/database";

const CATEGORIES: { value: PostCategory | null; label: string; hoverColor: string }[] = [
  { value: null, label: "Tudo", hoverColor: "hover:text-brand-orange" },
  { value: "breaking", label: "Breaking", hoverColor: "hover:text-accent-blue" },
  { value: "review", label: "Reviews", hoverColor: "hover:text-green-400" },
  { value: "hardware", label: "Hardware", hoverColor: "hover:text-brand-orange" },
  { value: "opinion", label: "Opinião", hoverColor: "hover:text-yellow-400" },
  { value: "industry", label: "Indústria", hoverColor: "hover:text-gray-300" },
  { value: "modding", label: "Modding", hoverColor: "hover:text-purple-400" },
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") as PostCategory | null;

  const [activeCategory, setActiveCategory] = useState<PostCategory | null>(null);

  // Sincronizar o parâmetro de query da URL com o estado local do feed
  useEffect(() => {
    const validCategories: (PostCategory | null)[] = [
      null,
      "breaking",
      "review",
      "hardware",
      "opinion",
      "industry",
      "modding",
    ];
    if (validCategories.includes(categoryParam)) {
      setActiveCategory(categoryParam);
    } else {
      setActiveCategory(null);
    }
  }, [categoryParam]);

  const handleCategoryClick = (catValue: PostCategory | null) => {
    if (catValue) {
      router.push(`/?category=${catValue}`);
    } else {
      router.push("/");
    }
  };

  return (
    <>
      {/* Top Banner de Redes Sociais */}
      <div className="bg-[#08090C] border-b border-brand-orange-muted/5 py-2 text-xs text-gray-500 font-mono hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
              <span className="text-gray-400">Servidores Supabase:</span> Online
            </span>
          </div>

        </div>
      </div>

      {/* Header Centralizado */}
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo e Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center cursor-pointer group gap-4" onClick={() => handleCategoryClick(null)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/Logo Tijolo Quebrado.PNG"
                alt="Orange Brick Logo Icon"
                className="h-10 sm:h-16 w-auto object-contain transform group-hover:scale-[1.05] transition-transform duration-300"
              />
              <span className="text-base sm:text-xl md:text-2xl font-mono font-black text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors duration-300">
                Orange<span className="text-brand-orange">_</span>Brick
              </span>
            </div>
            <span className="text-[9px] font-mono text-brand-orange-muted uppercase tracking-widest border border-brand-orange-muted/20 px-2 py-0.5 rounded sm:hidden ml-4 beta-glitch">
              Beta
            </span>
          </div>

          {/* Categorias de Notícias (Navbar) */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none font-mono text-xs font-semibold">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.value;
              return (
                <button
                  key={cat.label}
                  onClick={() => handleCategoryClick(cat.value)}
                  className={`
                    px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer whitespace-nowrap
                    ${isActive 
                      ? "bg-brand-orange/15 text-brand-orange border-brand-orange/30 shadow-[0_0_10px_rgba(255,94,0,0.1)]" 
                      : `bg-transparent text-gray-400 border-transparent ${cat.hoverColor} hover:border-brand-orange-muted/20 hover:bg-card-slate/30`
                    }
                  `}
                >
                  {cat.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Grid Principal do Feed */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NewsFeed category={activeCategory} />
        
        {/* Renderiza a seção multimídia apenas na Home (sem filtros ativos) */}
        {!activeCategory && <MultimediaSection />}
      </main>

      {/* Footer Global Reutilizável */}
      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background-void text-mono text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            <span className="text-gray-400 font-mono">Carregando portal...</span>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
