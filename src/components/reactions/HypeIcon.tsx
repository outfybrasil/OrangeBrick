"use client";

export type HypeLevel = 1 | 2 | 3 | 4 | 5;

export function getHypeLevel(count: number): HypeLevel {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 4;
  return 5;
}

interface HypeIconProps {
  count?: number;
  active?: boolean;
  className?: string;
  size?: number;
}

const LEVEL_DROPSHADOW: Record<HypeLevel, string> = {
  1: "drop-shadow-[0_0_4px_rgba(255,94,0,0.4)]",
  2: "drop-shadow-[0_0_6px_rgba(255,94,0,0.55)]",
  3: "drop-shadow-[0_0_8px_rgba(255,94,0,0.7)]",
  4: "drop-shadow-[0_0_10px_rgba(255,94,0,0.8)]",
  5: "drop-shadow-[0_0_12px_rgba(255,115,0,0.95)]",
};

export function HypeIcon({ count = 0, active = false, className = "", size = 18 }: HypeIconProps) {
  const level = getHypeLevel(count > 0 ? count : 1);
  const shadowClass = LEVEL_DROPSHADOW[level];

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: `${size}px`, height: `${Math.round(size * 1.25)}px` }}
      aria-hidden="true"
    >
      {active ? (
        <img
          src={`/images/hype/hype-level-${level}.png`}
          alt=""
          width={size}
          height={Math.round(size * 1.25)}
          className={`h-full w-full object-contain transition-all duration-200 group-hover:scale-110 ${shadowClass} ${
            level === 5 ? "animate-pulse" : ""
          }`}
          draggable={false}
          loading="eager"
          decoding="async"
        />
      ) : (
        <>
          <img
            src="/images/hype/hype-normal.png"
            alt=""
            width={size}
            height={Math.round(size * 1.25)}
            className="h-full w-full object-contain transition-all duration-200 group-hover:opacity-0 group-hover/hype:opacity-0"
            draggable={false}
            loading="eager"
            decoding="async"
          />
          <img
            src="/images/hype/hype-hover.png"
            alt=""
            width={size}
            height={Math.round(size * 1.25)}
            className="absolute inset-0 h-full w-full object-contain opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover/hype:opacity-100 group-hover:scale-110 group-hover/hype:scale-110 drop-shadow-[0_0_6px_rgba(255,94,0,0.6)]"
            draggable={false}
            loading="eager"
            decoding="async"
          />
        </>
      )}
    </span>
  );
}
