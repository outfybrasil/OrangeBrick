"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function MyBrickRedirectPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (profile?.username) {
      router.replace(`/profile/${encodeURIComponent(profile.username)}`);
      return;
    }
    router.replace(user ? "/profile/setup" : "/");
  }, [isLoading, profile?.username, router, user]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background-void" aria-label="Abrindo Meu Brick">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
    </main>
  );
}
