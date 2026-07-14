import { Icon } from "@/components/ui/Icon";

interface NewsFeedEmptyProps {
  onRefresh?: () => void;
}

export function NewsFeedEmpty({ onRefresh }: NewsFeedEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="brick-spin">
        <Icon name="brick" size={40} className="text-brand-orange-muted opacity-40" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-mono text-gray-400">
          Nada por aqui ainda
        </p>
        <p className="text-xs font-mono text-brand-orange-muted max-w-xs">
          Ou a internet quebrou, ou a redação inteira tirou férias coletivas. A gente vai investigar.
        </p>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-sm font-mono text-brand-orange border border-brand-orange/30 hover:bg-brand-orange/10 hover:border-brand-orange/60 transition-all rounded-none mt-2 wobble-hover"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}
