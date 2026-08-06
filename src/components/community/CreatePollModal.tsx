"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishPoll: (question: string, options: string[]) => void;
}

export function CreatePollModal({ isOpen, onClose, onPublishPoll }: CreatePollModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
  const isValid = question.trim().length > 0 && validOptions.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onPublishPoll(question.trim(), validOptions);
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  };

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background-void/90 px-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-poll-title"
        tabIndex={-1}
        className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#191b21] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:max-h-[calc(100dvh-2rem)] sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 id="create-poll-title" className="font-heading text-lg font-bold text-white">
              Criar Enquete
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar criação de enquete"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-300">
              Pergunta da Enquete
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual é o seu jogo mais aguardado de 2026?"
              className="w-full rounded-xl border border-white/10 bg-background-void p-3 text-sm text-white outline-none focus:border-brand-orange"
            />
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
              Opções de Voto (mínimo 2, máximo 4)
            </label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  required={idx < 2}
                  placeholder={`Opção ${idx + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-background-void px-3.5 py-2.5 text-xs text-white outline-none focus:border-brand-orange"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-red-400"
                    title="Remover opção"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button
                type="button"
                onClick={addOption}
                className="text-xs font-bold text-brand-orange hover:underline pt-1 block"
              >
                + Adicionar mais uma opção
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl px-4 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="min-h-11 rounded-xl bg-brand-orange px-5 text-xs font-bold text-white transition-colors hover:bg-[#e95500] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Publicar Enquete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
