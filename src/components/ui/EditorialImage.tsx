"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

function ImageWithFallback({ alt, onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed && !alt) return null;
  if (failed) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt ? `Imagem indisponível: ${alt}` : undefined}
        aria-hidden={alt ? undefined : true}
        className={`${props.className || ""} ${props.fill ? "absolute inset-0 h-full w-full" : ""} flex items-center justify-center bg-[#15171d] text-gray-400`}
        style={props.fill ? props.style : { width: props.width, height: props.height, maxWidth: "100%", ...props.style }}
      >
        <span className="flex flex-col items-center gap-2 p-3 text-center">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 text-brand-orange" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h18v10H3zM3 12h18M9 7v5m6 0v5" /></svg>
          <span className="text-xs font-semibold">Imagem indisponível</span>
        </span>
      </div>
    );
  }
  return <Image {...props} alt={alt} onError={event => { setFailed(true); onError?.(event); }} />;
}

export function EditorialImage(props: ImageProps) {
  const source = typeof props.src === "string" ? props.src : JSON.stringify(props.src);
  return <ImageWithFallback key={source} {...props} />;
}
