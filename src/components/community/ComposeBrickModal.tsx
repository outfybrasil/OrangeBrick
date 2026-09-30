"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AttachedArticle } from "@/lib/types/community";
import { Icon } from "@/components/ui/Icon";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

export interface ComposeBrickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (
    content: string,
    platformTag?: string,
    attachedArticle?: AttachedArticle,
    mediaUrl?: string
  ) => Promise<void>;
  initialArticle?: AttachedArticle | null;
  initialMode?: "default" | "attachment";
}

const PLATFORM_OPTIONS = ["[PS5]", "[XSX]", "[SWITCH 2]", "[PC]", "[MOBILE]"];

export function ComposeBrickModal({
  isOpen,
  onClose,
  onPublish,
  initialArticle,
  initialMode = "default",
}: ComposeBrickModalProps) {
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [attachedArticle, setAttachedArticle] = useState<AttachedArticle | null>(initialArticle || null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleClose = useCallback(() => {
    if (!isPublishing) onClose();
  }, [isPublishing, onClose]);
  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, handleClose);

  useEffect(() => {
    if (isOpen && initialMode === "attachment" && fileInputRef.current) {
      const timer = window.setTimeout(() => fileInputRef.current?.click(), 100);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const charCount = content.length;
  const isPublishDisabled = content.trim().length === 0 || charCount > 280 || isPublishing;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setPublishError("A imagem precisa ter até 5 MB.");
        e.target.value = "";
        return;
      }
      if (!file.type.startsWith("image/")) {
        setPublishError("Escolha um arquivo de imagem.");
        e.target.value = "";
        return;
      }
      setPublishError(null);
      const reader = new FileReader();
      reader.onload = () => {
        setMediaUrl(reader.result as string);
      };
      reader.onerror = () => setPublishError("Não foi possível ler a imagem. Tente outro arquivo.");
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPublishDisabled) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      await onPublish(
        content.trim(),
        selectedTag || undefined,
        attachedArticle || undefined,
        mediaUrl || undefined
      );
      setContent("");
      setSelectedTag(null);
      setAttachedArticle(null);
      setMediaUrl(null);
      onClose();
    } catch (cause) {
      setPublishError(cause instanceof Error ? cause.message : "Não foi possível publicar. Tente novamente.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (!isPublishing && event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-brick-title"
        tabIndex={-1}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-x border-t border-white/15 bg-[#16181F] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.8)] duration-200 animate-in slide-in-from-bottom sm:my-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#191b21] sm:p-6 sm:shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:slide-in-from-bottom-0 sm:fade-in"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 01-2-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 id="compose-brick-title" className="font-heading text-lg font-bold text-white">
              Criar novo Brick
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPublishing}
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
              autoFocus
              rows={4}
              maxLength={280}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setPublishError(null);
              }}
              disabled={isPublishing}
              placeholder="Qual é a sua leitura sobre esse anúncio ou jogo?"
              aria-describedby="brick-guidance brick-count"
              className="w-full resize-none rounded-xl border border-white/10 bg-background-void p-3.5 text-sm text-white outline-none transition-colors placeholder:text-[#777982] focus:border-brand-orange/60 focus-visible:outline-2 focus-visible:outline-brand-orange/30"
            />
            <div className="mt-2 flex items-start justify-between gap-4 text-xs">
              <span id="brick-guidance" className="leading-5 text-[#9698a1]">
                Debate firme, ataque pessoal não. Avise antes de spoilers.
              </span>
              <span id="brick-count" className="shrink-0 text-[#aeb0b8]">
                {charCount}/280
              </span>
            </div>
          </div>

          {publishError && <p role="alert" className="border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{publishError}</p>}

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
              disabled={isPublishing}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPublishing}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:border-brand-orange/40 hover:text-white"
            >
              <svg className="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>{mediaUrl ? "Alterar imagem" : "Anexar imagem"}</span>
            </button>
          </div>

          {/* Previsualização da Imagem Anexada */}
          {mediaUrl && (
            <div className="relative rounded-xl border border-white/10 overflow-hidden bg-black/40">
              <img loading="lazy" decoding="async" src={mediaUrl} alt="Anexo" className="max-h-48 w-full object-cover" />
              <button
                type="button"
                onClick={() => setMediaUrl(null)}
                disabled={isPublishing}
                className="absolute right-2 top-2 rounded-full bg-black/80 p-1 text-white hover:bg-brand-orange"
                title="Remover anexo"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[#aeb0b8]">
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
                    disabled={isPublishing}
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
                <img loading="lazy" decoding="async"
                  src={attachedArticle.image_url}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                  Matéria anexada
                </span>
                <p className="line-clamp-1 text-xs font-bold text-white">{attachedArticle.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setAttachedArticle(null)}
                disabled={isPublishing}
                aria-label="Remover matéria anexada"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPublishing}
              className="min-h-11 rounded-xl px-4 text-xs font-semibold text-[#b8bac2] transition-colors hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPublishDisabled}
              className="min-h-11 rounded-xl bg-brand-orange px-5 text-xs font-bold text-white transition-colors hover:bg-[#e95500] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPublishing ? "Publicando…" : "Publicar Brick"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
