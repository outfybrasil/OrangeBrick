"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { UserBadge } from "@/components/ui/UserBadge";
import { GamerBadges } from "@/components/community/GamerBadges";
import { BrickCard } from "@/components/community/BrickCard";
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { Footer } from "@/components/ui/Footer";

import type { Profile } from "@/lib/types/database";

function ProfileContent() {
  const params = useParams();
  const rawNickname = params?.nickname as string;
  const decodedNickname = decodeURIComponent(rawNickname || "");
  const supabase = useMemo(() => createDataClient(), []);

  const { posts, deletePost, sharePost, toggleReaction, addComment, deleteComment, toggleCommentLike, getComments } = useCommunityFeed();

  const [profileData, setProfileData] = useState<{
    nickname: string;
    avatar_url: string;
    bio?: string;
    created_at?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .ilike("nickname", decodedNickname)
          .maybeSingle();

        const profileRow = data as Profile | null;

        if (profileRow) {
          setProfileData({
            nickname: profileRow.nickname,
            avatar_url: profileRow.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
            bio: profileRow.bio || "Leitor do Orange Brick e entusiasta de games.",
            created_at: profileRow.created_at,
          });
        } else {
          const userPosts = posts.filter(
            (p) => p.author_name.toLowerCase().trim() === decodedNickname.toLowerCase().trim()
          );
          const avatar = userPosts[0]?.author_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

          setProfileData({
            nickname: decodedNickname,
            avatar_url: avatar,
            bio: "Leitor e participante ativo da comunidade Orange Brick.",
          });
        }
      } catch {
        setProfileData({
          nickname: decodedNickname,
          avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
          bio: "Leitor do Orange Brick.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (decodedNickname) {
      loadProfile();
    }
  }, [decodedNickname, supabase, posts]);

  const userPosts = useMemo(() => {
    return posts.filter(
      (p) => p.author_name.toLowerCase().trim() === decodedNickname.toLowerCase().trim()
    );
  }, [posts, decodedNickname]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-void">
        <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-background-void/90 backdrop-blur-md border-b border-brand-orange-muted/10 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/brickboard" className="flex items-center gap-2 text-xs font-subtitle font-bold text-gray-400 hover:text-white transition-colors">
            ← Voltar ao Brickboard
          </Link>
          <Link href="/" className="text-sm font-heading font-extrabold text-white uppercase tracking-wider">
            Orange<span className="text-brand-orange">_</span>Brick
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-dvh">
        <div className="bg-card-slate/70 border border-brand-orange-muted/20 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left relative z-10">
            <img
              src={profileData?.avatar_url}
              alt={profileData?.nickname}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-brand-orange/40 shadow-xl shrink-0"
            />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white">
                  {profileData?.nickname}
                </h1>
                <UserBadge nickname={profileData?.nickname} />
              </div>
              <p className="text-xs sm:text-sm text-gray-300 font-body leading-relaxed max-w-xl">
                {profileData?.bio}
              </p>
              <div className="pt-2">
                <GamerBadges
                  nickname={profileData?.nickname || ""}
                  postCount={userPosts.length}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-brand-orange-muted/15 text-center">
            <div className="bg-background-void/50 p-3 rounded-xl border border-brand-orange-muted/10">
              <span className="block text-xl font-heading font-black text-brand-orange">
                {userPosts.length}
              </span>
              <span className="text-[10px] font-subtitle uppercase text-gray-400 tracking-wider">
                Bricks Publicados
              </span>
            </div>
            <div className="bg-background-void/50 p-3 rounded-xl border border-brand-orange-muted/10">
              <span className="block text-xl font-heading font-black text-white">
                {userPosts.reduce((acc, curr) => acc + (curr.reactions?.hype || 0), 0)}
              </span>
              <span className="text-[10px] font-subtitle uppercase text-gray-400 tracking-wider">
                Hypes Recebidos
              </span>
            </div>
            <div className="bg-background-void/50 p-3 rounded-xl border border-brand-orange-muted/10 col-span-2 sm:col-span-1">
              <span className="block text-xl font-heading font-black text-emerald-400">
                {userPosts.reduce((acc, curr) => acc + (curr.comments_count || 0), 0)}
              </span>
              <span className="text-[10px] font-subtitle uppercase text-gray-400 tracking-wider">
                Respostas nos Bricks
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>🧱</span> Bricks de {profileData?.nickname} ({userPosts.length})
          </h3>

          {userPosts.length === 0 ? (
            <div className="bg-card-slate/40 border border-brand-orange-muted/15 rounded-2xl p-12 text-center text-gray-400 space-y-2">
              <p className="text-sm font-subtitle">Este leitor ainda não fez publicações no Brickboard.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {userPosts.map((post) => (
                <BrickCard
                  key={post.id}
                  post={post}
                  onReaction={toggleReaction}
                  onDeletePost={deletePost}
                  onSharePost={sharePost}
                  onAddComment={addComment}
                  onDeleteComment={deleteComment}
                  onToggleCommentLike={toggleCommentLike}
                  getComments={getComments}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background-void">
          <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
