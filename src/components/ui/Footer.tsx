"use client";

import Link from "next/link";
import PushSetup from "@/components/PushSetup";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { usePathname } from "next/navigation";
import { getDictionary, type Locale } from "@/lib/i18n";
import { CATEGORY_CONFIG, type PostCategory } from "@/lib/types/database";

const FOOTER_CATEGORIES: PostCategory[] = ["breaking", "review", "hardware", "opinion", "industry", "modding"];

export function Footer() {
  const pathname = usePathname();
  const currentLocale: Locale = pathname.startsWith("/en") ? "en" : "pt";
  const dict = getDictionary(currentLocale);

  return (
    <footer className="bg-[#08090C] border-t border-brand-orange-muted/10 py-8 sm:py-12 text-gray-400 text-xs font-subtitle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
        <div className="flex flex-col gap-3 sm:gap-4 sm:col-span-2">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <BrandLogo alt="Orange Brick" loading="lazy" className="h-7 w-auto sm:h-8" />
          </div>
          <p className="text-xs sm:text-xs text-gray-400 font-sans max-w-sm leading-relaxed">
            {dict.footer.description}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">{dict.footer.categories}</h2>
          <div className="flex flex-col text-xs">
            {FOOTER_CATEGORIES.map((category) => (
              <Link
                key={category}
                href={currentLocale === "en" ? `/en?category=${category}` : `/?category=${category}`}
                className="flex min-h-11 items-center transition-colors hover:text-white"
              >
                {currentLocale === "en" ? dict.categories[category] : CATEGORY_CONFIG[category].label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">{dict.footer.institutional}</h2>
          <div className="flex flex-col text-xs">
            <Link href={currentLocale === "en" ? "/en/sobre" : "/sobre"} className="flex min-h-11 items-center transition-colors hover:text-white">
              {dict.footer.about}
            </Link>
            <Link href={currentLocale === "en" ? "/en/termos" : "/termos"} className="flex min-h-11 items-center transition-colors hover:text-white">
              {dict.footer.terms}
            </Link>
            <Link href={currentLocale === "en" ? "/en/privacidade" : "/privacidade"} className="flex min-h-11 items-center transition-colors hover:text-white">
              {dict.footer.privacy}
            </Link>
            <Link href="/institucional/anuncie" className="flex min-h-11 items-center transition-colors hover:text-white">
              {dict.footer.advertise}
            </Link>
            <Link href="/contato" className="flex min-h-11 items-center transition-colors hover:text-white">
              {dict.footer.contact}
            </Link>
            <PushSetup />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-brand-orange-muted/5 mt-10 pt-6 text-center text-xs text-gray-400">
        <p suppressHydrationWarning>
          {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
