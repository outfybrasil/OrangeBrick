interface NewsCardSummaryProps {
  summary: string;
  author: string;
  tag: string | null;
}

export function NewsCardSummary({ summary, author, tag }: NewsCardSummaryProps) {
  return (
    <div className="px-4 py-3 space-y-2">
      <p className="text-sm text-gray-200 font-body leading-relaxed line-clamp-3">
        {summary}
      </p>
      <div className="flex items-center gap-1.5 text-xs font-subtitle font-medium text-brand-orange">
        {tag && <span className="opacity-70">{tag}</span>}
        <span className={tag ? "" : "opacity-70"}>
          — {author}
        </span>
      </div>
    </div>
  );
}
