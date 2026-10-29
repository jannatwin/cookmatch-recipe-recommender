import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { ingredientSearchQuerySchema } from "@/lib/validation/api";
import { normalizeIngredientName } from "@/server/services/ingredients";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireUser();
    const url = new URL(request.url);
    const parsed = ingredientSearchQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Search query is invalid", parsed.error.issues.map((issue) => ({
        field: issue.path.join("."), issue: issue.message,
      })));
    }

    const normalized = normalizeIngredientName(parsed.data.q).replace(/[\\%_]/g, "\\$&");
    const [mainMatches, aliasMatches] = await Promise.all([
      supabase.from("ingredients").select("id,name,normalized_name").ilike("normalized_name", `${normalized}%`).limit(parsed.data.limit),
      supabase.from("ingredient_aliases").select("ingredient_id,alias,normalized_alias").ilike("normalized_alias", `${normalized}%`).limit(parsed.data.limit),
    ]);
    if (mainMatches.error || aliasMatches.error) throw new ApiError(500, "SERVER_ERROR", "Could not search ingredients");

    const aliasIds = [...new Set(aliasMatches.data.map((item) => item.ingredient_id))];
    const aliasIngredients = aliasIds.length
      ? await supabase.from("ingredients").select("id,name").in("id", aliasIds)
      : { data: [], error: null };
    if (aliasIngredients.error) throw new ApiError(500, "SERVER_ERROR", "Could not resolve ingredient suggestions");
    const namesById = new Map(aliasIngredients.data.map((item) => [item.id, item.name]));
    const suggestions = new Map<number, { ingredientId: number; name: string; matchedAlias: string | null }>();

    for (const item of mainMatches.data) {
      suggestions.set(item.id, { ingredientId: item.id, name: item.name, matchedAlias: null });
    }
    for (const alias of aliasMatches.data) {
      const name = namesById.get(alias.ingredient_id);
      if (name && !suggestions.has(alias.ingredient_id)) {
        suggestions.set(alias.ingredient_id, { ingredientId: alias.ingredient_id, name, matchedAlias: alias.alias });
      }
    }

    const data = [...suggestions.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, parsed.data.limit);
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
