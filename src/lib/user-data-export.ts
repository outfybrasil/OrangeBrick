export const USER_DATA_EXPORT_PAGE_SIZE = 100;

export const USER_DATA_EXPORT_DATASETS = [
  "article_comments",
  "article_comment_likes",
  "community_posts",
  "community_comments",
  "community_reactions",
  "community_poll_votes",
  "community_comment_likes",
  "notifications",
  "push_subscriptions",
  "contact_submissions",
  "user_progress",
  "xp_events",
  "season_progress",
  "user_achievements",
  "user_rewards",
  "user_follows",
  "notification_preferences",
  "release_hype_votes",
  "community_reports",
  "community_notes",
  "community_note_votes",
  "admin_preferences",
  "game_clubs",
  "game_club_members",
] as const;

export type UserDataExportDataset = (typeof USER_DATA_EXPORT_DATASETS)[number];
