"use client";

import {
  calculateProgressionLevel,
  HYPE_THRESHOLDS,
  FLOP_THRESHOLDS,
  type ProgressionLevel,
} from "@/lib/reactions-config";

export type ReactionCategory = "hype" | "flop" | "comment" | "repost" | "share";
export type { ProgressionLevel };

export function getProgressionLevel(count: number, type: ReactionCategory = "hype"): ProgressionLevel {
  const thresholds = type === "flop" ? FLOP_THRESHOLDS : HYPE_THRESHOLDS;
  return calculateProgressionLevel(count, thresholds);
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
  2: "drop-shadow-[0_0_6px_rgba(255,94,0,0.6)]",
  3: "drop-shadow-[0_0_9px_rgba(255,94,0,0.75)]",
  4: "drop-shadow-[0_0_12px_rgba(255,94,0,0.9)]",
  5: "drop-shadow-[0_0_16px_rgba(255,140,0,1)]",
};

const FLOP_SHADOWS: Record<ProgressionLevel, string> = {
  1: "drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]",
  2: "drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]",
  3: "drop-shadow-[0_0_9px_rgba(239,68,68,0.75)]",
  4: "drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]",
  5: "drop-shadow-[0_0_16px_rgba(239,68,68,1)]",
};

const FOLDER_MAP: Record<ReactionCategory, string> = {
  hype: "hype",
  flop: "flop",
  comment: "respostas",
  repost: "republicar",
  share: "compartilhar",
};

function ConnectedNodesShareIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full transition-transform duration-200 group-hover:scale-110"
    >
      <circle
        cx="18"
        cy="5"
        r="3"
        fill={active ? "currentColor" : "none"}
        className="transition-colors"
      />
      <circle
        cx="6"
        cy="12"
        r="3"
        fill={active ? "currentColor" : "none"}
        className="transition-colors"
      />
      <circle
        cx="18"
        cy="19"
        r="3"
        fill={active ? "currentColor" : "none"}
        className="transition-colors"
      />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function ReactionIcon({
  type,
  count = 0,
  active = false,
  className = "",
  size = 19,
}: ReactionIconProps) {
  if (type === "share") {
    return (
      <span
        className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        aria-hidden="true"
      >
        <ConnectedNodesShareIcon active={active} />
      </span>
    );
  }

  const folder = FOLDER_MAP[type];
  const level = getProgressionLevel(count > 0 ? count : 0, type);

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
          className={`h-full w-full object-contain transition-all duration-200 group-hover:scale-110 motion-reduce:transform-none ${activeShadow} ${
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
            className={`absolute inset-0 h-full w-full object-contain opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:scale-110 motion-reduce:transform-none ${hoverShadow}`}
            draggable={false}
            loading="eager"
            decoding="async"
          />
        </>
      )}
    </span>
  );
}
