"use client";

import { useState } from "react";
import type { AttachedArticle } from "@/lib/types/community";
import { Icon } from "@/components/ui/Icon";

interface ComposeBrickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (content: string, platformTag?: string, attachedArticle?: AttachedArticle, mediaUrl?: string) => void;
  initialArticle?: AttachedArticle | null;
}

const PLATFORM_OPTIONS = ["[PS5]", "[XSX]", "[SWITCH 2]", "[PC]", "[MOBILE]"];

export function ComposeBrickModal({ isOpen, onClose, onPublish, initialArticle }: ComposeBrickModalProps) {
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [attachedArticle, setAttachedArticle] = useState<AttachedArticle | null>(initialArticle || null);

  if (!isOpen) return null;

  const charCount = content.length;
  const isOverLimit = charCount > 280;
  const isPublishDisabled = content.trim().length === 0 || isOverLimit;

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishDisabled) return;

    onPublish(content.trim(), selectedTag || undefined, attachedArticle || undefined, mediaUrl.trim() || undefined);
    setContent("");
    setSelectedTag(null);
    setMediaUrl("");
    setAttachedArticle(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-void/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-card-slate border border-brand-orange-muted/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-brand-orange-muted/10 mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="font-heading text-lg font-bold text-white uppercase tracking-wider">
              Criar Novo Brick
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-card-slate/80 transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que você está achando desse anúncio ou jogo? Solte o verbo no Brickboard..."
              className="w-full bg-background-void border border-brand-orange-muted/15 rounded-xl p-3.5 text-white placeholder-gray-500 font-body text-sm outline-none focus:border-brand-orange/50 transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
              <span className="text-gray-500">Seja respeitoso e evite spoilers sem aviso.</span>
              <span className={isOverLimit ? "text-red-400 font-bold" : "text-gray-400"}>
                {charCount}/280
              </span>
            </div>
          </div>

          {/* SELETOR DE PLATAFORMA */}
          <div>
            <label className="block text-[11px] font-subtitle font-bold text-gray-400 uppercase tracking-wider mb-2">
              Plataforma / Tag (Opcional):
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={`px-3 py-1 rounded-lg text-xs font-subtitle font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand-orange/20 text-brand-orange border-brand-orange/50 shadow-[0_0_10px_rgba(255,94,0,0.2)]"
                        : "bg-background-void/60 text-gray-400 border-brand-orange-muted/15 hover:text-white hover:border-brand-orange/30"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MATÉRIA ANEXADA */}
          {attachedArticle && (
            <div className="relative p-3 rounded-xl bg-background-void/80 border border-brand-orange/30 flex gap-3 items-center">
              {attachedArticle.image_url && (
                <img
                  src={attachedArticle.image_url}
                  alt={attachedArticle.title}
                  className="w-16 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-subtitle font-bold text-brand-orange uppercase tracking-wider">
                  Matéria Anexada
                </span>
                <h4 className="text-xs font-subtitle font-bold text-white line-clamp-1">
                  {attachedArticle.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAttachedArticle(null)}
                className="text-gray-500 hover:text-red-400 text-xs p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* ANEXO DE IMAGEM */}
          {showMediaInput && (
            <div>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="URL da Imagem ou Screenshot (https://...)"
                className="w-full bg-background-void border border-brand-orange-muted/15 rounded-xl px-3.5 py-2 text-white placeholder-gray-500 font-body text-xs outline-none focus:border-brand-orange/50"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-brand-orange-muted/10">
            <button
              type="button"
              onClick={() => setShowMediaInput(!showMediaInput)}
              className="flex items-center gap-1.5 text-xs font-subtitle text-gray-400 hover:text-brand-orange transition-colors"
            >
              <svg className="w-4 h-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{showMediaInput ? "Remover Imagem" : "Adicionar Imagem"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-subtitle font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPublishDisabled}
                className="px-5 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-subtitle text-xs font-bold uppercase tracking-wider shadow-lg transition-all"
              >
                Publicar Brick
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
