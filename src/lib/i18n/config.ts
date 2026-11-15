// Languages CookMatch is offered in. English is the canonical catalog language; Bangla text is
// stored beside it and falls back to English wherever a translation is missing.
export const LOCALES = ["en", "bn"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "cookmatch_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * The visitor's language: their saved choice, otherwise the first supported language in the
 * browser's Accept-Language list, otherwise English.
 */
export function resolveLocale(cookieValue: string | undefined, acceptLanguage?: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const language = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if (isLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}

/** Catalog text in the visitor's language, falling back to the English original. */
export function localized(locale: Locale, english: string, bangla: string | null | undefined): string;
export function localized(
  locale: Locale,
  english: string | null,
  bangla: string | null | undefined,
): string | null;
export function localized(locale: Locale, english: string | null, bangla: string | null | undefined) {
  return locale === "bn" && bangla ? bangla : english;
}
