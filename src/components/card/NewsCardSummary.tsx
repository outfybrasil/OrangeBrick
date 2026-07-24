import { normalizeAuthorTag } from "@/lib/content-validation";

interface NewsCardSummaryProps {
  summary: string;
  author: string;
  tag: string | null;
}

export function NewsCardSummary({ summary, author, tag }: NewsCardSummaryProps) {
  const normalizedTag = normalizeAuthorTag(tag);

  return (
    <div className="px-4 py-3 space-y-2">
      <p className="text-sm text-gray-200 font-body leading-relaxed line-clamp-3">
        {summary}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.08] pt-2 text-[11px] font-subtitle">
        <span className="text-gray-500">Por</span>
        <strong className="font-bold text-white">{author}</strong>
        {normalizedTag && <span className="text-brand-orange">{normalizedTag}</span>}
      </div>
    </div>
  );
}
