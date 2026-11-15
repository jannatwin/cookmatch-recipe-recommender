"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translate";

// English is the fallback for anything rendered outside the provider (global-error.tsx).
const I18nContext = createContext<Translator>(createTranslator(DEFAULT_LOCALE));

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const translator = useMemo(() => createTranslator(locale), [locale]);
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>;
}

/** Interface text, plural forms and numerals in the visitor's language. */
export function useI18n() {
  return useContext(I18nContext);
}
