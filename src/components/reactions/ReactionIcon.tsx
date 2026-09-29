"use client";

export type ReactionCategory = "hype" | "flop" | "comment" | "repost" | "share";
export type ProgressionLevel = 1 | 2 | 3 | 4 | 5;

export function getProgressionLevel(count: number): ProgressionLevel {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 4;
  return 5;
}

interface ReactionIconProps {
  type: ReactionCategory;
  count?: number;
  active?: boolean;
  className?: string;
  size?: number;
}

const HYPE_SHADOWS: Record<ProgressionLevel, string> = {
  1: "drop-shadow-[0_0_4px_rgba(255,94,0,0.4)]",
  2: "drop-shadow-[0_0_6px_rgba(255,94,0,0.55)]",
  3: "drop-shadow-[0_0_8px_rgba(255,94,0,0.7)]",
  4: "drop-shadow-[0_0_10px_rgba(255,94,0,0.8)]",
  5: "drop-shadow-[0_0_12px_rgba(255,115,0,0.95)]",
};

const FLOP_SHADOWS: Record<ProgressionLevel, string> = {
  1: "drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]",
  2: "drop-shadow-[0_0_6px_rgba(239,68,68,0.55)]",
  3: "drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]",
  4: "drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]",
  5: "drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]",
};

const FOLDER_MAP: Record<ReactionCategory, string> = {
  hype: "hype",
  flop: "flop",
  comment: "respostas",
  repost: "republicar",
  share: "compartilhar",
};

export function ReactionIcon({
  type,
  count = 0,
  active = false,
  className = "",
  size = 18,
}: ReactionIconProps) {
  const folder = FOLDER_MAP[type];
  const level = getProgressionLevel(count > 0 ? count : 1);

  const isProgressive = type === "hype" || type === "flop";
  const activeShadow =
    type === "flop"
      ? FLOP_SHADOWS[level]
      : type === "hype"
      ? HYPE_SHADOWS[level]
      : "drop-shadow-[0_0_6px_rgba(255,94,0,0.6)]";

  const hoverShadow =
    type === "flop"
      ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]"
      : "drop-shadow-[0_0_6px_rgba(255,94,0,0.6)]";

  const activeSrc = isProgressive
    ? `/images/reactions/${folder}/level-${level}.png`
    : `/images/reactions/${folder}/ativo.png`;

  const normalSrc = `/images/reactions/${folder}/normal.png`;
  const hoverSrc = `/images/reactions/${folder}/hover.png`;

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    >
      {active ? (
        <img
          src={activeSrc}
          alt=""
          width={size}
          height={size}
          className={`h-full w-full object-contain transition-all duration-200 group-hover:scale-110 ${activeShadow} ${
            isProgressive && level === 5 ? "animate-pulse" : ""
          }`}
          draggable={false}
          loading="eager"
          decoding="async"
        />
      ) : (
        <>
          <img
            src={normalSrc}
            alt=""
            width={size}
            height={size}
            className="h-full w-full object-contain transition-all duration-200 group-hover:opacity-0"
            draggable={false}
            loading="eager"
            decoding="async"
          />
          <img
            src={hoverSrc}
            alt=""
            width={size}
            height={size}
            className={`absolute inset-0 h-full w-full object-contain opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:scale-110 ${hoverShadow}`}
            draggable={false}
            loading="eager"
            decoding="async"
          />
        </>
      )}
    </span>
  );
}
