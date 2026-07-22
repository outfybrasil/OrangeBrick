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
        inline-flex items-center px-2 py-0.5
        text-[10px] font-subtitle font-bold uppercase tracking-wider
        border rounded-md
        ${config.color}
      `}
    >
      {config.label}
    </span>
  );
}
