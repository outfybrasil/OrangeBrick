"use client";

import { usePathname } from "next/navigation";
import type { PostCategory } from "@/lib/types/database";
import { CATEGORY_CONFIG } from "@/lib/types/database";
import { getDictionary } from "@/lib/i18n";

interface TagProps {
  category: PostCategory;
  locale?: "pt" | "en";
}

export function Tag({ category, locale: forcedLocale }: TagProps) {
  const pathname = usePathname();
  const locale = forcedLocale || (pathname?.startsWith("/en") ? "en" : "pt");
  const config = CATEGORY_CONFIG[category];
  const dict = getDictionary(locale);
  const label = dict.categories[category] || config.label;

  return (
    <span
      className="inline-flex shrink-0 items-center border-b pb-1 text-xs font-subtitle font-bold uppercase tracking-[0.06em]"
      style={{ color: config.color, borderBottomColor: `${config.color}66` }}
    >
      {label}
    </span>
  );
}
