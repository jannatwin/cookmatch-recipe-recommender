"use client";

import { useI18n } from "@/components/locale-provider";
import { inputClass, Panel } from "@/components/ui";

export type Filters = {
  cuisine: string;
  maxTime: string;
  diet: string;
  almostOnly: string;
  minScore: string;
};
export type FilterOption = { value: string; label: string };

export const initialFilters: Filters = { cuisine: "", maxTime: "", diet: "", almostOnly: "", minScore: "" };

function FilterSelect({
  id,
  label,
  anyLabel,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  anyLabel: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-extrabold">
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RecipeFilters({
  filters,
  cuisines,
  diets,
  showMatchFilters,
  onChange,
  onClear,
}: {
  filters: Filters;
  cuisines: FilterOption[];
  diets: FilterOption[];
  showMatchFilters: boolean;
  onChange: (key: keyof Filters, value: string) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const hasFilters = Object.values(filters).some(Boolean);
  const timeOptions: FilterOption[] = [
    ...[15, 30, 45].map((count) => ({ value: String(count), label: t("filters.minutes", { count }) })),
    { value: "60", label: t("filters.oneHour") },
  ];
  const matchOptions: FilterOption[] = [
    ...[25, 50, 75].map((count) => ({ value: String(count), label: t("filters.percentMatch", { count }) })),
    { value: "100", label: t("filters.fullMatch") },
  ];
  return (
    <Panel className="mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">{t("filters.title")}</h2>
          <p className="mt-1 text-sm text-muted">
            {showMatchFilters ? t("filters.helpMatch") : t("filters.help")}
          </p>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-10 rounded-full px-3 text-sm font-bold underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-cocoa"
          >
            {t("common.clearFilters")}
          </button>
        )}
      </div>
      <div className={`grid gap-3 sm:grid-cols-2 ${showMatchFilters ? "lg:grid-cols-5" : "lg:grid-cols-3"}`}>
        <FilterSelect
          id="cuisine"
          label={t("filters.cuisine")}
          anyLabel={t("filters.anyCuisine")}
          value={filters.cuisine}
          options={cuisines}
          onChange={(value) => onChange("cuisine", value)}
        />
        <FilterSelect
          id="max-time"
          label={t("filters.readyWithin")}
          anyLabel={t("filters.anyTime")}
          value={filters.maxTime}
          options={timeOptions}
          onChange={(value) => onChange("maxTime", value)}
        />
        <FilterSelect
          id="diet"
          label={t("filters.diet")}
          anyLabel={t("filters.anyDiet")}
          value={filters.diet}
          options={diets}
          onChange={(value) => onChange("diet", value)}
        />
        {showMatchFilters && (
          <>
            <FilterSelect
              id="match-score"
              label={t("filters.minMatch")}
              anyLabel={t("filters.anyMatch")}
              value={filters.minScore}
              options={matchOptions}
              onChange={(value) => onChange("minScore", value)}
            />
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line-strong bg-white px-4 text-sm font-bold">
              <input
                type="checkbox"
                checked={filters.almostOnly === "true"}
                onChange={(event) => onChange("almostOnly", event.target.checked ? "true" : "")}
                className="size-5 accent-coral-deep"
              />
              {t("filters.almost")}
            </label>
          </>
        )}
      </div>
    </Panel>
  );
}
