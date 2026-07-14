import { Icon } from "@/components/ui/Icon";

interface NewsCardErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function NewsCardError({
  message = "Erro ao carregar notícia",
  onRetry,
}: NewsCardErrorProps) {
  return (
    <div className="bg-card-slate border border-red-500/30 rounded-none p-6 flex flex-col items-center justify-center gap-3 text-center">
      <Icon name="brick" size={32} className="text-red-400" />
      <p className="text-sm text-red-400 font-mono">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-1.5 text-xs font-mono text-brand-orange border border-brand-orange/40 hover:bg-brand-orange/10 transition-colors rounded-none"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
