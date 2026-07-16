export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: Post;
        Insert: Omit<Post, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Post, "id">>;
      };
      reactions: {
        Row: Reaction;
        Insert: Omit<Reaction, "id" | "created_at">;
        Update: Partial<Omit<Reaction, "id">>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Comment, "id">>;
      };
      post_views: {
        Row: PostView;
        Insert: Omit<PostView, "id" | "viewed_at">;
        Update: Partial<Omit<PostView, "id">>;
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Omit<PushSubscription, "id" | "created_at">;
        Update: Partial<Omit<PushSubscription, "id">>;
      };
    };
    Functions: {
      toggle_reaction: {
        Args: {
          p_post_id: string;
          p_device_id: string;
          p_reaction_type: "hype" | "flop" | "salty" | "defendo" | "brick";
        };
        Returns: Json;
      };
    };
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

export interface Reaction {
  id: number;
  post_id: string;
  device_id: string;
  reaction_type: "hype" | "flop" | "salty" | "defendo" | "brick";
  created_at: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  company: string;
  email: string;
  budget: string;
  message: string;
  created_at: string;
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

export interface PostView {
  id: string;
  post_id: string;
  device_id: string;
  viewed_at: string;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
}

export type PostCategory = Post["category"];
export type ReactionType = Reaction["reaction_type"];

export const CATEGORY_CONFIG: Record<PostCategory, { label: string; color: string }> = {
  breaking: { label: "Breaking", color: "bg-accent-blue/15 text-accent-blue border-accent-blue/30" },
  hardware: { label: "Hardware", color: "bg-brand-orange/10 text-brand-orange border-brand-orange/30" },
  industry: { label: "Indústria", color: "bg-white/5 text-gray-300 border-white/10" },
  modding: { label: "Modding", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  review: { label: "Review", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  opinion: { label: "Opinião", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
};
