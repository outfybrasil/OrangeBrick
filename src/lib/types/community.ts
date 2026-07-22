import type { ReactionType } from "@/lib/types/database";

export interface AttachedArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  image_url?: string | null;
  category: string;
}

export interface CommunityPost {
  id: string;
  user_id?: string;
  author_name: string;
  author_avatar: string;
  content: string;
  media_url?: string | null;
  platform_tag?: string | null; // e.g. "[PS5]", "[XSX]", "[SWITCH 2]", "[PC]"
  attached_article?: AttachedArticle | null;
  reactions: Record<ReactionType, number>;
  user_reaction?: ReactionType | null;
  comments_count: number;
  created_at: string;
  is_pinned?: boolean;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: string;
}

export interface CommunityPoll {
  id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  user_voted_option?: number | null;
  created_at: string;
}
