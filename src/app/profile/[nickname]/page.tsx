"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { UserBadge } from "@/components/ui/UserBadge";
import { GamerBadges } from "@/components/community/GamerBadges";
import { BrickCard } from "@/components/community/BrickCard";
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { useAuth } from "@/lib/contexts/AuthContext";
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

  const { user } = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isOfficialProfile =
    decodedNickname.toLowerCase().trim() === "orange brick" ||
    decodedNickname.toLowerCase().trim() === "orangebrick" ||
    decodedNickname.toLowerCase().trim() === "orange_brick";

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
        const defaultAvatar = isOfficialProfile
          ? `${basePath}/logos/Logo Tijolo Quebrado.PNG`
          : (googleAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80");

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .ilike("nickname", decodedNickname)
          .maybeSingle();

        const profileRow = data as Profile | null;

        if (profileRow) {
          const finalAvatar = profileRow.avatar_url || defaultAvatar;
          const finalBio = profileRow.bio || "Leitor do Orange Brick e entusiasta de games.";
          setProfileData({
            nickname: profileRow.nickname,
            avatar_url: finalAvatar,
            bio: finalBio,
            created_at: profileRow.created_at,
          });
          setEditAvatarUrl(profileRow.avatar_url || "");
          setEditBio(profileRow.bio || "");
        } else {
          const userPosts = posts.filter(
            (p) => p.author_name.toLowerCase().trim() === decodedNickname.toLowerCase().trim()
          );
          const avatar = userPosts[0]?.author_avatar || defaultAvatar;

          setProfileData({
            nickname: decodedNickname,
            avatar_url: avatar,
            bio: "Leitor e participante ativo da comunidade Orange Brick.",
          });
          setEditAvatarUrl(avatar);
          setEditBio("Leitor e participante ativo da comunidade Orange Brick.");
        }
      } catch {
        setProfileData({
          nickname: decodedNickname,
          avatar_url: isOfficialProfile ? `${basePath}/logos/Logo Tijolo Quebrado.PNG` : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
          bio: "Leitor do Orange Brick.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (decodedNickname) {
      loadProfile();
    }
  }, [decodedNickname, supabase, posts, isOfficialProfile, basePath, user]);

  const userPosts = useMemo(() => {
    return posts.filter(
      (p) => p.author_name.toLowerCase().trim() === decodedNickname.toLowerCase().trim()
    );
  }, [posts, decodedNickname]);

  const isProfileOwner =
    user && profileData &&
    (user.user_metadata?.full_name?.toLowerCase() === profileData.nickname.toLowerCase() ||
     isOfficialProfile);

  const handleSaveProfile = async () => {
    if (!user || !profileData) return;
    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          nickname: profileData.nickname,
          avatar_url: editAvatarUrl.trim() || null,
          bio: editBio.trim() || null,
          updated_at: new Date().toISOString(),
        });

      if (!updateError) {
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                avatar_url: editAvatarUrl.trim() || prev.avatar_url,
                bio: editBio.trim() || prev.bio,
              }
            : prev
        );
        setIsEditModalOpen(false);
      }
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetGoogleAvatar = () => {
    const googlePic = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
    setEditAvatarUrl(googlePic);
  };

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
            <div className="relative group/avatar">
              <img
                src={profileData?.avatar_url}
                alt={profileData?.nickname}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-brand-orange/40 shadow-xl shrink-0"
              />
              {isProfileOwner && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity text-xs font-bold text-white cursor-pointer"
                >
                  ✏️ Alterar
                </button>
              )}
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white">
                  {profileData?.nickname}
                </h1>
                <UserBadge nickname={profileData?.nickname} />
                {isProfileOwner && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs font-subtitle text-brand-orange hover:underline ml-2"
                  >
                    ✏️ Editar Perfil
                  </button>
                )}
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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-void/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full bg-card-slate border border-brand-orange-muted/20 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-orange-muted/15">
              <h3 className="font-heading text-base font-bold text-white uppercase tracking-wider">
                ✏️ Editar Foto e Perfil
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  URL da Foto de Perfil (Avatar)
                </label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://sua-foto.com/imagem.png"
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-xl p-2.5 outline-none focus:border-brand-orange/50 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetGoogleAvatar}
                  className="text-[11px] font-subtitle font-bold text-brand-orange hover:underline bg-brand-orange/10 px-2.5 py-1.5 rounded-lg border border-brand-orange/30 transition-all"
                >
                  Restaurar Foto do Google
                </button>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Bio / Apresentação
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="Conte um pouco sobre quais consoles e jogos você curte..."
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-xl p-2.5 outline-none focus:border-brand-orange/50 text-xs font-body"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-orange-muted/15">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-subtitle text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-subtitle text-xs font-bold uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

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
