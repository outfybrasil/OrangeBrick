export type ProgressionLevel = 1 | 2 | 3 | 4 | 5;

export interface ReactionProgressionThresholds {
  level1Max: number;
  level2Max: number;
  level3Max: number;
  level4Max: number;
}

export const HYPE_THRESHOLDS: ReactionProgressionThresholds = {
  level1Max: 4,
  level2Max: 19,
  level3Max: 49,
  level4Max: 99,
};

export const FLOP_THRESHOLDS: ReactionProgressionThresholds = {
  level1Max: 4,
  level2Max: 19,
  level3Max: 49,
  level4Max: 99,
};

export function calculateProgressionLevel(
  count: number,
  thresholds: ReactionProgressionThresholds = HYPE_THRESHOLDS
): ProgressionLevel {
  if (count <= thresholds.level1Max) return 1;
  if (count <= thresholds.level2Max) return 2;
  if (count <= thresholds.level3Max) return 3;
  if (count <= thresholds.level4Max) return 4;
  return 5;
}

export const REACTION_LABELS = {
  hype: {
    name: "Hype",
    title: "No hype! Apoiar publicação",
    level5Badge: "HOT",
  },
  flop: {
    name: "Flop",
    title: "Flopou / Decepcionou",
    level5Badge: "COLD",
  },
  comment: {
    name: "Respostas",
    title: "Ver e enviar respostas",
  },
  repost: {
    name: "Republicar",
    title: "Republicar Brick na comunidade",
  },
  share: {
    name: "Compartilhar",
    title: "Compartilhar link",
  },
} as const;
