import "server-only";

import { z } from "zod";
import { ProviderError, type ProviderRecipeDetail, type RecipeProvider } from "./contracts";

const mealSchema = z.object({
  idMeal: z.string(),
  strMeal: z.string(),
  strCategory: z.string().nullable().optional(),
  strArea: z.string().nullable().optional(),
  strInstructions: z.string().nullable().optional(),
  strMealThumb: z.string().nullable().optional(),
  strSource: z.string().nullable().optional(),
}).passthrough();
const mealsResponseSchema = z.object({ meals: z.array(z.unknown()).nullable() });

function getApiKey() {
  const key = process.env.THEMEALDB_API_KEY;
  if (!key) throw new ProviderError("TheMealDB is not configured", "not_configured");
  return key;
}

async function requestJson(url: URL) {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new ProviderError("TheMealDB is temporarily unavailable", "unavailable");
  }
  if (!response.ok) throw new ProviderError("TheMealDB request failed", "unavailable");
  try {
    return await response.json();
  } catch {
    throw new ProviderError("TheMealDB returned invalid data", "invalid_response");
  }
}

function getIngredients(meal: Record<string, unknown>) {
  const ingredients: Array<{ name: string; amount: string | null; unit: string | null }> = [];
  for (let index = 1; index <= 20; index += 1) {
    const name = meal[`strIngredient${index}`];
    if (typeof name === "string" && name.trim()) {
      const measure = meal[`strMeasure${index}`];
      ingredients.push({ name: name.trim(), amount: typeof measure === "string" ? measure.trim() || null : null, unit: null });
    }
  }
  return ingredients;
}

export const theMealDbProvider: RecipeProvider = {
  async searchByIngredients(ingredients, limit = 10) {
    if (!ingredients.length) return [];
    // V1's filter endpoint accepts one ingredient at a time; cap fan-out to avoid bursts.
    const requested = ingredients.slice(0, 5);
    const responses = await Promise.all(requested.map(async (ingredient) => {
      const url = new URL(`https://www.themealdb.com/api/json/v1/${encodeURIComponent(getApiKey())}/filter.php`);
      url.searchParams.set("i", ingredient);
      const parsed = mealsResponseSchema.safeParse(await requestJson(url));
      if (!parsed.success) throw new ProviderError("TheMealDB returned an unexpected response", "invalid_response");
      return (parsed.data.meals ?? []).flatMap((raw) => {
        const meal = mealSchema.safeParse(raw);
        if (!meal.success) return [];
        return [{
          provider: "themealdb" as const,
          sourceId: meal.data.idMeal,
          title: meal.data.strMeal,
          imageUrl: meal.data.strMealThumb ?? null,
          usedIngredientNames: [ingredient],
          missingIngredientNames: [],
          sourceUrl: meal.data.strSource ?? null,
        }];
      });
    }));

    return [...new Map(responses.flat().map((meal) => [meal.sourceId, meal])).values()].slice(0, Math.min(limit, 20));
  },

  async getRecipe(sourceId) {
    if (!/^\d+$/.test(sourceId)) return null;
    const url = new URL(`https://www.themealdb.com/api/json/v1/${encodeURIComponent(getApiKey())}/lookup.php`);
    url.searchParams.set("i", sourceId);
    const response = mealsResponseSchema.safeParse(await requestJson(url));
    if (!response.success) throw new ProviderError("TheMealDB returned an unexpected response", "invalid_response");
    const raw = response.data.meals?.[0];
    if (!raw || typeof raw !== "object") return null;
    const meal = mealSchema.safeParse(raw);
    if (!meal.success) throw new ProviderError("TheMealDB returned an unexpected recipe", "invalid_response");
    const detail = meal.data;
    const ingredients = getIngredients(raw as Record<string, unknown>);
    const steps = (detail.strInstructions ?? "").split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
    return {
      provider: "themealdb",
      sourceId: detail.idMeal,
      title: detail.strMeal,
      imageUrl: detail.strMealThumb ?? null,
      usedIngredientNames: [],
      missingIngredientNames: [],
      sourceUrl: detail.strSource ?? null,
      description: null,
      cuisine: detail.strArea ?? null,
      cookingTimeMin: null,
      dietaryTags: [],
      ingredients,
      steps,
      attribution: "Recipe data provided by TheMealDB",
    } satisfies ProviderRecipeDetail;
  },
};
