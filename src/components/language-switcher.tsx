"use client";

import { useI18n } from "@/components/locale-provider";
import { saveLocaleChoice } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n/config";

const shortLabel: Record<Locale, string> = { en: "EN", bn: "বাং" };

// English / Bangla toggle. The choice is kept in a cookie so the server renders pages and
// catalog data in that language; the page reloads so every list is fetched again.
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();

  function choose(next: Locale) {
    if (next === locale) return;
    saveLocaleChoice(next);
    window.location.reload();
  }

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={`flex shrink-0 items-center rounded-full border border-line-strong bg-white/70 p-1 ${className}`}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === locale}
          aria-label={t(`lang.${option}`)}
          title={t(`lang.${option}`)}
          onClick={() => choose(option)}
          className={`min-h-9 min-w-10 rounded-full px-2.5 text-xs font-extrabold transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa ${option === locale ? "bg-cocoa text-white" : "text-muted hover:bg-white"}`}
        >
          {shortLabel[option]}
        </button>
      ))}
    </div>
  );
}
