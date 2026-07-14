import { NewsCardSkeleton } from "@/components/card/NewsCardSkeleton";
import { Icon } from "@/components/ui/Icon";

export function NewsFeedSkeleton() {
  return (
    <div aria-label="Carregando notícias...">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-brand-orange-muted/10">
        <div className="brick-bounce">
          <Icon name="brick" size={18} className="text-brand-orange" />
        </div>
        <p className="text-xs font-mono text-brand-orange-muted animate-pulse">
          Quebrando os tijolos...
        </p>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
