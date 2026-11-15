"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { useI18n } from "@/components/locale-provider";
import { ProviderSearch } from "@/components/provider-search";
import { RecentlyViewed } from "@/components/recently-viewed";
import { RecipeCard, type RecipeSummary } from "@/components/recipe-card";
import { initialFilters, RecipeFilters, type FilterOption, type Filters } from "@/components/recipe-filters";
import { buttonSecondary, EmptyState, PageHeading } from "@/components/ui";

type Recommendation = Omit<RecipeSummary, "href" | "imageUrl"> & {
  recipeId: number;
  imageUrl: string | null;
};
type RecommendationPage = {
  data: Recommendation[];
  hint?: string;
  guest?: boolean;
  pagination: { page: number; totalPages: number; totalItems: number };
};

const emptyPagination = { page: 1, totalPages: 1, totalItems: 0 };

export function RecipesWorkspace() {
  const { t, plural, errorText } = useI18n();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [cuisines, setCuisines] = useState<FilterOption[]>([]);
  const [diets, setDiets] = useState<FilterOption[]>([]);
  const [recipes, setRecipes] = useState<Recommendation[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pantryEmpty, setPantryEmpty] = useState(false);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    apiRequest<{ data: Array<{ cuisineId: number; name: string }> }>("/api/v1/cuisines")
      .then(({ data }) =>
        setCuisines(data.map((item) => ({ value: String(item.cuisineId), label: item.name }))),
      )
      .catch(() => {});
    apiRequest<{ data: Array<{ tagId: number; name: string }> }>("/api/v1/dietary-tags")
      .then(({ data }) => setDiets(data.map((item) => ({ value: item.name, label: item.name }))))
      .catch(() => {});
  }, []);

  const fetchRecipes = useCallback(
    async (page: number) => {
      const query = new URLSearchParams({ page: String(page), limit: "12" });
      for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
      return apiRequest<RecommendationPage>(`/api/v1/recommendations?${query}`);
    },
    [filters],
  );

  useEffect(() => {
    let active = true; // ignore responses for filters that have since changed
    fetchRecipes(1)
      .then((result) => {
        if (!active) return;
        setRecipes(result.data);
        setPagination(result.pagination);
        setPantryEmpty(Boolean(result.hint));
        setGuest(Boolean(result.guest));
        setError("");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(errorText(cause, "recipes.loadError"));
        setRecipes([]);
        setPagination(emptyPagination);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchRecipes, errorText]);

  function updateFilter(key: keyof Filters, value: string) {
    setLoading(true);
    setError("");
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setLoading(true);
    setError("");
    setFilters(initialFilters);
  }

  async function showMoreRecipes() {
    setLoading(true);
    try {
      const result = await fetchRecipes(pagination.page + 1);
      setRecipes((current) => [...current, ...result.data]);
      setPagination(result.pagination);
      setError("");
    } catch (cause) {
      setError(errorText(cause, "recipes.loadMoreError"));
    } finally {
      setLoading(false);
    }
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const countLabel = plural(
    hasFilters ? "recipes.countFiltered" : guest ? "recipes.countGuest" : "recipes.countRanked",
    pagination.totalItems,
  );

  return (
    <>
      <PageHeading
        eyebrow={guest ? t("recipes.eyebrowGuest") : t("recipes.eyebrow")}
        title={t("recipes.title")}
        description={guest ? t("recipes.descriptionGuest") : t("recipes.description")}
        action={
          guest ? (
            <Link href="/register" className={buttonSecondary}>
              {t("recipes.matchMyPantry")}
            </Link>
          ) : (
            <Link href="/pantry" className={buttonSecondary}>
              {t("recipes.editPantry")}
            </Link>
          )
        }
      />
      <RecentlyViewed />
      <RecipeFilters
        filters={filters}
        cuisines={cuisines}
        diets={diets}
        showMatchFilters={!guest}
        onChange={updateFilter}
        onClear={clearFilters}
      />

      <div className="mb-4">
        <h2 className="text-xl font-extrabold">{t("recipes.collection")}</h2>
        <p className="mt-1 text-sm text-muted">{countLabel}</p>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {error}
        </p>
      )}
      {loading && recipes.length === 0 ? (
        <div role="status" className="rounded-3xl bg-white/60 px-5 py-10 text-center font-semibold">
          {t("recipes.finding")}
        </div>
      ) : pantryEmpty ? (
        <EmptyState
          title={t("recipes.pantryEmptyTitle")}
          description={t("recipes.pantryEmptyDescription")}
          action={
            <Link href="/pantry" className={buttonSecondary}>
              {t("recipes.addPantryIngredients")}
            </Link>
          }
        />
      ) : recipes.length === 0 ? (
        <EmptyState
          title={t("recipes.noneTitle")}
          description={
            hasFilters ? t("recipes.noneFiltered") : guest ? t("recipes.noneGuest") : t("recipes.noneUser")
          }
          action={
            hasFilters ? (
              <button type="button" onClick={clearFilters} className={buttonSecondary}>
                {t("common.clearFilters")}
              </button>
            ) : (
              <Link href={guest ? "/" : "/pantry"} className={buttonSecondary}>
                {guest ? t("recipes.backHome") : t("recipes.addPantryIngredients")}
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.recipeId}
              recipe={{
                ...recipe,
                href: `/recipes/${recipe.recipeId}`,
                providerLabel: t("card.cookmatch"),
                guest,
              }}
            />
          ))}
        </div>
      )}
      {pagination.page < pagination.totalPages && recipes.length > 0 && (
        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={() => void showMoreRecipes()}
            disabled={loading}
            className={buttonSecondary}
          >
            {loading ? t("recipes.loadingMore") : t("recipes.showMore")}
          </button>
        </div>
      )}

      {!guest && <ProviderSearch />}
    </>
  );
}
