import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/ui/Footer";
import { ProfileView } from "@/components/profile/ProfileView";
import { createPublicServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAllowedUserAvatarUrl } from "@/lib/avatar";
import type { PublicProfileData } from "@/lib/types/progression";
import type { ReleaseRadarItem, ReactionType } from "@/lib/types/database";
import type { CommunityPost, AttachedArticle, SharedPostData } from "@/lib/types/community";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

interface RpcCaller {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username).replace(/^@/, "");
  const supabase = createPublicServerClient();

  const { data } = await (supabase as unknown as RpcCaller).rpc("public_profile_safe", {
    target_username: decoded,
  });
  const profile = data as PublicProfileData | null;

  if (!profile) {
    return {
      title: "Jogador não encontrado | Orange Brick",
      robots: { index: false },
    };
  }

  const title = `${profile.display_name} (@${profile.username}) — Perfil Gamer | Orange Brick`;
  const description = profile.bio
    ? `${profile.bio.slice(0, 150)} — Perfil no Orange Brick.`
    : `Confira os Bricks, jogos favoritos e atividades de ${profile.display_name} no Orange Brick.`;
  const canonical = `/u/${encodeURIComponent(profile.username)}`;
  const avatarUrl = profile.avatar_url && isAllowedUserAvatarUrl(profile.avatar_url, profile.user_id)
    ? profile.avatar_url
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      images: avatarUrl ? [{ url: avatarUrl }] : [],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: avatarUrl ? [avatarUrl] : [],
    },
  };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username).replace(/^@/, "");
  const supabase = createPublicServerClient();
  const serviceSupabase = createServiceRoleClient();

  const { data: profileData, error: profileError } = await (
    supabase as unknown as RpcCaller
  ).rpc("public_profile_safe", {
    target_username: decoded,
  });

  const profile = profileData as PublicProfileData | null;
  if (profileError || !profile) {
    notFound();
  }

  const { data: extraProfile } = await supabase
    .from("public_profiles")
    .select("banner_url, playing_now, favorite_games")
    .eq("user_id", profile.user_id)
    .maybeSingle<{
      banner_url: string | null;
      playing_now: string | null;
      favorite_games: string[] | null;
    }>();

  const fullProfile: PublicProfileData = {
    ...profile,
    banner_url: extraProfile?.banner_url || profile.banner_url || null,
    playing_now: extraProfile?.playing_now || null,
    favorite_games: extraProfile?.favorite_games || [],
  };

  const [postsRes, votesRes] = await Promise.all([
    supabase
      .from("community_posts")
      .select("id, user_id, author_name, author_username, author_avatar, content, media_url, media_alt, platform_tag, attached_article, created_at, is_pinned, is_official")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("release_hype_votes")
      .select("release_id, vote_type")
      .eq("user_id", profile.user_id),
  ]);

  interface RawPostRow {
    id: string;
    user_id: string;
    author_name: string;
    author_username: string | null;
    author_avatar: string;
    content: string;
    media_url: string | null;
    media_alt: string | null;
    platform_tag: string | null;
    attached_article: unknown;
    created_at: string;
    is_pinned?: boolean;
    is_official?: boolean;
  }

  const postRows = (postsRes.data || []) as RawPostRow[];
  const postIds = postRows.map((p) => p.id);

  const [reactionsRes, commentsRes] = postIds.length > 0
    ? await Promise.all([
        serviceSupabase
          .from("community_reactions")
          .select("post_id, reaction_type")
          .in("post_id", postIds),
        serviceSupabase
          .from("community_comments")
          .select("post_id")
          .in("post_id", postIds),
      ])
    : [{ data: [] }, { data: [] }];

  const reactionsByPost: Record<string, Record<ReactionType, number>> = {};
  for (const row of (reactionsRes.data || []) as Array<{ post_id: string; reaction_type: ReactionType }>) {
    if (!reactionsByPost[row.post_id]) {
      reactionsByPost[row.post_id] = { hype: 0, flop: 0, salty: 0 };
    }
    reactionsByPost[row.post_id][row.reaction_type] =
      (reactionsByPost[row.post_id][row.reaction_type] || 0) + 1;
  }

  const commentsByPost: Record<string, number> = {};
  for (const row of (commentsRes.data || []) as Array<{ post_id: string }>) {
    commentsByPost[row.post_id] = (commentsByPost[row.post_id] || 0) + 1;
  }

  const initialPosts: CommunityPost[] = postRows.map((row) => {
    const rawArticle = row.attached_article as Record<string, unknown> | null;
    let attachedArticle: AttachedArticle | null = null;
    let sharedPost: SharedPostData | null = null;
    if (rawArticle && rawArticle._type === "shared_post") {
      sharedPost = rawArticle as unknown as SharedPostData;
    } else if (rawArticle) {
      attachedArticle = rawArticle as unknown as AttachedArticle;
    }

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
      reactions: reactionsByPost[row.id] || { hype: 0, flop: 0, salty: 0 },
      comments_count: commentsByPost[row.id] || 0,
      created_at: row.created_at,
      is_pinned: row.is_pinned,
      is_official: row.is_official,
    };
  });

  const votes = (votesRes.data || []) as Array<{ release_id: string; vote_type: string }>;
  const releaseIds = Array.from(new Set(votes.map((v) => v.release_id)));

  let guaranteedGames: ReleaseRadarItem[] = [];
  let radarGames: ReleaseRadarItem[] = [];
  const allRadarMap: Record<string, ReleaseRadarItem> = {};

  if (releaseIds.length > 0 || (fullProfile.favorite_games && fullProfile.favorite_games.length > 0)) {
    const allQueryIds = Array.from(new Set([...releaseIds, ...(fullProfile.favorite_games || [])]));
    const { data: radarItems } = await supabase
      .from("release_radar_items")
      .select("*")
      .in("id", allQueryIds);

    const items = (radarItems || []) as ReleaseRadarItem[];
    for (const item of items) {
      allRadarMap[item.id] = item;
    }

    const buySet = new Set(votes.filter((v) => v.vote_type === "buy").map((v) => v.release_id));
    const watchSet = new Set(votes.filter((v) => v.vote_type === "watch").map((v) => v.release_id));

    guaranteedGames = items.filter((item) => buySet.has(item.id));
    radarGames = items.filter((item) => watchSet.has(item.id));
  }

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <SiteHeader variant="strip" />
      <main id="conteudo-principal" tabIndex={-1}>
        <ProfileView
          initialProfile={fullProfile}
          initialPosts={initialPosts}
          initialGuaranteedGames={guaranteedGames}
          initialRadarGames={radarGames}
          allRadarMap={allRadarMap}
        />
      </main>
      <Footer />
    </div>
  );
}
