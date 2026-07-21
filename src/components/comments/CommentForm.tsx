"use client";

import { useState, useCallback } from "react";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
}

export function CommentForm({ onSubmit, placeholder = "Escreva seu comentário..." }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = content.trim();
      if (!trimmed) return;

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
    [content, onSubmit]
  );

  return (
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
          px-3 py-2 text-sm font-sans text-white placeholder-gray-500
          rounded-none outline-none
          focus:border-brand-orange/60 transition-colors
          disabled:opacity-50
        "
      />
      <button
        type="submit"
        disabled={!content.trim() || isSubmitting}
        className="
          px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider
          bg-brand-orange text-black border border-brand-orange
          rounded-none
          hover:bg-brand-orange/90
          disabled:opacity-30 disabled:cursor-not-allowed
          transition-all
        "
      >
        {isSubmitting ? "..." : "Enviar"}
      </button>
    </form>
  );
}
