"use client";

import { useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";
import { useComments } from "@/lib/hooks/useComments";

interface CommentsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsDrawer({ postId, isOpen, onClose }: CommentsDrawerProps) {
  const { addComment } = useComments(postId);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comentários"
        className="
          fixed bottom-0 left-0 right-0 z-50
          md:bottom-auto md:top-0 md:right-0 md:left-auto
          md:w-[420px] md:h-full
          bg-card-slate border-t md:border-l border-brand-orange-muted/20
          animate-slide-up md:animate-slide-in-right
          flex flex-col
        "
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-orange-muted/10">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Comentários
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <CommentList postId={postId} />
        </div>

        <div className="px-4 py-3 border-t border-brand-orange-muted/10">
          <CommentForm onSubmit={(content) => addComment(content)} />
        </div>
      </div>
    </>
  );
}
