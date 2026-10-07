"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileTabs, type ProfileActiveTab } from "./ProfileTabs";
import { ProfileGamesTab } from "./ProfileGamesTab";
import { ProfileRepliesTab, type UserReplyItem } from "./ProfileRepliesTab";
import { ProfileSidebar } from "./ProfileSidebar";
import { ProfileFollowModal, type FollowUserItem } from "./ProfileFollowModal";
import { BrickCard } from "@/components/community/BrickCard";
import { createDataClient } from "@/lib/supabase/client";
import { getCommunityCommentLikeSummaries } from "@/lib/community-comment-likes";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSavedBricks } from "@/lib/hooks/useSavedBricks";
import type { PublicProfileData } from "@/lib/types/progression";
import type { ReleaseRadarItem, ReactionType } from "@/lib/types/database";
import type { CommunityPost, SharedPostData, CommunityComment } from "@/lib/types/community";

interface ProfileViewProps {
  initialProfile: PublicProfileData;
  initialPosts: CommunityPost[];
  initialGuaranteedGames: ReleaseRadarItem[];
  initialRadarGames: ReleaseRadarItem[];
  allRadarMap?: Record<string, ReleaseRadarItem>;
}

export function ProfileView({
  initialProfile,
  initialPosts,
  initialGuaranteedGames,
  initialRadarGames,
  allRadarMap = {},
}: ProfileViewProps) {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const isOwner = Boolean(user && user.id === initialProfile.user_id);

  const [activeTab, setActiveTab] = useState<ProfileActiveTab>("bricks");
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [replies, setReplies] = useState<UserReplyItem[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [hasLoadedReplies, setHasLoadedReplies] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<"followers" | "following">("followers");
  const [followModalUsers, setFollowModalUsers] = useState<FollowUserItem[]>([]);
  const [followModalLoading, setFollowModalLoading] = useState(false);

  const { savedBricks } = useSavedBricks();

  const loadFollowsData = useCallback(async () => {
    try {
      const [{ count: fCount }, { count: ingCount }] = await Promise.all([
        supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("follow_type", "profile")
          .eq("follow_value", initialProfile.username),
        supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("follow_type", "profile")
          .eq("user_id", initialProfile.user_id),
      ]);
      setFollowersCount(fCount || 0);
      setFollowingCount(ingCount || 0);

      if (user && !isOwner) {
        const { data: myFollow } = await supabase
          .from("user_follows")
          .select("id")
          .eq("user_id", user.id)
          .eq("follow_type", "profile")
          .eq("follow_value", initialProfile.username)
          .maybeSingle();
        setIsFollowing(Boolean(myFollow));
      }
    } catch {
    }
  }, [initialProfile.user_id, initialProfile.username, isOwner, supabase, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadFollowsData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFollowsData]);

  const handleToggleFollow = async () => {
    if (!user || isOwner || followLoading) return;
    setFollowLoading(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (nextState) {
        const { error } = await supabase.from("user_follows").insert({
          user_id: user.id,
          follow_type: "profile",
          follow_value: initialProfile.username,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("follow_type", "profile")
          .eq("follow_value", initialProfile.username);
        if (error) throw error;
      }
    } catch {
      setIsFollowing(!nextState);
      setFollowersCount((prev) => (nextState ? Math.max(0, prev - 1) : prev + 1));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenFollowModal = async (type: "followers" | "following") => {
    setFollowModalType(type);
    setFollowModalOpen(true);
    setFollowModalLoading(true);

    try {
      if (type === "followers") {
        const { data } = await supabase
          .from("user_follows")
          .select("user_id")
          .eq("follow_type", "profile")
          .eq("follow_value", initialProfile.username)
          .limit(30);

        const ids = (data || []).map((r) => r.user_id);
        if (ids.length > 0) {
          const { data: profiles } = await supabase
            .from("public_profiles")
            .select("id, username, display_name, avatar_url, bio")
            .in("user_id", ids);
          setFollowModalUsers((profiles || []) as FollowUserItem[]);
        } else {
          setFollowModalUsers([]);
        }
      } else {
        const { data } = await supabase
          .from("user_follows")
          .select("follow_value")
          .eq("follow_type", "profile")
          .eq("user_id", initialProfile.user_id)
          .limit(30);

        const usernames = (data || []).map((r) => r.follow_value);
        if (usernames.length > 0) {
          const { data: profiles } = await supabase
            .from("public_profiles")
            .select("id, username, display_name, avatar_url, bio")
            .in("username", usernames);
          setFollowModalUsers((profiles || []) as FollowUserItem[]);
        } else {
          setFollowModalUsers([]);
        }
      }
    } catch {
      setFollowModalUsers([]);
    } finally {
      setFollowModalLoading(false);
    }
  };

  const loadReplies = useCallback(async () => {
    if (hasLoadedReplies || loadingReplies) return;
    setLoadingReplies(true);
    try {
      const { data: commentRows } = await supabase
        .from("community_comments")
        .select("id, content, created_at, post_id")
        .eq("user_id", initialProfile.user_id)
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = (commentRows || []) as Array<{ id: string; content: string; created_at: string; post_id: string }>;
      const postIds = Array.from(new Set(rows.map((r) => r.post_id)));

      const parentMap: Record<string, { id: string; content: string; author_name: string; author_username?: string | null }> = {};
      if (postIds.length > 0) {
        const { data: parentPosts } = await supabase
          .from("community_posts")
          .select("id, content, author_name, author_username")
          .in("id", postIds);

        const pList = (parentPosts || []) as Array<{ id: string; content: string; author_name: string; author_username?: string | null }>;
        for (const p of pList) {
          parentMap[p.id] = p;
        }
      }

      const commentIds = rows.map((r) => r.id);
      const likesMap: Record<string, number> = {};
      if (commentIds.length > 0) {
        const likes = await getCommunityCommentLikeSummaries(supabase, commentIds);
        for (const like of likes) {
          likesMap[like.comment_id] = like.likes_count;
        }
      }

      setReplies(
        rows.map((r) => ({
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          likes_count: likesMap[r.id] || 0,
          post_id: r.post_id,
          original_post: parentMap[r.post_id] || null,
        }))
      );
      setHasLoadedReplies(true);
    } catch {
    } finally {
      setLoadingReplies(false);
    }
  }, [hasLoadedReplies, initialProfile.user_id, loadingReplies, supabase]);

  const handleTabChange = (tab: ProfileActiveTab) => {
    setActiveTab(tab);
    if (tab === "replies") void loadReplies();
  };

  const handleReaction = async (postId: string, type: ReactionType) => {
    if (!user) return false;
    try {
      interface ExistingReaction {
        id: string;
        reaction_type: ReactionType;
      }
      const { data: existingData } = await supabase
        .from("community_reactions")
        .select("id, reaction_type")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      const existing = existingData as ExistingReaction | null;

      if (existing) {
        if (existing.reaction_type === type) {
          await supabase.from("community_reactions").delete().eq("id", existing.id);
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    reactions: {
                      ...p.reactions,
                      [type]: Math.max(0, p.reactions[type] - 1),
                    },
                    user_reaction: null,
                  }
                : p
            )
          );
          return false;
        } else {
          await supabase
            .from("community_reactions")
            .update({ reaction_type: type })
            .eq("id", existing.id);
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    reactions: {
                      ...p.reactions,
                      [existing.reaction_type as ReactionType]: Math.max(
                        0,
                        p.reactions[existing.reaction_type as ReactionType] - 1
                      ),
                      [type]: p.reactions[type] + 1,
                    },
                    user_reaction: type,
                  }
                : p
            )
          );
          return true;
        }
      } else {
        await supabase.from("community_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: type,
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  reactions: { ...p.reactions, [type]: p.reactions[type] + 1 },
                  user_reaction: type,
                }
              : p
          )
        );
        return true;
      }
    } catch {
      return false;
    }
  };

  const handleSharePost = async (post: CommunityPost, comment: string) => {
    if (!user) throw new Error("Entre na sua conta para compartilhar um Brick.");
    const authorName = user.user_metadata?.full_name || initialProfile.display_name;
    const authorUsername = initialProfile.username;
    const sharedData: SharedPostData = {
      _type: "shared_post",
      original_post_id: post.id,
      original_author_name: post.author_name,
      original_author_username: post.author_username,
      original_author_avatar: post.author_avatar,
      original_content: post.content,
      original_created_at: post.created_at,
      original_platform_tag: post.platform_tag || undefined,
      original_attached_article: post.attached_article,
    };
    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      author_name: authorName,
      author_username: authorUsername,
      author_avatar: initialProfile.avatar_url || "",
      content: comment.trim(),
      attached_article: sharedData,
    });
    if (error) throw new Error("Não foi possível republicar este Brick. Tente novamente.");
  };

  const handleAddComment = async (postId: string, content: string, parentId?: string) => {
    if (!user) return;
    await supabase.from("community_comments").insert({
      post_id: postId,
      user_id: user.id,
      author_name: user.user_metadata?.full_name || initialProfile.display_name,
      author_username: initialProfile.username,
      author_avatar: initialProfile.avatar_url || "",
      content: content.trim(),
      parent_id: parentId || null,
    });
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("community_comments").delete().eq("id", commentId);
  };

  const getComments = async (postId: string): Promise<CommunityComment[]> => {
    const { data } = await supabase
      .from("community_comments")
      .select("id, post_id, parent_id, user_id, author_name, author_username, author_avatar, is_official, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    interface RawCommentRow {
      id: string;
      post_id: string;
      parent_id: string | null;
      user_id: string;
      author_name: string;
      author_username: string | null;
      author_avatar: string;
      is_official?: boolean;
      content: string;
      created_at: string;
    }

    const rows = (data || []) as RawCommentRow[];
    return rows.map((c) => ({
      ...c,
      likes_count: 0,
    }));
  };

  const handleDeletePost = async (postId: string) => {
    if (!isOwner || !user) throw new Error("Você não tem permissão para apagar esta publicação.");
    const { data: deletedPost, error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Não foi possível apagar a publicação. Tente novamente.");
    if (!deletedPost) throw new Error("A publicação não foi encontrada ou você não tem permissão para apagá-la.");
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const repostPosts = useMemo(
    () => posts.filter((p) => Boolean(p.shared_post)),
    [posts]
  );
  const directBricks = useMemo(
    () => posts.filter((p) => !p.shared_post),
    [posts]
  );

  const totalGamesCount =
    (initialProfile.playing_now ? 1 : 0) +
    (initialProfile.favorite_games?.length || 0) +
    initialGuaranteedGames.length +
    initialRadarGames.length;

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <ProfileBanner
        bannerUrl={initialProfile.banner_url}
        username={initialProfile.username}
      />

      <div className="mx-auto max-w-7xl">
        <ProfileHeader
          userId={initialProfile.user_id}
          username={initialProfile.username}
          displayName={initialProfile.display_name}
          avatarUrl={initialProfile.avatar_url}
          bio={initialProfile.bio}
          isOfficial={initialProfile.is_official}
          isOwner={isOwner}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          isFollowLoading={followLoading}
          onToggleFollow={handleToggleFollow}
          onOpenFollowers={() => void handleOpenFollowModal("followers")}
          onOpenFollowing={() => void handleOpenFollowModal("following")}
        />

        <div className="mt-6 px-4 sm:px-6 lg:px-8">
          <ProfileStats
            bricksCount={initialProfile.stats?.posts || posts.length}
            hypesCount={initialProfile.stats?.reactions_received || 0}
            gamesCount={totalGamesCount}
          />
        </div>

        <div className="mt-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-8">
              <ProfileTabs
                activeTab={activeTab}
                onChangeTab={handleTabChange}
                isOwner={isOwner}
                bricksCount={directBricks.length}
                repliesCount={initialProfile.stats?.comments}
                gamesCount={totalGamesCount}
              />

              <div className="mt-6">
                {activeTab === "bricks" && (
                  <div>
                    {directBricks.length === 0 ? (
                      <div className="rounded-sm border border-white/10 bg-[#111217] p-8 text-center text-sm text-gray-400">
                        {isOwner ? (
                          <div className="space-y-3">
                            <p>Seu primeiro Brick começa aqui.</p>
                            <Link
                              href="/brickboard"
                              className="inline-flex min-h-11 items-center justify-center rounded-sm bg-brand-orange px-5 text-xs font-black uppercase text-white hover:bg-[#d94f00]"
                            >
                              Publicar no BrickBoard
                            </Link>
                          </div>
                        ) : (
                          <p>Este usuário ainda não publicou nenhum Brick.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {directBricks.map((brick) => (
                          <BrickCard
                            key={brick.id}
                            post={brick}
                            onReaction={handleReaction}
                            onDeletePost={isOwner ? handleDeletePost : undefined}
                            onSharePost={handleSharePost}
                            onAddComment={handleAddComment}
                            onDeleteComment={handleDeleteComment}
                            getComments={getComments}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "replies" && (
                  <ProfileRepliesTab replies={replies} isLoading={loadingReplies} />
                )}

                {activeTab === "games" && (
                  <ProfileGamesTab
                    playingNow={initialProfile.playing_now}
                    favoriteGames={initialProfile.favorite_games || []}
                    guaranteedGames={initialGuaranteedGames}
                    radarGames={initialRadarGames}
                    allRadarItemsMap={allRadarMap}
                    isOwner={isOwner}
                  />
                )}

                {activeTab === "reposts" && (
                  <div>
                    {repostPosts.length === 0 ? (
                      <div className="rounded-sm border border-white/10 bg-[#111217] p-8 text-center text-sm text-gray-400">
                        Nenhum Brick republicado ainda.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {repostPosts.map((brick) => (
                          <div key={brick.id} className="space-y-1">
                            <p className="px-2 text-xs font-bold text-gray-400">
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-400 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M7.5 15l-3-3 3-3m9 6 3-3-3-3" /></svg>Republicado por {initialProfile.display_name}
                            </p>
                            <BrickCard
                              post={brick}
                              onReaction={handleReaction}
                              onDeletePost={isOwner ? handleDeletePost : undefined}
                              onSharePost={handleSharePost}
                              onAddComment={handleAddComment}
                              onDeleteComment={handleDeleteComment}
                              getComments={getComments}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "saved" && isOwner && (
                  <div>
                    {savedBricks.length === 0 ? (
                      <div className="rounded-sm border border-white/10 bg-[#111217] p-8 text-center text-sm text-gray-400">
                        Nenhum Brick salvo ainda.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {savedBricks.map((brick) => (
                          <BrickCard
                            key={brick.id}
                            post={brick}
                            onReaction={handleReaction}
                            onSharePost={handleSharePost}
                            onAddComment={handleAddComment}
                            onDeleteComment={handleDeleteComment}
                            getComments={getComments}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:col-span-4 lg:block">
              <ProfileSidebar
                playingNow={initialProfile.playing_now}
                favoriteGames={initialProfile.favorite_games || []}
                guaranteedGames={initialGuaranteedGames}
                radarGames={initialRadarGames}
                allRadarItemsMap={allRadarMap}
                isOwner={isOwner}
              />
            </div>
          </div>
        </div>
      </div>

      <ProfileFollowModal
        isOpen={followModalOpen}
        type={followModalType}
        username={initialProfile.username}
        items={followModalUsers}
        isLoading={followModalLoading}
        onClose={() => setFollowModalOpen(false)}
      />
    </div>
  );
}
