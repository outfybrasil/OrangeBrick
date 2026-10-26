import { ptDictionary } from "./dictionaries/pt.ts";
import { enDictionary } from "./dictionaries/en.ts";
import type { Dictionary, Locale } from "./types.ts";

export * from "./types.ts";

export const LOCALE_COOKIE_NAME = "ob_locale";
export const SUPPORTED_LOCALES: Locale[] = ["pt", "en"];
export const DEFAULT_LOCALE: Locale = "pt";

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return locale === "en" ? enDictionary : ptDictionary;
}

export function isValidLocale(value: string | null | undefined): value is Locale {
  return value === "pt" || value === "en";
}

export function detectLocale(country: string | null, acceptLanguage: string | null): Locale {
  if (country) {
    return country.toUpperCase() === "BR" ? "pt" : "en";
  }

  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.trim().toLowerCase() || "";
    if (primary.startsWith("pt")) {
      return "pt";
    }
    return "en";
  }

  return DEFAULT_LOCALE;
}
