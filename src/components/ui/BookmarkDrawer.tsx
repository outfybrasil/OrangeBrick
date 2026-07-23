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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-background-void/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card-slate border-l border-brand-orange-muted/20 h-dvh p-4 sm:p-6 flex flex-col justify-between shadow-2xl relative"
      >
        <div className="space-y-5 overflow-hidden flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 border-b border-brand-orange-muted/15">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-brand-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              <h3 className="font-heading text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                Matérias Salvas ({bookmarks.length})
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-card-slate/80 transition-colors cursor-pointer"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {bookmarks.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <svg className="w-10 h-10 text-gray-500/60 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 19.007l-4.5-3.149-4.5 3.149V6.75A2.25 2.25 0 0110.843 4.5h4.314a2.25 2.25 0 012.25 2.25v12.257z" />
                </svg>
                <p className="text-xs text-gray-400 font-subtitle">
                  Você ainda não salvou nenhuma matéria. Clique no ícone de marcador nas notícias para ler depois!
                </p>
              </div>
            ) : (
              bookmarks.map((post) => (
                <div
                  key={post.id}
                  className="bg-background-void/70 border border-brand-orange-muted/15 rounded-xl p-3 flex gap-3 items-center group hover:border-brand-orange/30 transition-all"
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
                    className="text-gray-400 hover:text-red-400 p-1.5 transition-colors shrink-0 cursor-pointer"
                    title="Remover das matérias salvas"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-brand-orange-muted/15">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-brand-orange-muted/20 text-gray-300 font-subtitle text-xs font-bold uppercase tracking-wider hover:bg-brand-orange-muted/30 transition-colors cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
}
