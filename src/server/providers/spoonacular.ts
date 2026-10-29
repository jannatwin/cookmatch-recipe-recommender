import "server-only";

import { z } from "zod";
import { ProviderError, type ProviderRecipeDetail, type ProviderRecipeSummary, type RecipeProvider } from "./contracts";

const ingredientSchema = z.object({
  name: z.string(),
  original: z.string().optional(),
  amount: z.number().optional(),
  unit: z.string().optional(),
});

const spoonacularSummarySchema = z.array(z.object({
  id: z.number().int(),
  title: z.string(),
  image: z.string().nullable().optional(),
  usedIngredients: z.array(ingredientSchema).default([]),
  missedIngredients: z.array(ingredientSchema).default([]),
}));

const spoonacularDetailSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  summary: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  readyInMinutes: z.number().optional().nullable(),
  cuisines: z.array(z.string()).default([]),
  diets: z.array(z.string()).default([]),
  extendedIngredients: z.array(ingredientSchema).default([]),
  analyzedInstructions: z.array(z.object({
    steps: z.array(z.object({ step: z.string() })).default([]),
  })).default([]),
});

function getApiKey() {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) throw new ProviderError("Spoonacular is not configured", "not_configured");
  return key;
}

async function requestJson(url: URL) {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new ProviderError("Spoonacular is temporarily unavailable", "unavailable");
  }
  if (response.status === 429) throw new ProviderError("Spoonacular request limit reached", "rate_limited");
  if (!response.ok) throw new ProviderError("Spoonacular request failed", "unavailable");
  try {
    return await response.json();
  } catch {
    throw new ProviderError("Spoonacular returned invalid data", "invalid_response");
  }
}

export const spoonacularProvider: RecipeProvider = {
  async searchByIngredients(ingredients, limit = 10) {
    if (!ingredients.length) return [];
    const url = new URL("https://api.spoonacular.com/recipes/findByIngredients");
    url.searchParams.set("apiKey", getApiKey());
    url.searchParams.set("ingredients", ingredients.join(","));
    url.searchParams.set("number", String(Math.max(1, Math.min(limit, 20))));
    url.searchParams.set("ranking", "1");
    url.searchParams.set("ignorePantry", "false");

    const parsed = spoonacularSummarySchema.safeParse(await requestJson(url));
    if (!parsed.success) throw new ProviderError("Spoonacular returned an unexpected response", "invalid_response");
    return parsed.data.map((recipe): ProviderRecipeSummary => ({
      provider: "spoonacular",
      sourceId: String(recipe.id),
      title: recipe.title,
      imageUrl: recipe.image ?? null,
      usedIngredientNames: recipe.usedIngredients.map((ingredient) => ingredient.name),
      missingIngredientNames: recipe.missedIngredients.map((ingredient) => ingredient.name),
      sourceUrl: null,
    }));
  },

  async getRecipe(sourceId) {
    if (!/^\d+$/.test(sourceId)) return null;
    const url = new URL(`https://api.spoonacular.com/recipes/${sourceId}/information`);
    url.searchParams.set("apiKey", getApiKey());
    const parsed = spoonacularDetailSchema.safeParse(await requestJson(url));
    if (!parsed.success) throw new ProviderError("Spoonacular returned an unexpected response", "invalid_response");
    const recipe = parsed.data;
    const ingredients = recipe.extendedIngredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount === undefined ? null : String(ingredient.amount),
      unit: ingredient.unit || null,
    }));
    return {
      provider: "spoonacular",
      sourceId: String(recipe.id),
      title: recipe.title,
      imageUrl: recipe.image ?? null,
      usedIngredientNames: [],
      missingIngredientNames: [],
      sourceUrl: recipe.sourceUrl ?? null,
      description: recipe.summary ?? null,
      cuisine: recipe.cuisines[0] ?? null,
      cookingTimeMin: recipe.readyInMinutes ?? null,
      dietaryTags: recipe.diets,
      ingredients,
      steps: recipe.analyzedInstructions.flatMap((section) => section.steps.map((step) => step.step)),
      attribution: "Recipe data provided by Spoonacular",
    } satisfies ProviderRecipeDetail;
  },
};
