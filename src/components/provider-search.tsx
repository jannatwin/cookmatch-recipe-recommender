"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { RecipeCard, type MissingIngredient } from "@/components/recipe-card";
import { buttonSecondary } from "@/components/ui";

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

export function ProviderSearch() {
  const [recipes, setRecipes] = useState<ProviderRecommendation[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function search() {
    setBusy(true);
    setMessage("");
    setRecipes([]);
    try {
      const result = await apiRequest<{ data: ProviderRecommendation[]; hint?: string }>(
        "/api/v1/providers/recipes?source=spoonacular&limit=6",
      );
      setRecipes(result.data);
      if (!result.data.length)
        setMessage(result.hint ?? "Spoonacular did not find a match for these pantry items.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Spoonacular is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 rounded-[2rem] border border-lavender-line bg-lavender/40 p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-plum">Optional provider search</p>
          <h2 className="mt-1 text-xl font-extrabold">Want a few more ideas?</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-plum">
            Search Spoonacular using your pantry. This uses your provider quota and is limited to 30 searches
            per hour.
          </p>
        </div>
        <button type="button" onClick={() => void search()} disabled={busy} className={buttonSecondary}>
          {busy ? "Searching…" : "Search Spoonacular"}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-plum">
          {message}
        </p>
      )}
      {recipes.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.sourceId}
              recipe={{
                ...recipe,
                href: `/provider-recipes/spoonacular/${recipe.sourceId}`,
                providerLabel: "Spoonacular",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
