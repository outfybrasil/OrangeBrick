"use client";

import { useState, useCallback } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";

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
        <div className="relative overflow-hidden bg-gradient-to-r from-card-slate/80 via-[#181A22] to-card-slate/80 border border-brand-orange-muted/20 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl backdrop-blur-md">
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
            className="inline-flex items-center gap-2 py-3 px-8 bg-brand-orange hover:bg-brand-orange/90 text-white font-subtitle text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(255,94,0,0.3)] hover:scale-[1.02] cursor-pointer"
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
  const userInitials = userDisplayName.substring(0, 2).toUpperCase();

  return (
    <div className="bg-[#15171F] border border-brand-orange-muted/20 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between text-xs font-subtitle">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-orange to-amber-500 p-[1px] flex items-center justify-center shadow-md">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#1C1E26] flex items-center justify-center">
                <span className="font-heading font-bold text-[10px] text-brand-orange">
                  {userInitials}
                </span>
              </div>
            )}
          </div>
          <span className="text-gray-300">
            Comentando como <strong className="text-white font-bold">{userDisplayName}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer text-[11px] font-semibold"
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

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-subtitle text-gray-500">
            {content.length} / 500 caracteres
          </span>

          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="
              px-6 py-2.5 text-xs font-subtitle font-bold uppercase tracking-wider
              bg-brand-orange text-white rounded-xl shadow-[0_0_15px_rgba(255,94,0,0.25)]
              hover:bg-brand-orange/90 hover:scale-[1.02] cursor-pointer
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none
              transition-all flex items-center gap-2
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
