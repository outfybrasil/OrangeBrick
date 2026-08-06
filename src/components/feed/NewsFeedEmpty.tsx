import { Icon } from "@/components/ui/Icon";

interface NewsFeedEmptyProps {
  onRefresh?: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export function NewsFeedEmpty({
  onRefresh,
  title = "Nada por aqui ainda",
  description = "Não foi possível encontrar matérias agora. Tente carregar o feed novamente.",
  actionLabel = "Tentar novamente",
}: NewsFeedEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="brick-spin">
        <Icon name="brick" size={40} className="text-brand-orange-muted opacity-40" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-white">
          {title}
        </p>
        <p className="max-w-sm text-sm leading-6 text-gray-300">
          {description}
        </p>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-2 min-h-11 border border-brand-orange/40 px-4 text-sm font-bold text-brand-orange transition-colors hover:border-brand-orange hover:bg-brand-orange/10"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
