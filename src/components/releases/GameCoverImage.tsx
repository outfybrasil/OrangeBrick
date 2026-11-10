"use client";

import { useState } from "react";
import Image from "next/image";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { isSupabaseStorageImageUrl } from "@/lib/release-images";

interface GameCoverImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
  priority?: boolean;
  sizes?: string;
}

export function GameCoverImage({ src, alt, className = "", fit = "cover", priority = false, sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" }: GameCoverImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`relative aspect-video w-full overflow-hidden border border-white/10 bg-surface flex flex-col items-center justify-center p-4 text-center select-none ${className}`}
        aria-label={alt}
      >
        <div aria-hidden="true" className="absolute inset-0 opacity-15 bg-[radial-gradient(#FF5E00_1px,transparent_1px)] [background-size:16px_16px]" />
        <BrandLogo alt="" variant="mark" className="mb-2 h-10 w-auto opacity-70" />
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
      {isSupabaseStorageImageUrl(src) ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setHasError(true)}
          className={`${fit === "contain" ? "object-contain" : "object-cover"} transition-transform duration-300 group-hover:scale-105`}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setHasError(true)}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} transition-transform duration-300 group-hover:scale-105`}
        />
      )}
    </div>
  );
}
