"use client";

import { CATEGORY_CONFIG, type PostCategory } from "@/lib/types/database";

interface NewsCategoryNavProps {
  selectedCategory: PostCategory | null;
  onSelectCategory: (category: PostCategory | null) => void;
}

const CATEGORIES: Array<{ label: string; value: PostCategory | null }> = [
  { label: "Todos", value: null },
  { label: CATEGORY_CONFIG.breaking.label, value: "breaking" },
  { label: CATEGORY_CONFIG.industry.label, value: "industry" },
  { label: CATEGORY_CONFIG.hardware.label, value: "hardware" },
  { label: CATEGORY_CONFIG.review.label, value: "review" },
  { label: CATEGORY_CONFIG.opinion.label, value: "opinion" },
  { label: CATEGORY_CONFIG.modding.label, value: "modding" },
];

export function NewsCategoryNav({ selectedCategory, onSelectCategory }: NewsCategoryNavProps) {
  return (
    <nav aria-label="Navegação por categorias de notícias" className="w-full">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none touch-pan-x sm:flex-wrap sm:pb-0">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => onSelectCategory(cat.value)}
              aria-pressed={isActive}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-sm px-4 py-2 text-xs font-black uppercase tracking-wider transition-all focus-visible:outline-2 focus-visible:outline-brand-orange ${
                isActive
                  ? "bg-brand-orange text-white shadow-[0_0_12px_rgba(255,94,0,0.4)]"
                  : "border border-white/10 bg-[#16171D] text-gray-300 hover:border-brand-orange/40 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
