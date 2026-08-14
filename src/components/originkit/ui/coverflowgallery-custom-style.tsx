"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

interface CoverflowSlide {
  image?: { src?: string; alt?: string };
  title?: string;
}

interface CoverflowTransition {
  duration?: number;
  delay?: number;
  ease?: [number, number, number, number];
}

interface CoverflowGalleryProps {
  slides?: CoverflowSlide[];
  cardWidth?: number;
  cardHeight?: number;
  radius?: number;
  tilt?: number;
  sideTilt?: number;
  gap?: number;
  opacity?: number;
  transition?: CoverflowTransition;
  autoplay?: boolean;
  autoplayDirection?: "leftToRight" | "rightToLeft";
  showTitle?: boolean;
  titleFont?: CSSProperties;
  titleColor?: string;
  titlePosition?: {
    position?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
  style?: CSSProperties;
}

export default function CoverflowGallery({
  slides = [],
  cardWidth = 300,
  cardHeight = 169,
  radius = 1,
  tilt = 10,
  sideTilt = 2,
  gap = 6,
  opacity = 48,
  transition = {},
  autoplay = false,
  autoplayDirection = "rightToLeft",
  showTitle = true,
  titleFont,
  titleColor = "#ffffff",
  titlePosition,
  style,
}: CoverflowGalleryProps) {
  const [active, setActive] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(cardWidth);
  const rootRef = useRef<HTMLDivElement>(null);
  const duration = transition.duration ?? 0.45;
  const delay = transition.delay ?? 2.5;
  const easing = transition.ease ? `cubic-bezier(${transition.ease.join(",")})` : "cubic-bezier(0.16,1,0.3,1)";
  const effectiveWidth = Math.min(cardWidth, Math.max(240, availableWidth - 32));
  const effectiveHeight = Math.round(effectiveWidth * (cardHeight / cardWidth));
  const corner = titlePosition?.position ?? "bottomLeft";
  const isTop = corner.startsWith("top");
  const isRight = corner.endsWith("Right");

  const safeActive = slides.length === 0 ? 0 : Math.min(active, slides.length - 1);

  const step = useCallback((direction: number) => {
    if (slides.length < 2) return;
    setActive((current) => {
      const validCurrent = Math.min(current, slides.length - 1);
      return (validCurrent + direction + slides.length) % slides.length;
    });
  }, [slides.length]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || slides.length < 2) return;
    const direction = autoplayDirection === "leftToRight" ? -1 : 1;
    const timer = window.setInterval(() => step(direction), Math.max(600, delay * 1000));
    return () => window.clearInterval(timer);
  }, [autoplay, autoplayDirection, delay, slides.length, step]);

  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartXRef.current = event.touches[0].clientX;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    touchDeltaXRef.current = event.touches[0].clientX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null) return;
    const delta = touchDeltaXRef.current;
    const swipeThreshold = 35;
    if (delta < -swipeThreshold) {
      step(1);
    } else if (delta > swipeThreshold) {
      step(-1);
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    step(event.key === "ArrowRight" ? 1 : -1);
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Radar de lançamentos"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-orange touch-pan-y"
      style={{ perspective: "1600px", ...style }}
    >
      <div className="relative" style={{ width: effectiveWidth, height: effectiveHeight, transformStyle: "preserve-3d" }}>
        {slides.map((slide, index) => {
          let relativeIndex = index - safeActive;
          if (relativeIndex > slides.length / 2) relativeIndex -= slides.length;
          if (relativeIndex < -slides.length / 2) relativeIndex += slides.length;
          const distance = Math.abs(relativeIndex);
          const visible = distance <= 2;
          const selected = relativeIndex === 0;
          const translateX = relativeIndex * gap * (cardWidth > 400 ? 38 : 30);
          const transform = `translateX(${translateX}px) translateZ(${-distance * (cardWidth > 400 ? 280 : 240)}px) rotateY(${-relativeIndex * tilt}deg) rotateZ(${relativeIndex * sideTilt}deg) scale(${Math.max(0.68, 1 - distance * 0.16)})`;

          return (
            <button
              key={`${slide.title}-${index}`}
              type="button"
              onClick={() => selected ? step(1) : setActive(index)}
              aria-label={selected ? `${slide.title}. Próximo lançamento` : `Selecionar ${slide.title}`}
              aria-current={selected ? "true" : undefined}
              className="absolute inset-0 overflow-hidden bg-[#111217] text-left shadow-[0_22px_52px_rgba(0,0,0,0.48)] focus-visible:outline-2 focus-visible:outline-brand-orange"
              style={{
                borderRadius: Math.min(16, Math.max(0, radius) * 4),
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? "auto" : "none",
                transform,
                transformStyle: "preserve-3d",
                transition: `transform ${duration}s ${easing}, opacity ${duration}s ${easing}`,
              }}
            >
              {slide.image?.src && <img src={slide.image.src} alt={slide.image.alt || ""} draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />}
              {showTitle && (
                <>
                  <span className={`absolute inset-0 ${isTop ? "bg-gradient-to-b" : "bg-gradient-to-t"} from-black/90 via-black/20 to-transparent`} aria-hidden="true" />
                  <span
                    className="absolute z-10 whitespace-pre-line font-heading font-black text-white"
                    style={{
                      color: titleColor,
                      left: titlePosition?.paddingLeft ?? 16,
                      right: titlePosition?.paddingRight ?? 16,
                      top: isTop ? titlePosition?.paddingTop ?? 16 : undefined,
                      bottom: isTop ? undefined : titlePosition?.paddingBottom ?? 16,
                      textAlign: isRight ? "right" : "left",
                      ...titleFont,
                    }}
                  >
                    {slide.title}
                  </span>
                </>
              )}
              {!selected && <span className="absolute inset-0 bg-[#08090c]" style={{ opacity: 1 - opacity / 100 }} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
