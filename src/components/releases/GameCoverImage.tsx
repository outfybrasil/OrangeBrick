"use client";

import { useState } from "react";

interface GameCoverImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}

export function GameCoverImage({ src, alt, className = "", priority = false }: GameCoverImageProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`relative aspect-video w-full overflow-hidden border border-white/10 bg-[#12141A] flex flex-col items-center justify-center p-4 text-center select-none ${className}`}
        aria-label={alt}
      >
        <div aria-hidden="true" className="absolute inset-0 opacity-15 bg-[radial-gradient(#FF5E00_1px,transparent_1px)] [background-size:16px_16px]" />
        <img
          src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
          alt=""
          className="h-10 w-auto opacity-70 mb-2 object-contain"
        />
        <span className="font-heading text-xs font-black uppercase tracking-wider text-brand-orange">
          Orange Brick
        </span>
        <span className="mt-1 line-clamp-1 max-w-[90%] text-xs font-bold text-gray-300">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-black/60 ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setHasError(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}
