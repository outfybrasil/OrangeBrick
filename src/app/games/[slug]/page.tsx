import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicServerClient, createServerDataClient } from "@/lib/supabase/server";
import { GamePageClient, type GamePageClientProps } from "./GamePageClient";
import type { ReleaseRadarItem, ReleaseHypeVote, ReleaseHypeCount, ReleaseHypeVoteSelection, CommunityPostRow, ReactionType, GameReviewRatingAggregate, UserGameTracking } from "@/lib/types/database";
import type { CommunityPost, AttachedArticle, SharedPostData } from "@/lib/types/community";
import { getSiteUrl } from "@/lib/site-url";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = createPublicServerClient();

  const { data: gameData } = await supabase
    .from("release_radar_items")
    .select("game, release_label, platforms, image_url, badge")
    .or(`id.eq.${decodedSlug},topic_id.eq.${decodedSlug}`)
    .maybeSingle();
  const game = gameData as ReleaseRadarItem | null;

  if (!game) {
    return {
      title: "Jogo não encontrado | Orange Brick",
    };
  }

  const title = `${game.game} — Lançamento, Plataformas e Comunidade | Orange Brick`;
  const description = `Confira a data de lançamento (${game.release_label}), plataformas (${game.platforms.join(", ")}), termômetro da comunidade e notícias sobre ${game.game} no Orange Brick.`;
  const canonicalUrl = `/games/${decodedSlug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: game.image_url ? [{ url: game.image_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: game.image_url ? [game.image_url] : [],
    },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = createPublicServerClient();

  const { data: gameData } = await supabase
    .from("release_radar_items")
    .select("*")
    .or(`id.eq.${decodedSlug},topic_id.eq.${decodedSlug}`)
    .maybeSingle();

  if (!gameData) {
    notFound();
  }

  const game = gameData as ReleaseRadarItem;

  const { data: voteCountsData, error: voteCountsError } = await supabase.rpc("get_release_hype_counts").eq("release_id", game.id);
  const communityClient = await createServerDataClient();

  let initialGameReviewStats: GameReviewRatingAggregate = {
    game_id: game.game_id || "",
    average_rating: null,
    rating_count: 0,
  };
  let initialGameReviewStatsError = false;
  if (game.game_id) {
    const { data: reviewStatsData, error: reviewStatsError } = await communityClient.rpc("get_game_review_stats", {
      target_game_ids: [game.game_id],
    });
    initialGameReviewStatsError = Boolean(reviewStatsError);
    initialGameReviewStats = reviewStatsData?.[0] || initialGameReviewStats;
  }

  const initialCounts = { buy: 0, watch: 0, skip: 0 };
  for (const row of (voteCountsData || []) as ReleaseHypeCount[]) {
    if (row.release_id === game.id) initialCounts[row.vote_type] = Number(row.vote_count);
  }

  let initialUserVote: ReleaseHypeVote["vote_type"] | null = null;
  let initialVoteUserId: string | null = null;
  let initialVoteError = false;
  let initialReviewUserId: string | null = null;
  try {
    const { data: { user } } = await communityClient.auth.getUser();
    if (user) {
      initialReviewUserId = user.id;
      const { data: myVotes, error: myVotesError } = await communityClient.rpc("get_my_release_hype_votes").eq("release_id", game.id);
      if (myVotesError) throw myVotesError;
      initialVoteUserId = user.id;
      initialUserVote = ((myVotes || []) as ReleaseHypeVoteSelection[])[0]?.vote_type || null;
    }
  } catch {
    initialUserVote = null;
    initialVoteUserId = null;
    initialVoteError = true;
  }

  const [postsResponse, personalReviewResponse] = await Promise.all([
    supabase
      .from("posts")
      .select("id, slug, title, summary, image_url, category, published_at")
      .eq("is_published", true)
      .or(`topic_id.eq.${decodedSlug},title.ilike.%${game.game}%`)
      .order("published_at", { ascending: false })
      .limit(6),
    initialReviewUserId && game.game_id
      ? communityClient
        .from("user_game_tracking")
        .select("rating, review_text, is_public")
        .eq("user_id", initialReviewUserId)
        .eq("game_id", game.game_id)
        .eq("status", "joguei")
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const postsData = postsResponse.data;
  const initialPersonalReviewError = Boolean(personalReviewResponse.error);
  const initialPersonalReview = personalReviewResponse.data as Pick<UserGameTracking, "rating" | "review_text" | "is_public"> | null;

  const communityFilters = [
    { topic_filter: game.topic_id || "", search_text: game.topic_id ? "" : game.game },
    ...(game.topic_id ? [{ topic_filter: "", search_text: game.game }] : []),
  ];
  const communityResults = await Promise.all(communityFilters.map((filter) => communityClient.rpc("community_feed_page", {
    page_offset: 0,
    search_text: filter.search_text,
    platform_filter: "",
    article_filter: "",
    topic_filter: filter.topic_filter,
    post_filter: "",
    feed_order: "latest",
  })));
  const relatedBricksError = communityResults.some((result) => Boolean(result.error));
  type FeedPostRow = CommunityPostRow & {
    reactions: Record<ReactionType, number>;
    user_reaction: ReactionType | null;
    comments_count: number;
    shares_count: number;
  };
  const communityRows = communityResults.flatMap((result) => {
    const page = result.data as { posts?: FeedPostRow[] } | null;
    return Array.isArray(page?.posts) ? page.posts : [];
  });
  const relatedBricks = [...new Map(communityRows.map((row) => [row.id, row])).values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)
    .map((row): CommunityPost => {
      const rawArticle = row.attached_article as Record<string, unknown> | null;
      const sharedPost = rawArticle?._type === "shared_post" ? rawArticle as unknown as SharedPostData : null;
      const attachedArticle = rawArticle && !sharedPost ? rawArticle as unknown as AttachedArticle : null;
      return {
        id: row.id,
        user_id: row.user_id,
        author_name: row.author_name,
        author_username: row.author_username,
        author_avatar: row.author_avatar,
        content: row.content,
        media_url: row.media_url,
        media_alt: row.media_alt,
        platform_tag: row.platform_tag,
        attached_article: attachedArticle,
        shared_post: sharedPost,
        reactions: row.reactions,
        user_reaction: row.user_reaction,
        comments_count: row.comments_count,
        shares_count: row.shares_count,
        created_at: row.created_at,
        is_pinned: row.is_pinned,
        is_official: row.is_official,
        topic_id: row.topic_id,
        source_post_id: row.source_post_id,
        is_official_thread: row.is_official_thread,
      };
    });

  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoGame",
        name: game.game,
        operatingSystem: game.platforms.join(", "),
        applicationCategory: "Game",
        ...(game.release_date ? { datePublished: game.release_date } : {}),
        ...(game.image_url ? { image: game.image_url } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Início",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Lançamentos",
            item: `${siteUrl}/lancamentos`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: game.game,
            item: `${siteUrl}/games/${encodeURIComponent(decodedSlug)}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <GamePageClient
        key={game.id}
        game={game}
        initialCounts={initialCounts}
        initialCountsError={Boolean(voteCountsError)}
        initialUserVote={initialUserVote}
        initialVoteUserId={initialVoteUserId}
        initialVoteError={initialVoteError}
        reviewGameId={game.game_id}
        initialGameReviewStats={initialGameReviewStats}
        initialGameReviewStatsError={initialGameReviewStatsError}
        initialPersonalReview={initialPersonalReview}
        initialReviewUserId={initialReviewUserId}
        initialPersonalReviewError={initialPersonalReviewError}
        relatedPosts={(postsData || []) as GamePageClientProps["relatedPosts"]}
        relatedBricks={relatedBricks}
        relatedBricksError={relatedBricksError}
      />
    </>
  );
}
