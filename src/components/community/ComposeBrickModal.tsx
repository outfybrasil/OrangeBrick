"use client";

import { useState, useRef, useEffect } from "react";
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
    mediaUrl?: string,
    pollOptions?: string[]
  ) => void;
  initialArticle?: AttachedArticle | null;
  initialMode?: "default" | "attachment" | "poll";
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
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setShowPollBuilder(initialMode === "poll");
      if (initialMode === "attachment" && fileInputRef.current) {
        setTimeout(() => fileInputRef.current?.click(), 100);
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const charCount = content.length;
  const validPollOptions = pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
  const isPollValid = !showPollBuilder || validPollOptions.length >= 2;
  const isPublishDisabled = content.trim().length === 0 || charCount > 280 || !isPollValid;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = (event: React.FormEvent) => {
    event.preventDefault();
    if (isPublishDisabled) return;

    onPublish(
      content.trim(),
      selectedTag || undefined,
      attachedArticle || undefined,
      mediaUrl || undefined,
      showPollBuilder && validPollOptions.length >= 2 ? validPollOptions : undefined
    );

    setContent("");
    setSelectedTag(null);
    setAttachedArticle(null);
    setMediaUrl(null);
    setShowPollBuilder(false);
    setPollOptions(["", ""]);
    onClose();
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const updatePollOption = (index: number, val: string) => {
    const next = [...pollOptions];
    next[index] = val;
    setPollOptions(next);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 01-2-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

          {/* Botões de Ação Rápida (Anexo de Imagem e Enquete) */}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:border-brand-orange/40 hover:text-white"
            >
              <svg className="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>{mediaUrl ? "Alterar imagem" : "Anexar Imagem"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPollBuilder(!showPollBuilder)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                showPollBuilder
                  ? "border-brand-orange bg-brand-orange/15 text-brand-orange"
                  : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-brand-orange/40 hover:text-white"
              }`}
            >
              <svg className="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>{showPollBuilder ? "Remover Enquete" : "Criar Enquete"}</span>
            </button>
          </div>

          {/* Previsualização da Imagem Anexada */}
          {mediaUrl && (
            <div className="relative rounded-xl border border-white/10 overflow-hidden bg-black/40">
              <img src={mediaUrl} alt="Anexo" className="max-h-48 w-full object-cover" />
              <button
                type="button"
                onClick={() => setMediaUrl(null)}
                className="absolute right-2 top-2 rounded-full bg-black/80 p-1 text-white hover:bg-brand-orange"
                title="Remover anexo"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}

          {/* Construtor de Enquete Personalizada */}
          {showPollBuilder && (
            <div className="rounded-xl border border-brand-orange/30 bg-background-void/90 p-3.5 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                Opções da sua Enquete (mínimo 2)
              </span>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Opção ${idx + 1}`}
                    value={opt}
                    onChange={(e) => updatePollOption(idx, e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-[#111217] px-3 py-1.5 text-xs text-white outline-none focus:border-brand-orange"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(idx)}
                      className="text-xs text-gray-500 hover:text-red-400 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={addPollOption}
                  className="text-xs font-bold text-brand-orange hover:underline pt-1 block"
                >
                  + Adicionar mais uma opção
                </button>
              )}
            </div>
          )}

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
