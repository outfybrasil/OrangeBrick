"use client";

import { Icon } from "@/components/ui/Icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-4 text-center">
      <Icon name="brick" size={48} className="text-red-400" />
      <h1 className="text-lg font-mono font-bold text-white">
        Algo quebrou
      </h1>
      <p className="text-sm text-gray-400 font-sans max-w-md">
        {error.message || "Erro inesperado ao carregar a página."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 text-sm font-mono text-brand-orange border border-brand-orange/40 hover:bg-brand-orange/10 transition-colors rounded-none mt-2"
      >
        Tentar novamente
      </button>
    </div>
  );
}
