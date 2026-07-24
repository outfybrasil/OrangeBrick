import type { PostCategory } from "@/lib/types/database";
import { CATEGORY_CONFIG } from "@/lib/types/database";

interface TagProps {
  category: PostCategory;
}

export function Tag({ category }: TagProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <span
      className={`
        inline-flex shrink-0 items-center border-b pb-1
        text-[10px] font-subtitle font-bold uppercase tracking-[0.08em]
        ${config.color}
      `}
    >
      {config.label}
    </span>
  );
}
