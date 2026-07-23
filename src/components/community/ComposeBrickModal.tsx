"use client";

import { useState } from "react";
import type { AttachedArticle } from "@/lib/types/community";
import { Icon } from "@/components/ui/Icon";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

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
  const [attachedArticle, setAttachedArticle] = useState<AttachedArticle | null>(initialArticle || null);
  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);
  const charCount = content.length;
  const isPublishDisabled = content.trim().length === 0 || charCount > 280;

  if (!isOpen) return null;

  const handlePublish = (event: React.FormEvent) => {
    event.preventDefault();
    if (isPublishDisabled) return;

    onPublish(content.trim(), selectedTag || undefined, attachedArticle || undefined);
    setContent("");
    setSelectedTag(null);
    setAttachedArticle(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background-void/90 px-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-brick-title"
        tabIndex={-1}
        className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#191b21] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:max-h-[calc(100dvh-2rem)] sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 id="compose-brick-title" className="font-heading text-lg font-bold text-white">
              Criar novo Brick
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar criação de Brick"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handlePublish} className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="brick-content" className="sr-only">
              Texto do Brick
            </label>
            <textarea
              id="brick-content"
              rows={4}
              maxLength={280}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Qual é a sua leitura sobre esse anúncio ou jogo?"
              aria-describedby="brick-guidance brick-count"
              className="w-full resize-none rounded-xl border border-white/10 bg-background-void p-3.5 text-sm text-white outline-none transition-colors placeholder:text-[#777982] focus:border-brand-orange/60 focus-visible:outline-2 focus-visible:outline-brand-orange/30"
            />
            <div className="mt-2 flex items-start justify-between gap-4 text-[11px]">
              <span id="brick-guidance" className="leading-5 text-[#9698a1]">
                Debate firme, ataque pessoal não. Avise antes de spoilers.
              </span>
              <span id="brick-count" className="shrink-0 text-[#aeb0b8]">
                {charCount}/280
              </span>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#aeb0b8]">
              Plataforma opcional
            </legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={`min-h-11 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand-orange ${
                      isSelected
                        ? "border-brand-orange/60 bg-brand-orange/15 text-brand-orange"
                        : "border-white/10 bg-black/15 text-[#b8bac2] hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {attachedArticle && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-orange/30 bg-background-void/80 p-3">
              {attachedArticle.image_url && (
                <img
                  src={attachedArticle.image_url}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                  Matéria anexada
                </span>
                <p className="line-clamp-1 text-xs font-bold text-white">{attachedArticle.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setAttachedArticle(null)}
                aria-label="Remover matéria anexada"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl px-4 text-xs font-semibold text-[#b8bac2] transition-colors hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPublishDisabled}
              className="min-h-11 rounded-xl bg-brand-orange px-5 text-xs font-bold text-white transition-colors hover:bg-[#e95500] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Publicar Brick
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
