import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import type { PostCategory } from "@/lib/types/database";

interface NewsCardHeaderProps {
  category: PostCategory;
  publishedAt: string;
}

export function NewsCardHeader({ category, publishedAt }: NewsCardHeaderProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Tag category={category} />
      <Timer date={publishedAt} />
    </div>
  );
}
