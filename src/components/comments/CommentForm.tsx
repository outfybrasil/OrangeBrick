"use client";

import { useState, useCallback } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
}

export function CommentForm({ onSubmit, placeholder = "Escreva seu comentário..." }: CommentFormProps) {
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
        <div className="p-6 bg-card-slate/50 border border-brand-orange-muted/20 rounded-2xl text-center space-y-3">
          <div className="text-2xl">💬</div>
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
            Quer participar dessa discussão?
          </h4>
          <p className="text-xs text-gray-400 font-subtitle max-w-sm mx-auto">
            Faça login com sua conta Google para enviar comentários nas matérias.
          </p>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="inline-block py-2.5 px-6 bg-brand-orange hover:bg-brand-orange/90 text-white font-subtitle text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
          >
            Fazer Login para Comentar
          </button>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-subtitle text-gray-400">
        <span className="flex items-center gap-2">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          Comentando como <strong className="text-white font-bold">{profile?.nickname || user.email}</strong>
        </span>
        <button
          type="button"
          onClick={signOut}
          className="text-gray-500 hover:text-brand-orange transition-colors cursor-pointer text-[11px]"
        >
          Sair
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          disabled={isSubmitting}
          className="
            flex-1 bg-background-void border border-brand-orange-muted/30
            px-4 py-2.5 text-sm font-body text-white placeholder-gray-500
            rounded-xl outline-none
            focus:border-brand-orange/60 transition-colors
            disabled:opacity-50
          "
        />
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="
            px-5 py-2.5 text-xs font-subtitle font-bold uppercase tracking-wider
            bg-brand-orange text-white rounded-xl shadow-md
            hover:bg-brand-orange/90 cursor-pointer
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all
          "
        >
          {isSubmitting ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
