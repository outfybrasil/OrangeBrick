"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (targetLocale: Locale) => {
    if (targetLocale === currentLocale || isPending) return;

    document.cookie = `${LOCALE_COOKIE_NAME}=${targetLocale}; path=/; max-age=31536000; SameSite=Lax`;

    let nextPath = pathname;
    if (targetLocale === "en") {
      if (!pathname.startsWith("/en")) {
        nextPath = pathname === "/" ? "/en" : `/en${pathname}`;
      }
    } else {
      if (pathname.startsWith("/en")) {
        nextPath = pathname.replace(/^\/en(?:\/|$)/, "/") || "/";
      }
    }

    startTransition(() => {
      router.push(nextPath);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1 border border-white/10 bg-black/40 px-2 py-1 text-xs">
      <Globe className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
      <button
        type="button"
        onClick={() => handleSwitch("pt")}
        disabled={isPending}
        className={`px-1 py-0.5 font-mono font-bold transition-colors ${
          currentLocale === "pt"
            ? "text-brand-orange"
            : "text-gray-400 hover:text-white"
        }`}
        aria-label="Mudar para Português"
      >
        PT
      </button>
      <span className="text-gray-600">/</span>
      <button
        type="button"
        onClick={() => handleSwitch("en")}
        disabled={isPending}
        className={`px-1 py-0.5 font-mono font-bold transition-colors ${
          currentLocale === "en"
            ? "text-brand-orange"
            : "text-gray-400 hover:text-white"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
