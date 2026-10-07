"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AttachedArticle } from "@/lib/types/community";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

export interface ComposeBrickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (
    content: string,
    platformTag?: string,
    attachedArticle?: AttachedArticle,
    mediaUrl?: string,
    mediaAlt?: string
  ) => Promise<void>;
  initialArticle?: AttachedArticle | null;
  initialMediaUrl?: string | null;
  onRemoveInitialMedia?: () => void;
  initialMode?: "default" | "attachment";
}

const PLATFORM_LIST = ["PS5", "XSX", "SWITCH 2", "PC", "MOBILE"] as const;

export function ComposeBrickModal({
  isOpen,
  onClose,
  onPublish,
  initialArticle,
  initialMediaUrl = null,
  onRemoveInitialMedia,
  initialMode = "default",
}: ComposeBrickModalProps) {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [attachedArticle, setAttachedArticle] = useState<AttachedArticle | null>(initialArticle || null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaAlt, setMediaAlt] = useState("");
  const initialMediaUrlRef = useRef<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const timer = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    if (!isPublishing) onClose();
  }, [isPublishing, onClose]);

  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, handleClose);

  useEffect(() => {
    if (isOpen && initialArticle) {
      queueMicrotask(() => setAttachedArticle(initialArticle));
    }
  }, [isOpen, initialArticle]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialMediaUrl) {
      if (initialMediaUrlRef.current === initialMediaUrl) return;
      initialMediaUrlRef.current = initialMediaUrl;
      setMediaUrl(initialMediaUrl);
      setMediaAlt("");
      return;
    }
    if (initialMediaUrlRef.current) {
      if (mediaUrl === initialMediaUrlRef.current) {
        setMediaUrl(null);
        setMediaAlt("");
      }
      initialMediaUrlRef.current = null;
    }
  }, [isOpen, initialMediaUrl, mediaUrl]);

  useEffect(() => {
    if (isOpen && initialMode === "attachment" && fileInputRef.current) {
      const timer = window.setTimeout(() => fileInputRef.current?.click(), 100);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const charCount = content.length;
  const isPublishDisabled = (content.trim().length === 0 && !mediaUrl) || (Boolean(mediaUrl) && (!mediaAlt.trim() || mediaAlt.length > 300)) || charCount > 280 || isPublishing;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) {
      showToast("Escolha uma imagem PNG, JPG ou WebP de até 4 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMediaUrl(reader.result as string);
      setMediaAlt("");
      setImageFileName(file.name);
    };
    reader.onerror = () => showToast("Não foi possível ler a imagem. Tente outro arquivo.");
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setMediaUrl(null);
    setMediaAlt("");
    setImageFileName("");
    onRemoveInitialMedia?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleSpoilerButtonClick = () => {
    const textarea = textareaRef.current;
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.slice(start, end);
      const isAlreadyWrapped = selected.startsWith("||") && selected.endsWith("||");
      const nextSelection = isAlreadyWrapped ? selected.slice(2, -2) : `||${selected}||`;
      const nextContent = content.slice(0, start) + nextSelection + content.slice(end);
      if (nextContent.length <= 280) {
        setContent(nextContent);
        setIsSpoiler(true);
        return;
      }
    }
    setIsSpoiler((prev) => !prev);
  };

  const handlePublish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPublishDisabled) return;
    setIsPublishing(true);
    setToastMessage(null);

    let finalContent = content.trim();
    if (isSpoiler && !finalContent.includes("||") && finalContent.length > 0) {
      if (`||${finalContent}||`.length <= 280) {
        finalContent = `||${finalContent}||`;
      }
    }

    const platformTag =
      selectedPlatforms.length > 0
        ? selectedPlatforms.map((p) => `[${p}]`).join(" ")
        : undefined;

    try {
      await onPublish(
        finalContent,
        platformTag,
        attachedArticle || undefined,
        mediaUrl || undefined,
        mediaAlt.trim() || undefined
      );
      setContent("");
      setSelectedPlatforms([]);
      setAttachedArticle(null);
      setMediaUrl(null);
      setMediaAlt("");
      setImageFileName("");
      setIsSpoiler(false);
      onClose();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Não foi possível publicar. Tente novamente.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black/50 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (!isPublishing && event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="fixed inset-0 bg-black/40 pointer-events-none" aria-hidden="true" />
      <main
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-brick-title"
        tabIndex={-1}
        className="relative z-10 w-full min-h-dvh sm:min-h-0 sm:w-[520px] sm:max-w-full overflow-hidden sm:rounded-2xl border-0 sm:border border-[#35363d] bg-[#191a1f] shadow-2xl flex flex-col"
      >
        <header className="h-[70px] sm:h-[82px] flex items-center px-4 sm:px-6 border-b border-[#303137]">
          <span className="grid place-items-center w-7 h-7 text-[#ff6500] mr-3 shrink-0" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M5 9h14v10H5zM8 9V6h8v3M10 6V4h4v2" />
              <path d="M8 13h3m2 0h3" />
            </svg>
          </span>
          <h1 id="compose-brick-title" className="text-[17px] font-[720] tracking-[-0.2px] text-[#f1f1f3] m-0">
            Criar novo Brick
          </h1>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPublishing}
            aria-label="Fechar"
            className="ml-auto w-8 h-8 rounded grid place-items-center text-[#a1a2a9] hover:bg-white/[0.04] hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-[17px] h-[17px]">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <form onSubmit={handlePublish} className="flex flex-col flex-1">
          <div className="p-4 sm:p-6 pb-0 flex-1">
            <label className="sr-only" htmlFor="brick-text">
              Texto da publicação
            </label>
            <textarea
              id="brick-text"
              ref={textareaRef}
              autoFocus
              maxLength={280}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPublishing}
              placeholder="Qual é a sua leitura sobre esse anúncio ou jogo?"
              aria-describedby="brick-guidance brick-count"
              className="block w-full h-[110px] resize-y min-h-[84px] max-h-[230px] p-3.5 bg-[#0e0f12] border border-[#303137] rounded-[14px] text-[#f1f1f3] text-sm leading-[1.5] placeholder:text-[#81828a] outline-none focus-visible:outline-2 focus-visible:outline-[#ff6500]"
            />
            <div className="flex justify-between gap-3.5 pt-2 pb-4 text-xs text-[#96979e]">
              <span id="brick-guidance" className="max-w-[360px] leading-relaxed">
                Debate firme, ataque pessoal não. Marque spoilers antes de publicar.
              </span>
              <span
                id="brick-count"
                aria-live="polite"
                className={`font-mono tabular-nums whitespace-nowrap ${
                  charCount > 280
                    ? "text-[#ff7979] font-bold"
                    : charCount > 245
                    ? "text-[#ffb17d] font-bold"
                    : "text-[#96979e]"
                }`}
              >
                {charCount}/280
              </span>
            </div>

            <div className="h-px bg-[#303137]" />

            <div className="flex items-center gap-2.5 py-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPublishing}
                className="h-[37px] inline-flex items-center gap-2 px-3 border border-[#383940] bg-[#1e1f24] text-[#c8c8cd] text-xs font-[650] hover:border-[#606168] hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#ff6500]">
                  <path d="m8 12 6-6a4 4 0 0 1 6 6l-8 8a6 6 0 0 1-9-8l7-7" />
                  <path d="m8 16 8-8" />
                </svg>
                {mediaUrl ? "Trocar imagem" : "Anexar imagem"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageFileChange}
                disabled={isPublishing}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleSpoilerButtonClick}
                disabled={isPublishing}
                aria-pressed={isSpoiler}
                className={`h-[37px] inline-flex items-center gap-2 px-3 border text-xs font-[650] transition-colors ${
                  isSpoiler
                    ? "border-[#96502d] text-[#ff995f] bg-[#24201e]"
                    : "border-[#383940] bg-[#1e1f24] text-[#c8c8cd] hover:border-[#606168] hover:text-white"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${isSpoiler ? "text-[#ff995f]" : "text-[#ff6500]"}`}>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Spoiler
              </button>
            </div>

            {mediaUrl && (
              <div className="flex items-center gap-2.5 p-2.5 border border-[#383940] bg-[#121317] mb-4">
                <img loading="lazy" decoding="async" src={mediaUrl} alt="Prévia da imagem anexada" className="w-14 h-12 object-cover shrink-0" />
                <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[#c9c9ce] text-xs">
                  {imageFileName || "imagem.webp"}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isPublishing}
                  className="bg-transparent border-0 text-[#aaa] text-xs hover:text-white transition-colors cursor-pointer px-1"
                >
                  Remover
                </button>
              </div>
            )}

            {mediaUrl && (
              <div className="mb-4 space-y-1.5">
                <label htmlFor="brick-image-alt" className="text-xs font-semibold text-gray-200">Descrição da imagem</label>
                <textarea
                  id="brick-image-alt"
                  value={mediaAlt}
                  onChange={(event) => setMediaAlt(event.target.value)}
                  maxLength={300}
                  rows={2}
                  required
                  disabled={isPublishing}
                  aria-describedby="brick-image-alt-help"
                  className="w-full resize-y border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-orange focus:outline-none"
                  placeholder="Descreva o que aparece na imagem"
                />
                <p id="brick-image-alt-help" className="text-xs leading-5 text-gray-400">Necessária para que pessoas que não veem a imagem entendam o anexo. Até 300 caracteres.</p>
              </div>
            )}

            {attachedArticle && (
              <div className="flex items-center gap-3 p-2.5 border border-[#383940] bg-[#121317] mb-4">
                {attachedArticle.image_url && (
                  <img loading="lazy" decoding="async" src={attachedArticle.image_url} alt="" className="w-14 h-12 object-cover shrink-0" referrerPolicy="no-referrer" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff6500]">Matéria anexada</span>
                  <p className="truncate text-xs font-bold text-[#f1f1f3]">{attachedArticle.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedArticle(null)}
                  disabled={isPublishing}
                  className="bg-transparent border-0 text-[#aaa] text-xs hover:text-white transition-colors cursor-pointer px-1"
                >
                  Remover
                </button>
              </div>
            )}

            <p className="mb-2 text-[11px] font-bold text-[#b1b1b7] tracking-[0.045em]">
              PLATAFORMA <span className="ml-1 text-[#85868d] font-normal tracking-normal">OPCIONAL · escolha uma ou mais</span>
            </p>
            <div className="flex gap-2 flex-wrap pb-4" aria-label="Selecionar plataformas">
              {PLATFORM_LIST.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => togglePlatform(platform)}
                    disabled={isPublishing}
                    className={`h-[38px] sm:h-[41px] min-w-[52px] sm:min-w-[58px] px-3 border text-xs font-[650] transition-colors ${
                      isSelected
                        ? "border-[#ff6500] bg-[#211a16] text-[#ff985d]"
                        : "border-[#35363c] bg-[#15161a] text-[#bcbcc2] hover:border-[#66676f] hover:text-white"
                    }`}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>

            <label className="border-t border-[#303137] py-3.5 flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                disabled={isPublishing}
                className="w-4 h-4 accent-[#ff6500] rounded-sm cursor-pointer"
              />
              <span className="text-xs text-[#a6a7ad]">Esta publicação contém spoilers</span>
            </label>
          </div>

          <footer className="min-h-[68px] border-t border-[#303137] px-4 sm:px-6 py-3 flex items-center justify-end gap-2.5 bg-[#191a1f] mt-auto">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPublishing}
              className="h-[42px] px-4 text-[13px] font-bold text-[#b6b6bd] hover:text-white hover:bg-white/[0.04] transition-colors rounded-[2px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPublishDisabled}
              className={`min-w-[120px] h-[42px] px-4 text-[13px] font-bold rounded-[2px] transition-colors ${
                isPublishDisabled
                  ? "border border-[#713b21] bg-[#713b21] text-[#d5a181] cursor-not-allowed"
                  : "border border-[#ff6500] bg-[#ff6500] text-[#19120e] hover:bg-[#ff7921]"
              }`}
            >
              {isPublishing ? "Publicando…" : "Publicar Brick"}
            </button>
          </footer>
        </form>
      </main>

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#23242a] border border-[#414249] px-3.5 py-2.5 text-xs text-[#eee] rounded shadow-lg max-w-[90vw] z-50 animate-in fade-in"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
