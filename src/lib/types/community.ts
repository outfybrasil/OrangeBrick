import type { ReactionType } from "@/lib/types/database";

export interface AttachedArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  image_url?: string | null;
  category: string;
  topic_id?: string | null;
}

export interface SharedPostData {
  _type: "shared_post";
  original_post_id: string;
  original_author_name: string;
  original_author_username?: string | null;
  original_author_avatar: string;
  original_is_official?: boolean;
  original_content: string;
  original_created_at: string;
  original_platform_tag?: string;
  original_attached_article?: AttachedArticle | null;
}

export interface CommunityPost {
  id: string;
  user_id?: string;
  author_name: string;
  author_username?: string | null;
  author_avatar: string;
  content: string;
  media_url?: string | null;
  platform_tag?: string | null;
  attached_article?: AttachedArticle | null;
  shared_post?: SharedPostData | null;
  reactions: Record<ReactionType, number>;
  user_reaction?: ReactionType | null;
  comments_count: number;
  shares_count?: number;
  created_at: string;
  is_pinned?: boolean;
  is_official?: boolean;
  topic_id?: string | null;
  source_post_id?: string | null;
  is_official_thread?: boolean;
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
  author_username?: string | null;
  author_avatar: string;
  is_official?: boolean;
  content: string;
  created_at: string;
  likes_count: number;
  user_has_liked?: boolean;
}

export interface CommunityPoll {
  id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  user_voted_option?: number | null;
  created_at: string;
  ends_at?: string | null;
}
