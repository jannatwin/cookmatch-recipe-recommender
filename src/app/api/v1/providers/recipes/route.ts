import { z } from "zod";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { listPantry } from "@/server/services/pantry";
import { normalizeIngredientName, resolveIngredientNames } from "@/server/services/ingredients";
import { spoonacularProvider } from "@/server/providers/spoonacular";
import { theMealDbProvider } from "@/server/providers/themealdb";
import { ProviderError } from "@/server/providers/contracts";

const querySchema = z.object({
  source: z.enum(["themealdb", "spoonacular"]),
  limit: z.coerce.number().int().positive().max(10).default(10),
});

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Provider search parameters are invalid", query.error.issues.map((issue) => ({
        field: issue.path.join("."), issue: issue.message,
      })));
    }

    const pantry = await listPantry(supabase, user.id);
    if (!pantry.length) {
      return Response.json({ data: [], hint: "Add ingredients to your pantry before searching recipe providers" });
    }

    const provider = query.data.source === "spoonacular" ? spoonacularProvider : theMealDbProvider;
    const resultLimit = query.data.source === "themealdb" ? Math.min(query.data.limit, 5) : query.data.limit;
    const summaries = await provider.searchByIngredients(pantry.map((item) => item.name), resultLimit);
    const details = query.data.source === "themealdb"
      ? await Promise.all(summaries.map((summary) => provider.getRecipe(summary.sourceId)))
      : [];
    const detailById = new Map(details.flatMap((detail) => detail ? [[detail.sourceId, detail] as const] : []));
    const pantryIds = new Set(pantry.map((item) => item.ingredientId));
    const pantryNames = new Map(pantry.map((item) => [normalizeIngredientName(item.name), item.ingredientId]));

    const recipeNames = summaries.flatMap((summary) => {
      const detail = detailById.get(summary.sourceId);
      return detail
        ? detail.ingredients.map((ingredient) => ingredient.name)
        : [...summary.usedIngredientNames, ...summary.missingIngredientNames];
    });
    const resolvedNames = recipeNames.length ? await resolveIngredientNames(supabase, recipeNames) : new Map();
    const recommendations = summaries.map((summary) => {
      const detail = detailById.get(summary.sourceId);
      const requiredNames = detail
        ? detail.ingredients.map((ingredient) => ingredient.name)
        : [...summary.usedIngredientNames, ...summary.missingIngredientNames];
      const required = new Map<string, { name: string; ingredientId: number | null }>();
      for (const name of requiredNames) {
        const normalized = normalizeIngredientName(name);
        const match = resolvedNames.get(normalized);
        const key = match ? `id:${match.id}` : `name:${normalized}`;
        if (!required.has(key)) required.set(key, { name, ingredientId: match?.id ?? null });
      }
      const have = [...required.values()].filter((ingredient) => (
        ingredient.ingredientId !== null
          ? pantryIds.has(ingredient.ingredientId)
          : pantryNames.has(normalizeIngredientName(ingredient.name))
      ));
      const missing = [...required.values()].filter((ingredient) => !have.includes(ingredient));
      return {
        source: query.data.source,
        sourceId: summary.sourceId,
        title: summary.title,
        imageUrl: summary.imageUrl,
        sourceUrl: detail?.sourceUrl ?? summary.sourceUrl,
        cuisine: detail?.cuisine ?? null,
        cookingTimeMin: detail?.cookingTimeMin ?? null,
        dietaryTags: detail?.dietaryTags ?? [],
        matchScore: required.size ? Math.round((have.length / required.size) * 1000) / 10 : 0,
        requiredCount: required.size,
        haveCount: have.length,
        missingCount: missing.length,
        almostAchievable: missing.length === 1 || missing.length === 2,
        missingIngredients: missing.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
        })),
        attribution: detail?.attribution ?? (query.data.source === "spoonacular" ? "Recipe data provided by Spoonacular" : "Recipe data provided by TheMealDB"),
        detailAvailable: Boolean(detail),
      };
    }).sort((a, b) => b.matchScore - a.matchScore || a.missingCount - b.missingCount || a.title.localeCompare(b.title));

    return Response.json({ data: recommendations, source: query.data.source });
  } catch (error) {
    if (error instanceof ProviderError) {
      const status = error.kind === "not_configured" ? 503 : error.kind === "rate_limited" ? 429 : 502;
      return Response.json({ error: { code: error.kind.toUpperCase(), message: error.message } }, { status });
    }
    return apiErrorResponse(error);
  }
}
