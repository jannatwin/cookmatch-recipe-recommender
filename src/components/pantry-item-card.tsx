"use client";

import { useI18n } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n/config";

export type PantryItem = {
  ingredientId: number;
  name: string;
  expiryDate: string | null;
  expiringSoon: boolean;
};

export function today() {
  return new Date().toISOString().slice(0, 10);
}

function prettyDate(value: string, locale: Locale) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale === "bn" ? "bn-BD" : undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PantryItemCard({
  item,
  date,
  busy,
  onDateChange,
  onSave,
  onRemove,
}: {
  item: PantryItem;
  date: string;
  busy: boolean;
  onDateChange: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <article className="h-full rounded-[1.6rem] border border-white/80 bg-white/75 p-4 shadow-clay sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={`grid size-10 shrink-0 place-items-center rounded-2xl text-lg ${item.expiringSoon ? "bg-butter" : "bg-mint"}`}
          >
            ✓
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-extrabold">{item.name}</h3>
            <p className="mt-0.5 text-xs text-muted">
              {item.expiryDate
                ? t(item.expiryDate < today() ? "pantry.expiredOn" : "pantry.expiresOn", {
                    date: prettyDate(item.expiryDate, locale),
                  })
                : t("pantry.noExpiry")}
            </p>
          </div>
        </div>
        {item.expiringSoon && (
          <span className="shrink-0 rounded-full bg-butter px-2.5 py-1 text-[11px] font-extrabold">
            {t("pantry.useSoon")}
          </span>
        )}
        {item.expiryDate && item.expiryDate < today() && (
          <span className="shrink-0 rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-extrabold text-danger">
            {t("pantry.expired")}
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
        <div>
          <label htmlFor={`expiry-${item.ingredientId}`} className="mb-1.5 block text-xs font-bold">
            {t("pantry.expiryDate")}
          </label>
          <input
            id={`expiry-${item.ingredientId}`}
            type="date"
            min={today()}
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-white px-2 text-sm outline-none focus:ring-4 focus:ring-coral/20"
          />
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="min-h-11 rounded-xl bg-lavender/70 px-3 text-xs font-extrabold transition hover:bg-lavender focus-visible:outline-4 focus-visible:outline-cocoa"
        >
          {t("common.save")}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="min-h-11 rounded-xl border border-line-strong bg-white px-3 text-xs font-extrabold text-danger transition hover:bg-blush focus-visible:outline-4 focus-visible:outline-danger"
        >
          {t("common.remove")}
        </button>
      </div>
    </article>
  );
}
