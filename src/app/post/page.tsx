"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PostArticle } from "@/app/posts/[slug]/PostDetailClient";

function PostPageInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  if (!slug) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-void text-center p-4 font-mono">
        <div>
          <p className="text-gray-400 mb-4">Slug não informado</p>
          <a
            href="/"
            className="text-xs text-brand-orange hover:text-white border border-brand-orange/30 px-4 py-2 rounded-lg hover:bg-brand-orange/10 transition-colors inline-block"
          >
            ← Voltar para a Home
          </a>
        </div>
      </div>
    );
  }

  return <PostArticle slug={slug} />;
}

export default function PostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background-void text-mono text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            <span className="text-gray-400">Carregando notícia...</span>
          </div>
        </div>
      }
    >
      <PostPageInner />
    </Suspense>
  );
}
