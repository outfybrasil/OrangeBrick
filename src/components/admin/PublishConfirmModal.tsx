"use client";

import { useModalDialog } from "@/lib/hooks/useModalDialog";

type PublishConfirmModalProps = {
  title: string;
  publishing: boolean;
  error: string | null;
  pendingChecklist?: string[];
  showCrossPost?: boolean;
  crossPost?: boolean;
  onCrossPostChange?: (value: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PublishConfirmModal({
  title,
  publishing,
  error,
  pendingChecklist = [],
  showCrossPost = false,
  crossPost = false,
  onCrossPostChange,
  onConfirm,
  onCancel,
}: PublishConfirmModalProps) {
  const dialogRef = useModalDialog<HTMLElement>(true, onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !publishing && onCancel()}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-confirmation-title"
        aria-describedby="publish-confirmation-description"
        tabIndex={-1}
        className="w-full max-w-lg rounded-lg border border-white/10 bg-[#0e0f14] p-6 shadow-2xl shadow-black/60 focus:outline-none"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400" aria-hidden="true">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 id="publish-confirmation-title" className="mt-5 font-heading text-xl font-black text-white">
          Confirmar publicação
        </h2>
        <p id="publish-confirmation-description" className="mt-2 text-sm leading-6 text-gray-400">
          A matéria ficará disponível imediatamente no site. Confira o título antes de continuar.
        </p>
        <div className="mt-5 rounded-lg bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Matéria</p>
          <p className="mt-1.5 font-heading text-sm font-bold uppercase leading-5 text-white">{title}</p>
        </div>
        {pendingChecklist.length > 0 && (
          <div className="mt-4 border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-300">
              Checklist editorial pendente ({pendingChecklist.length})
            </p>
            <ul className="mt-1.5 space-y-1 text-xs leading-5 text-amber-200/90">
              {pendingChecklist.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <div role="alert" className="mt-4 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200">
            {error}
          </div>
        )}
        {showCrossPost && (
          <label className="mt-4 flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-4 py-3 transition-colors hover:bg-white/[0.03]">
            <input
              type="checkbox"
              checked={crossPost}
              onChange={(event) => onCrossPostChange?.(event.target.checked)}
              disabled={publishing}
              className="h-4 w-4 shrink-0 accent-brand-orange"
            />
            <span>
              <span className="block text-xs font-bold text-white">Publicar também no Brickboard</span>
              <span className="mt-0.5 block text-xs leading-4 text-gray-500">Cria uma publicação oficial vinculada a esta matéria.</span>
            </span>
          </label>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={publishing}
            className="inline-flex min-h-11 items-center justify-center rounded border border-white/10 px-4 text-xs font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={publishing}
            className="inline-flex min-h-11 items-center justify-center rounded bg-emerald-500 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-wait disabled:opacity-60"
          >
            {publishing ? "Publicando..." : "Publicar agora"}
          </button>
        </div>
      </section>
    </div>
  );
}
