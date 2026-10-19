"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function MeuBrickPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/entrar?next=%2Fmeu-brick");
      return;
    }
    if (!profile) return;
    if (!profile.username) {
      router.replace("/profile/setup?next=/meu-brick");
      return;
    }

    const hash = window.location.hash.slice(1).toLowerCase();
    if (hash === "settings" || hash === "configuracoes") {
      router.replace("/configuracoes/perfil");
      return;
    }

    const tab = hash === "salvos" || hash === "saved"
      ? "saved"
      : hash === "jogos" || hash === "games"
        ? "games"
        : hash === "posts"
          ? "bricks"
          : hash === "replies" || hash === "reposts" || hash === "bricks"
            ? hash
            : "";

    router.replace(`/u/${encodeURIComponent(profile.username)}${tab ? `#${tab}` : ""}`);
  }, [isLoading, profile, router, user]);

  return (
    <main id="conteudo-principal" tabIndex={-1} className="grid min-h-dvh place-items-center bg-background-void text-white" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-gray-300">
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />
        <span>{isLoading ? "Carregando sua conta…" : "Abrindo seu Brick…"}</span>
      </div>
    </main>
  );
}
