export const USER_DATA_EXPORT_PAGE_SIZE = 100;

export const USER_DATA_EXPORT_DATASETS = [
  "article_comments",
  "article_reactions",
  "article_views",
  "community_posts",
  "community_comments",
  "community_reactions",
  "community_poll_votes",
  "community_comment_likes",
  "notifications",
  "push_subscriptions",
  "contact_submissions",
] as const;

export type UserDataExportDataset = (typeof USER_DATA_EXPORT_DATASETS)[number];
