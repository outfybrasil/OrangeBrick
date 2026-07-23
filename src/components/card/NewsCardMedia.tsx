"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PostCategory } from "@/lib/types/database";

interface NewsCardMediaProps {
  src: string | null;
  alt: string | null;
  category?: PostCategory;
}

export function NewsCardMedia({ src, alt, category }: NewsCardMediaProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="aspect-video w-full bg-card-slate flex items-center justify-center border-y border-brand-orange-muted/10">
        <div className="flex flex-col items-center gap-1 opacity-40">
          <Icon name="brick" size={32} className="text-brand-orange-muted" />
          <span className="text-[10px] font-mono text-brand-orange-muted uppercase tracking-widest">
            Sem mídia
          </span>
        </div>
      </div>
    );
  }

  const isBreaking = category === "breaking";

  return (
    <div
      className={`
        relative aspect-video w-full overflow-hidden border-y border-brand-orange-muted/10 bg-[#08090C]
        ${isBreaking ? "glitch-container" : ""}
      `}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 transform scale-110"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-background-void/80 via-transparent to-transparent z-10 pointer-events-none" />

      {isBreaking && (
        <>
          <div className="glitch-scanlines" aria-hidden="true" />
          <div className="glitch-chromatic glitch-chromatic--r" aria-hidden="true" />
          <div className="glitch-chromatic glitch-chromatic--g" aria-hidden="true" />
          <div className="glitch-chromatic glitch-chromatic--b" aria-hidden="true" />
        </>
      )}
      <img
        src={src}
        alt={alt || ""}
        className={`
          relative z-0 w-full h-full object-contain transform scale-100
          group-hover:scale-105 transition-transform duration-500 ease-out
          ${isBreaking ? "glitch-img" : ""}
        `}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
}
