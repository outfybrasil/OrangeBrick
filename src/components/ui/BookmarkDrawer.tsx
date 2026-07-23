"use client";

import Link from "next/link";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { Icon } from "@/components/ui/Icon";

interface BookmarkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarkDrawer({ isOpen, onClose }: BookmarkDrawerProps) {
  const { bookmarks, toggleBookmark } = useBookmarks();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background-void/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-card-slate border-l border-brand-orange-muted/20 h-full p-6 flex flex-col justify-between shadow-2xl relative">
        <div className="space-y-6 overflow-hidden flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 border-b border-brand-orange-muted/15">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔖</span>
              <h3 className="font-heading text-lg font-bold text-white uppercase tracking-wider">
                Matérias Salvas ({bookmarks.length})
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-card-slate/80 transition-colors"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {bookmarks.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <span className="text-3xl opacity-50 block">📌</span>
                <p className="text-xs text-gray-400 font-subtitle">
                  Você ainda não salvou nenhuma matéria. Clique no ícone de marcador nas notícias para ler depois!
                </p>
              </div>
            ) : (
              bookmarks.map((post) => (
                <div
                  key={post.id}
                  className="bg-background-void/70 border border-brand-orange-muted/15 rounded-xl p-3.5 flex gap-3 items-center group hover:border-brand-orange/30 transition-all"
                >
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-16 h-12 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/posts/${post.slug}`}
                      onClick={onClose}
                      className="text-xs font-subtitle font-bold text-white line-clamp-2 hover:text-brand-orange transition-colors"
                    >
                      {post.title}
                    </Link>
                    <span className="text-[10px] font-body text-gray-400 block mt-1">
                      {new Date(post.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleBookmark(post)}
                    className="text-gray-500 hover:text-red-400 p-1 text-xs transition-colors shrink-0"
                    title="Remover das matérias salvas"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-brand-orange-muted/15">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-brand-orange-muted/20 text-gray-300 font-subtitle text-xs font-bold uppercase tracking-wider hover:bg-brand-orange-muted/30 transition-colors"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
}
