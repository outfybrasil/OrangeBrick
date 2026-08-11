"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, Minimize2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  className?: string;
  thumbnailClassName?: string;
}

function resolveVideoId(value: string) {
  if (!value.includes("/") && !value.includes("?")) return value;
  try {
    const url = new URL(value);
    return url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || value;
  } catch {
    return value;
  }
}

export function YouTubePlayer({ videoId, title, className, thumbnailClassName }: YouTubePlayerProps) {
  const id = resolveVideoId(videoId);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setExpanded(false);
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const player = (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      className="absolute inset-0 h-full w-full"
    />
  );

  return (
    <>
      <div className={cn("group relative aspect-video overflow-hidden bg-black", className)}>
        {playing && !expanded ? player : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange"
            aria-label={`Reproduzir ${title}`}
          >
            <img
              src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
              alt=""
              loading="lazy"
              className={cn("h-full w-full object-cover transition duration-500 group-hover:scale-[1.025] group-hover:brightness-75", thumbnailClassName)}
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center bg-brand-orange text-white transition-transform duration-300 group-hover:scale-110">
                <Play className="ml-1 h-6 w-6 fill-current" aria-hidden="true" />
              </span>
            </span>
            <span className="absolute inset-x-4 bottom-4 line-clamp-2 text-left font-heading text-base font-black leading-tight text-white sm:text-lg">
              {title}
            </span>
          </button>
        )}

        {playing && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center bg-black/80 text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
            aria-label="Expandir vídeo"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-8"
            onMouseDown={(event) => event.target === event.currentTarget && setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-video w-full max-w-6xl overflow-hidden bg-black"
            >
              {player}
              <button
                type="button"
                autoFocus
                onClick={() => setExpanded(false)}
                className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center bg-black/80 text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
                aria-label="Minimizar vídeo"
              >
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
