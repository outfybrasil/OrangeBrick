export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: Post;
        Insert: PostInsert;
        Update: Partial<PostInsert>;
        Relationships: [];
      };
      reactions: {
        Row: Reaction;
        Insert: ReactionInsert;
        Update: Partial<ReactionInsert>;
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: CommentInsert;
        Update: Partial<CommentInsert>;
        Relationships: [];
      };
      post_views: {
        Row: PostView;
        Insert: PostViewInsert;
        Update: Partial<PostViewInsert>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: PushSubscriptionInsert;
        Update: Partial<PushSubscriptionInsert>;
        Relationships: [];
      };
      contact_submissions: {
        Row: ContactSubmission;
        Insert: ContactSubmissionInsert;
        Update: Partial<ContactSubmissionInsert>;
        Relationships: [];
      };
      rate_limits: {
        Row: RateLimit;
        Insert: RateLimitInsert;
        Update: Partial<RateLimitInsert>;
        Relationships: [];
      };
    };
    Functions: {
      consume_rate_limit: {
        Args: {
          p_action: string;
          p_identity_hash: string;
          p_window_start: string;
          p_limit: number;
        };
        Returns: boolean;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: "breaking" | "hardware" | "industry" | "modding" | "review" | "opinion";
  image_url: string | null;
  image_alt: string | null;
  author_name: string;
  author_tag: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostInsert {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: Post["category"];
  image_url?: string | null;
  image_alt?: string | null;
  author_name: string;
  author_tag?: string | null;
  is_published?: boolean;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Reaction {
  id: number;
  post_id: string;
  device_id: string;
  reaction_type: "hype" | "flop" | "salty";
  ip_hash: string | null;
  created_at: string;
}

export interface ReactionInsert {
  id?: number;
  post_id: string;
  device_id: string;
  reaction_type: Reaction["reaction_type"];
  ip_hash?: string | null;
  created_at?: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  company: string;
  email: string;
  budget: string;
  message: string;
  ip_hash: string | null;
  created_at: string;
}

export interface ContactSubmissionInsert {
  id?: string;
  name: string;
  company: string;
  email: string;
  budget: string;
  message: string;
  ip_hash?: string | null;
  created_at?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentInsert {
  id?: string;
  post_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface PostView {
  id: string;
  post_id: string;
  device_id: string;
  ip_hash: string | null;
  viewed_at: string;
}

export interface PostViewInsert {
  id?: string;
  post_id: string;
  device_id: string;
  ip_hash?: string | null;
  viewed_at?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id?: string;
  user_id: string;
  nickname: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
}

export interface PushSubscriptionInsert {
  id?: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string | null;
  created_at?: string;
}

export interface RateLimit {
  id: string;
  action: string;
  identity_hash: string;
  window_start: string;
  request_count: number;
}

export interface RateLimitInsert {
  id?: string;
  action: string;
  identity_hash: string;
  window_start: string;
  request_count?: number;
}

export type PostCategory = Post["category"];
export type ReactionType = Reaction["reaction_type"];

export interface PostStats {
  reactions: Record<ReactionType, number>;
  views: number;
  comments: number;
  userReaction: ReactionType | null;
}

export const CATEGORY_CONFIG: Record<PostCategory, { label: string; color: string }> = {
  breaking: { label: "Breaking", color: "bg-accent-blue/15 text-accent-blue border-accent-blue/30" },
  hardware: { label: "Hardware", color: "bg-brand-orange/10 text-brand-orange border-brand-orange/30" },
  industry: { label: "Indústria", color: "bg-white/5 text-gray-300 border-white/10" },
  modding: { label: "Modding", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  review: { label: "Review", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  opinion: { label: "Opinião", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
};
