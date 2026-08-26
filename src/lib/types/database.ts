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
      editorial_images: {
        Row: EditorialImage;
        Insert: EditorialImageInsert;
        Update: Partial<EditorialImageInsert>;
        Relationships: [];
      };
      release_radar_items: {
        Row: ReleaseRadarItem;
        Insert: ReleaseRadarItemInsert;
        Update: Partial<ReleaseRadarItemInsert>;
        Relationships: [];
      };
      release_hype_votes: {
        Row: ReleaseHypeVote;
        Insert: ReleaseHypeVoteInsert;
        Update: Partial<ReleaseHypeVoteInsert>;
        Relationships: [];
      };
      topics: {
        Row: Topic;
        Insert: TopicInsert;
        Update: Partial<TopicInsert>;
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
      notifications: {
        Row: AppNotification;
        Insert: AppNotificationInsert;
        Update: Partial<AppNotificationInsert>;
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
      community_posts: {
        Row: CommunityPostRow;
        Insert: CommunityPostInsert;
        Update: Partial<CommunityPostInsert>;
        Relationships: [];
      };
      community_reactions: {
        Row: CommunityReactionRow;
        Insert: CommunityReactionInsert;
        Update: Partial<CommunityReactionInsert>;
        Relationships: [];
      };
      community_comments: {
        Row: CommunityCommentRow;
        Insert: CommunityCommentInsert;
        Update: Partial<CommunityCommentInsert>;
        Relationships: [];
      };
      community_comment_likes: {
        Row: CommunityCommentLikeRow;
        Insert: CommunityCommentLikeInsert;
        Update: Partial<CommunityCommentLikeInsert>;
        Relationships: [];
      };
      community_polls: {
        Row: CommunityPollRow;
        Insert: CommunityPollInsert;
        Update: Partial<CommunityPollInsert>;
        Relationships: [];
      };
      community_poll_votes: {
        Row: CommunityPollVoteRow;
        Insert: CommunityPollVoteInsert;
        Update: Partial<CommunityPollVoteInsert>;
        Relationships: [];
      };
      home_engagement_events: {
        Row: { id: number; event_name: string; target: string | null; created_at: string };
        Insert: { id?: number; event_name: string; target?: string | null; created_at?: string };
        Update: { event_name?: string; target?: string | null; created_at?: string };
        Relationships: [];
      };
      community_reports: {
        Row: { id: string; reporter_id: string; content_type: "post" | "comment"; content_id: string; reason: string; status: "pending" | "reviewed" | "dismissed" | "actioned"; created_at: string };
        Insert: { id?: string; reporter_id: string; content_type: "post" | "comment"; content_id: string; reason: string; status?: "pending" | "reviewed" | "dismissed" | "actioned"; created_at?: string };
        Update: { reason?: string; status?: "pending" | "reviewed" | "dismissed" | "actioned" };
        Relationships: [];
      };
      admin_preferences: {
        Row: { user_id: string; default_author: string; default_category: PostCategory; updated_at: string };
        Insert: { user_id: string; default_author?: string; default_category?: PostCategory; updated_at?: string };
        Update: { default_author?: string; default_category?: PostCategory; updated_at?: string };
        Relationships: [];
      };
      user_follows: {
        Row: { user_id: string; follow_type: "topic" | "platform" | "profile"; follow_value: string; created_at: string };
        Insert: { user_id: string; follow_type: "topic" | "platform" | "profile"; follow_value: string; created_at?: string };
        Update: { follow_type?: "topic" | "platform" | "profile"; follow_value?: string };
        Relationships: [];
      };
      notification_preferences: {
        Row: { user_id: string; breaking_news: boolean; followed_topics: boolean; brickboard_replies: boolean; weekly_digest: boolean; updated_at: string };
        Insert: { user_id: string; breaking_news?: boolean; followed_topics?: boolean; brickboard_replies?: boolean; weekly_digest?: boolean; updated_at?: string };
        Update: { breaking_news?: boolean; followed_topics?: boolean; brickboard_replies?: boolean; weekly_digest?: boolean; updated_at?: string };
        Relationships: [];
      };
      community_notes: {
        Row: { id: string; post_id: string; user_id: string; content: string; source_url: string; status: "pending" | "helpful" | "rejected"; helpful_count: number; created_at: string };
        Insert: { id?: string; post_id: string; user_id: string; content: string; source_url: string; status?: "pending" | "helpful" | "rejected"; helpful_count?: number; created_at?: string };
        Update: { content?: string; source_url?: string; status?: "pending" | "helpful" | "rejected"; helpful_count?: number };
        Relationships: [];
      };
      game_clubs: {
        Row: { id: string; topic_id: string; name: string; description: string | null; created_by: string; created_at: string };
        Insert: { id?: string; topic_id: string; name: string; description?: string | null; created_by: string; created_at?: string };
        Update: { name?: string; description?: string | null };
        Relationships: [];
      };
      game_club_members: {
        Row: { club_id: string; user_id: string; joined_at: string };
        Insert: { club_id: string; user_id: string; joined_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      editorial_revisions: {
        Row: { id: string; post_id: string; editor_id: string | null; change_type: string; previous_status: string | null; next_status: string | null; correction_note: string | null; created_at: string };
        Insert: { id?: string; post_id: string; editor_id?: string | null; change_type: string; previous_status?: string | null; next_status?: string | null; correction_note?: string | null; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      admin_trash: {
        Row: { id: string; content_type: string; content_id: string; snapshot: Json; deleted_by: string | null; deleted_at: string; expires_at: string; restored_at: string | null };
        Insert: { id?: string; content_type: string; content_id: string; snapshot: Json; deleted_by?: string | null; deleted_at?: string; expires_at?: string; restored_at?: string | null };
        Update: { restored_at?: string | null };
        Relationships: [];
      };
      admin_audit_log: {
        Row: { id: number; actor_id: string | null; action: string; target_type: string; target_id: string | null; details: Json; created_at: string };
        Insert: { actor_id?: string | null; action: string; target_type: string; target_id?: string | null; details?: Json; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      community_note_votes: {
        Row: { note_id: string; user_id: string; created_at: string };
        Insert: { note_id: string; user_id: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      backup_runs: {
        Row: { id: string; status: "started" | "verified" | "failed"; manifest: Json; created_at: string; verified_at: string | null };
        Insert: { id?: string; status: "started" | "verified" | "failed"; manifest?: Json; created_at?: string; verified_at?: string | null };
        Update: { status?: "started" | "verified" | "failed"; manifest?: Json; verified_at?: string | null };
        Relationships: [];
      };
      app_error_events: {
        Row: { id: string; source: string; severity: "warning" | "error"; reference: string | null; route: string | null; message: string; metadata: Json; created_at: string };
        Insert: { id?: string; source: string; severity?: "warning" | "error"; reference?: string | null; route?: string | null; message: string; metadata?: Json; created_at?: string };
        Update: Record<string, never>;
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
      get_post_interest_scores: {
        Args: Record<string, never>;
        Returns: { post_id: string; interest_score: number }[];
      };
      get_release_hype_counts: {
        Args: Record<string, never>;
        Returns: ReleaseHypeCount[];
      };
      get_my_release_hype_votes: {
        Args: Record<string, never>;
        Returns: ReleaseHypeVoteSelection[];
      };
      admin_resolve_community_report: {
        Args: { target_report_id: string; target_action: string };
        Returns: Json;
      };
      admin_archive_post: { Args: { target_post_id: string }; Returns: undefined };
      admin_restore_post: { Args: { target_trash_id: string }; Returns: undefined };
      apply_retention_policy: { Args: Record<string, never>; Returns: Json };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export const POST_LIST_COLUMNS =
  "id, slug, title, summary, category, image_url, image_alt, author_name, author_tag, is_published, published_at, created_at";

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
  topic_id: string | null;
  information_status: "confirmed" | "developing" | "rumor" | "updated" | "corrected";
  featured_quote: Json | null;
  editorial_sources: Json;
  correction_note: string | null;
  publish_to_brickboard?: boolean | null;
  brickboard_copy?: string | null;
  scheduled_at?: string | null;
  scheduled_by?: string | null;
  archived_at?: string | null;
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
  topic_id?: string | null;
  information_status?: Post["information_status"];
  featured_quote?: Json | null;
  editorial_sources?: Json;
  correction_note?: string | null;
  publish_to_brickboard?: boolean | null;
  brickboard_copy?: string | null;
  scheduled_at?: string | null;
  scheduled_by?: string | null;
  archived_at?: string | null;
}

export interface EditorialImage {
  id: string;
  post_id: string | null;
  kind: "cover" | "body" | "release";
  source_url: string;
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  width: number;
  height: number;
  file_size: number;
  mime_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EditorialImageInsert {
  id?: string;
  post_id?: string | null;
  kind?: EditorialImage["kind"];
  source_url: string;
  storage_path: string;
  public_url: string;
  alt_text?: string | null;
  width: number;
  height: number;
  file_size: number;
  mime_type?: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Topic {
  id: string;
  name: string;
  kind: "game" | "subject";
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TopicInsert {
  id: string;
  name: string;
  kind?: Topic["kind"];
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReleaseRadarItem {
  id: string;
  game: string;
  release_label: string;
  release_date: string | null;
  schedule_label: string;
  platforms: string[];
  image_url: string | null;
  badge: string;
  product_type: "game" | "dlc";
  is_indie: boolean;
  category: "week" | "upcoming";
  post_slug: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  topic_id: string | null;
}

export interface ReleaseRadarItemInsert {
  id: string;
  game: string;
  release_label: string;
  release_date?: string | null;
  schedule_label: string;
  platforms?: string[];
  image_url?: string | null;
  badge: string;
  product_type?: ReleaseRadarItem["product_type"];
  is_indie?: boolean;
  category: ReleaseRadarItem["category"];
  post_slug?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  topic_id?: string | null;
}

export interface ReleaseHypeVote {
  id: string;
  release_id: string;
  user_id: string;
  vote_type: "buy" | "watch" | "skip";
  created_at: string;
}

export interface ReleaseHypeVoteInsert {
  id?: string;
  release_id: string;
  user_id: string;
  vote_type: ReleaseHypeVote["vote_type"];
  created_at?: string;
}

export interface ReleaseHypeCount {
  release_id: string;
  vote_type: ReleaseHypeVote["vote_type"];
  vote_count: number;
}

export interface ReleaseHypeVoteSelection {
  release_id: string;
  vote_type: ReleaseHypeVote["vote_type"];
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
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url?: string | null;
  bio?: string | null;
  is_official: boolean;
  favorite_platforms: string[];
  favorite_categories: string[];
  equipped_title?: string | null;
  equipped_frame?: string | null;
  profile_theme: string;
  show_lifetime_xp: boolean;
  show_activity_stats: boolean;
  show_season_history: boolean;
  show_in_leaderboard: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id?: string;
  user_id: string;
  nickname: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  is_official?: boolean;
  favorite_platforms?: string[];
  favorite_categories?: string[];
  equipped_title?: string | null;
  equipped_frame?: string | null;
  profile_theme?: string;
  show_lifetime_xp?: boolean;
  show_activity_stats?: boolean;
  show_season_history?: boolean;
  show_in_leaderboard?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PushSubscription {
  id: string;
  user_id: string | null;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
}

export interface PushSubscriptionInsert {
  id?: string;
  user_id?: string | null;
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

export interface AppNotification {
  id: string;
  user_id: string;
  type: "reaction" | "comment" | "reply" | "system";
  message: string;
  reference_type: "post" | "comment" | "profile" | "achievement" | "ranking";
  reference_id: string;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AppNotificationInsert {
  id?: string;
  user_id: string;
  type: AppNotification["type"];
  message: string;
  reference_type: AppNotification["reference_type"];
  reference_id: string;
  actor_id?: string | null;
  is_read?: boolean;
  created_at?: string;
}

export interface CommunityPostRow {
  id: string;
  user_id: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string;
  content: string;
  media_url: string | null;
  platform_tag: string | null;
  attached_article: Json | null;
  shared_post_id: string | null;
  is_official: boolean;
  is_pinned: boolean;
  created_at: string;
  topic_id: string | null;
  source_post_id: string | null;
  is_official_thread: boolean;
}

export interface CommunityPostInsert {
  id?: string;
  user_id: string;
  author_name: string;
  author_username?: string | null;
  author_avatar: string;
  content: string;
  media_url?: string | null;
  platform_tag?: string | null;
  attached_article?: Json | null;
  shared_post_id?: string | null;
  is_official?: boolean;
  is_pinned?: boolean;
  created_at?: string;
  topic_id?: string | null;
  source_post_id?: string | null;
  is_official_thread?: boolean;
}

export interface CommunityReactionRow {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: "hype" | "flop" | "salty";
  created_at: string;
}

export interface CommunityReactionInsert {
  id?: string;
  post_id: string;
  user_id: string;
  reaction_type: CommunityReactionRow["reaction_type"];
  created_at?: string;
}

export interface CommunityCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string;
  is_official: boolean;
  content: string;
  created_at: string;
}

export interface CommunityCommentInsert {
  id?: string;
  post_id: string;
  user_id: string;
  author_name: string;
  author_username?: string | null;
  author_avatar: string;
  is_official?: boolean;
  content: string;
  created_at?: string;
}

export interface CommunityPollRow {
  id: string;
  question: string;
  options: Json;
  created_at: string;
  expires_at: string | null;
  prompt_date: string | null;
  is_active: boolean;
}

export interface CommunityPollInsert {
  id?: string;
  question: string;
  options: Json;
  created_at?: string;
  expires_at?: string | null;
  prompt_date?: string | null;
  is_active?: boolean;
}

export interface CommunityPollVoteRow {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface CommunityPollVoteInsert {
  id?: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at?: string;
}

export interface CommunityCommentLikeRow {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface CommunityCommentLikeInsert {
  id?: string;
  comment_id: string;
  user_id: string;
  created_at?: string;
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
  breaking: { label: "Plantão", color: "#FF5E00" },
  hardware: { label: "Hard News", color: "#6EA8D8" },
  industry: { label: "Radar", color: "#8FBF8F" },
  modding: { label: "Gambiarra", color: "#56BFB2" },
  review: { label: "Review", color: "#D9B45B" },
  opinion: { label: "Opinião", color: "#E5766B" },
};
