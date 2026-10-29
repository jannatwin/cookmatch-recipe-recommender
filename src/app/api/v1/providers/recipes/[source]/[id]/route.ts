import { z } from "zod";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { listPantry } from "@/server/services/pantry";
import { normalizeIngredientName, resolveIngredientNames } from "@/server/services/ingredients";
import { spoonacularProvider } from "@/server/providers/spoonacular";
import { theMealDbProvider } from "@/server/providers/themealdb";
import { ProviderError } from "@/server/providers/contracts";

const paramsSchema = z.object({ source: z.enum(["themealdb", "spoonacular"]), id: z.string().min(1).max(100) });
type Context = { params: Promise<{ source: string; id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) throw new ApiError(400, "VALIDATION_ERROR", "Provider recipe identifier is invalid");
    const provider = params.data.source === "spoonacular" ? spoonacularProvider : theMealDbProvider;
    const recipe = await provider.getRecipe(params.data.id);
    if (!recipe) throw new ApiError(404, "NOT_FOUND", "Provider recipe was not found");

    const [pantry, resolved] = await Promise.all([
      listPantry(supabase, user.id),
      resolveIngredientNames(supabase, recipe.ingredients.map((ingredient) => ingredient.name)),
    ]);
    const pantryIds = new Set(pantry.map((item) => item.ingredientId));
    const pantryNames = new Set(pantry.map((item) => normalizeIngredientName(item.name)));
    const ingredients = recipe.ingredients.map((ingredient) => {
      const match = resolved.get(normalizeIngredientName(ingredient.name));
      const inPantry = match ? pantryIds.has(match.id) : pantryNames.has(normalizeIngredientName(ingredient.name));
      return {
        ingredientId: match?.id ?? null,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        inPantry,
      };
    });
    const requiredKeys = new Set(ingredients.map((ingredient) => (
      ingredient.ingredientId === null ? `name:${normalizeIngredientName(ingredient.name)}` : `id:${ingredient.ingredientId}`
    )));
    const haveKeys = new Set(ingredients.flatMap((ingredient) => ingredient.inPantry
      ? [ingredient.ingredientId === null ? `name:${normalizeIngredientName(ingredient.name)}` : `id:${ingredient.ingredientId}`]
      : []));
    const haveCount = haveKeys.size;
    return Response.json({
      source: recipe.provider,
      sourceId: recipe.sourceId,
      sourceUrl: recipe.sourceUrl,
      attribution: recipe.attribution,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      cuisine: recipe.cuisine,
      cookingTimeMin: recipe.cookingTimeMin,
      dietaryTags: recipe.dietaryTags,
      ingredients,
      steps: recipe.steps.map((instruction, index) => ({ stepNumber: index + 1, instruction })),
      matchScore: requiredKeys.size ? Math.round((haveCount / requiredKeys.size) * 1000) / 10 : 0,
      missingCount: requiredKeys.size - haveCount,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      const status = error.kind === "not_configured" ? 503 : error.kind === "rate_limited" ? 429 : 502;
      return Response.json({ error: { code: error.kind.toUpperCase(), message: error.message } }, { status });
    }
    return apiErrorResponse(error);
  }
}
