export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ProgressionSummary {
  lifetime_xp: number | null;
  level: number;
  next_level_xp: number;
  active_days: number;
}

export interface SeasonSummary {
  id: string;
  name: string;
  ends_at: string;
  eligible_xp: number;
  division: string | null;
  rank: number | null;
  percentile: number | null;
  is_qualified: boolean;
}

export interface AchievementProgress {
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: AchievementRarity;
  progress: number;
  target: number;
  unlocked_at: string | null;
  is_equipped: boolean;
}

export interface PublicProfileData {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_official: boolean;
  created_at: string;
  favorite_platforms: string[];
  favorite_categories: string[];
  equipped_title: string | null;
  equipped_frame: string | null;
  profile_theme: string;
  progress: ProgressionSummary | null;
  season: SeasonSummary | null;
  stats: {
    posts: number;
    comments: number;
    reactions_received: number;
    replies_received: number;
    achievements: number;
  } | null;
  achievements: AchievementProgress[];
}

export interface PrivateProgressData {
  progress: {
    user_id: string;
    lifetime_xp: number;
    level: number;
    active_days: number;
    last_xp_at: string | null;
    updated_at: string;
  };
  daily: {
    post_created: number;
    comment_created: number;
    reaction_given: number;
  };
  events: Array<{
    event_type: string;
    xp_amount: number;
    status: "valid" | "revoked" | "held";
    occurred_at: string;
    revocation_reason: string | null;
  }>;
  rewards: Array<{
    slug: string;
    name: string;
    type: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  eligible_xp: number;
  active_days: number;
  division: string | null;
}
