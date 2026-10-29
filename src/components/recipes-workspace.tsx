"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { RecipeCard, type MissingIngredient, type RecipeSummary } from "@/components/recipe-card";
import { buttonSecondary, EmptyState, inputClass, PageHeading, Panel } from "@/components/ui";

type Filters = { cuisine: string; maxTime: string; diet: string; almostOnly: string; minScore: string };
type CatalogOption = { cuisineId?: number; tagId?: number; name: string };
type Recommendation = Omit<RecipeSummary, "href" | "imageUrl"> & { recipeId: number; imageUrl: string | null };
type ProviderRecommendation = {
  sourceId: string;
  title: string;
  imageUrl: string | null;
  cuisine: string | null;
  cookingTimeMin: number | null;
  dietaryTags: string[];
  matchScore: number;
  requiredCount: number;
  haveCount: number;
  missingCount: number;
  almostAchievable: boolean;
  missingIngredients: MissingIngredient[];
};

const initialFilters: Filters = { cuisine: "", maxTime: "", diet: "", almostOnly: "", minScore: "" };

export function RecipesWorkspace() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [cuisines, setCuisines] = useState<CatalogOption[]>([]);
  const [tags, setTags] = useState<CatalogOption[]>([]);
  const [recipes, setRecipes] = useState<Recommendation[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [providerRecipes, setProviderRecipes] = useState<ProviderRecommendation[]>([]);
  const [providerBusy, setProviderBusy] = useState(false);
  const [providerError, setProviderError] = useState("");

  useEffect(() => {
    apiRequest<{ data: Array<{ cuisineId: number; name: string }> }>("/api/v1/cuisines").then(({ data }) => setCuisines(data.map((item) => ({ cuisineId: item.cuisineId, name: item.name })))).catch(() => {});
    apiRequest<{ data: Array<{ tagId: number; name: string }> }>("/api/v1/dietary-tags").then(({ data }) => setTags(data.map((item) => ({ tagId: item.tagId, name: item.name })))).catch(() => {});
  }, []);

  const fetchRecipes = useCallback(async (page: number) => {
    const query = new URLSearchParams({ page: String(page), limit: "12" });
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
    return apiRequest<{ data: Recommendation[]; pagination: { page: number; totalPages: number; totalItems: number } }>(`/api/v1/recommendations?${query}`);
  }, [filters]);

  useEffect(() => {
    fetchRecipes(1)
      .then((result) => { setRecipes(result.data); setPagination(result.pagination); setError(""); })
      .catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : "Could not load recipe matches."); setRecipes([]); setPagination({ page: 1, totalPages: 1, totalItems: 0 }); })
      .finally(() => setLoading(false));
  }, [fetchRecipes]);

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
      setError(cause instanceof Error ? cause.message : "Could not load more recipes.");
    } finally { setLoading(false); }
  }

  async function searchSpoonacular() {
    setProviderBusy(true);
    setProviderError("");
    setProviderRecipes([]);
    try {
      const result = await apiRequest<{ data: ProviderRecommendation[] }>("/api/v1/providers/recipes?source=spoonacular&limit=6");
      setProviderRecipes(result.data);
      if (!result.data.length) setProviderError("Spoonacular did not find a match for these pantry items.");
    } catch (cause) {
      setProviderError(cause instanceof Error ? cause.message : "Spoonacular is unavailable right now.");
    } finally {
      setProviderBusy(false);
    }
  }

  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <>
      <PageHeading
        eyebrow="Good ideas, ranked for your pantry"
        title="Recipes for tonight"
        description="Start with your CookMatch recipes, then fine-tune by time, cuisine or diet. Your best pantry matches stay at the top."
        action={<Link href="/pantry" className={buttonSecondary}>Edit pantry</Link>}
      />
      <Panel className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-extrabold">Find your kind of dinner</h2><p className="mt-1 text-sm text-[#765b4d]">Filters work together and keep the match ranking.</p></div>
          {hasFilters && <button type="button" onClick={clearFilters} className="min-h-10 rounded-full px-3 text-sm font-bold underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-cocoa">Clear filters</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><label htmlFor="cuisine" className="mb-1.5 block text-xs font-extrabold">Cuisine</label><select id="cuisine" value={filters.cuisine} onChange={(event) => updateFilter("cuisine", event.target.value)} className={inputClass}><option value="">Any cuisine</option>{cuisines.map((item) => <option key={item.cuisineId} value={item.cuisineId}>{item.name}</option>)}</select></div>
          <div><label htmlFor="max-time" className="mb-1.5 block text-xs font-extrabold">Ready within</label><select id="max-time" value={filters.maxTime} onChange={(event) => updateFilter("maxTime", event.target.value)} className={inputClass}><option value="">Any time</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option></select></div>
          <div><label htmlFor="diet" className="mb-1.5 block text-xs font-extrabold">Dietary preference</label><select id="diet" value={filters.diet} onChange={(event) => updateFilter("diet", event.target.value)} className={inputClass}><option value="">Any preference</option>{tags.map((item) => <option key={item.tagId} value={item.name}>{item.name}</option>)}</select></div>
          <div><label htmlFor="match-score" className="mb-1.5 block text-xs font-extrabold">At least this match</label><select id="match-score" value={filters.minScore} onChange={(event) => updateFilter("minScore", event.target.value)} className={inputClass}><option value="">Any match</option><option value="25">25% match</option><option value="50">50% match</option><option value="75">75% match</option><option value="100">Full match</option></select></div>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-[#d3b8a5] bg-white px-4 text-sm font-bold"><input type="checkbox" checked={filters.almostOnly === "true"} onChange={(event) => updateFilter("almostOnly", event.target.checked ? "true" : "")} className="size-5 accent-[#d96f58]" />Almost achievable</label>
        </div>
      </Panel>

      <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-xl font-extrabold">CookMatch collection</h2><p className="mt-1 text-sm text-[#765b4d]">{pagination.totalItems} recipe{pagination.totalItems === 1 ? "" : "s"} {hasFilters ? "match your filters" : "ranked for your pantry"}</p></div></div>
      {error && <p role="alert" className="mb-4 rounded-2xl bg-[#ffe1dd] px-4 py-3 text-sm font-semibold text-[#7b2b22]">{error}</p>}
      {loading && recipes.length === 0 ? <div role="status" className="rounded-3xl bg-white/60 px-5 py-10 text-center font-semibold">Finding recipes for your pantry…</div>
        : recipes.length === 0 ? <EmptyState title="No recipes matched this time" description={hasFilters ? "Try widening your filters, or add more ingredients to improve your matches." : "Add ingredients to your pantry and we’ll find recipes that fit."} action={<Link href={hasFilters ? "/recipes" : "/pantry"} onClick={hasFilters ? (event) => { event.preventDefault(); clearFilters(); } : undefined} className={buttonSecondary}>{hasFilters ? "Clear filters" : "Add pantry ingredients"}</Link>} />
          : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{recipes.map((recipe) => <RecipeCard key={recipe.recipeId} recipe={{ ...recipe, href: `/recipes/${recipe.recipeId}`, providerLabel: "CookMatch recipe" }} />)}</div>}
      {pagination.page < pagination.totalPages && recipes.length > 0 && <div className="mt-7 text-center"><button type="button" onClick={() => void showMoreRecipes()} disabled={loading} className={buttonSecondary}>{loading ? "Loading…" : "Show more recipes"}</button></div>}

      <section className="mt-12 rounded-[2rem] border border-[#d8c9ec] bg-lavender/40 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#695287]">Optional provider search</p><h2 className="mt-1 text-xl font-extrabold">Want a few more ideas?</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#5f516f]">Search Spoonacular using your pantry. This uses your provider quota and is limited to 30 searches per hour.</p></div>
          <button type="button" onClick={() => void searchSpoonacular()} disabled={providerBusy} className={buttonSecondary}>{providerBusy ? "Searching…" : "Search Spoonacular"}</button>
        </div>
        {providerError && <p role="status" className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-[#574773]">{providerError}</p>}
        {providerRecipes.length > 0 && <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{providerRecipes.map((recipe) => <RecipeCard key={recipe.sourceId} recipe={{ ...recipe, href: `/provider-recipes/spoonacular/${recipe.sourceId}`, providerLabel: "Spoonacular" }} />)}</div>}
      </section>
    </>
  );
}
