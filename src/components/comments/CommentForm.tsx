"use client";

import { useState, useCallback } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getGoogleAvatarUrl, resolveAvatarUrl } from "@/lib/avatar";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
}

export function CommentForm({ onSubmit, placeholder = "O que você achou dessa matéria? Compartilhe sua opinião com a comunidade..." }: CommentFormProps) {
  const { user, profile, signOut } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = content.trim();
      if (!trimmed || !user) return;

      setIsSubmitting(true);
      try {
        await onSubmit(trimmed);
        setContent("");
      } catch {
        return;
      } finally {
        setIsSubmitting(false);
      }
    },
    [content, onSubmit, user]
  );

  if (!user) {
    return (
      <>
        <div className="relative space-y-4 overflow-hidden rounded-2xl border border-brand-orange-muted/20 bg-card-slate/80 p-5 text-center shadow-xl sm:rounded-3xl sm:p-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-orange/15 border border-brand-orange/30 text-brand-orange shadow-[0_0_15px_rgba(255,94,0,0.2)]">
            <span className="text-xl">💬</span>
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="font-heading text-base sm:text-lg font-black text-white uppercase tracking-wider">
              Quer participar dessa discussão?
            </h4>
            <p className="text-xs sm:text-sm text-gray-400 font-subtitle leading-relaxed">
              Faça login com sua conta Google para enviar seus comentários e interagir com outros leitores.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-orange/90 xs:w-auto sm:text-sm"
          >
            <span>Fazer Login para Comentar</span>
            <span>→</span>
          </button>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  const userDisplayName = profile?.nickname || user.email?.split("@")[0] || "Usuário";
  const avatarUrl = resolveAvatarUrl(profile?.avatar_url || getGoogleAvatarUrl(user), userDisplayName);

  return (
    <div className="bg-[#15171F] border border-brand-orange-muted/20 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between text-xs font-subtitle">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-orange to-amber-500 p-[1px] flex items-center justify-center shadow-md">
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: "26px", height: "26px", minWidth: "26px", minHeight: "26px", maxWidth: "26px", maxHeight: "26px", borderRadius: "9999px", objectFit: "cover" }}
              className="shrink-0 bg-[#08090C]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = resolveAvatarUrl(null, userDisplayName);
              }}
            />
          </div>
          <span className="text-gray-300">
            Comentando como <strong className="text-white font-bold">{userDisplayName}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="min-h-11 rounded-xl px-3 text-[11px] font-semibold text-red-300/75 transition-colors hover:bg-red-500/15 hover:text-red-200"
        >
          Sair
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          rows={3}
          disabled={isSubmitting}
          className="
            w-full bg-[#0D0F14] border border-gray-800 focus:border-brand-orange
            px-4 py-3 text-sm font-body text-white placeholder-gray-500
            rounded-xl outline-none transition-all resize-none shadow-inner
            disabled:opacity-50
          "
        />

        <div className="flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between">
          <span className="text-[11px] font-subtitle text-gray-500">
            {content.length} / 500 caracteres
          </span>

          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="
              min-h-11 px-6 text-xs font-subtitle font-bold uppercase tracking-wider
              bg-brand-orange text-white rounded-xl shadow-[0_0_15px_rgba(255,94,0,0.25)]
              hover:bg-brand-orange/90 hover:scale-[1.02] cursor-pointer
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none
              transition-all flex w-full items-center justify-center gap-2 xs:w-auto
            "
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Publicar Comentário</span>
                <span>🚀</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
