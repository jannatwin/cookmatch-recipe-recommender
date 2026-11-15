import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { localized } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { ingredientSearchQuerySchema } from "@/lib/validation/api";
import { normalizeIngredientName } from "@/server/services/ingredients";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireUser();
    const locale = await getLocale();
    const url = new URL(request.url);
    const parsed = ingredientSearchQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Search query is invalid",
        parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          issue: issue.message,
        })),
      );
    }

    const normalized = normalizeIngredientName(parsed.data.q).replace(/[\\%_]/g, "\\$&");
    const [mainMatches, banglaMatches, aliasMatches] = await Promise.all([
      supabase
        .from("ingredients")
        .select("id,name,name_bn")
        .ilike("normalized_name", `${normalized}%`)
        .limit(parsed.data.limit),
      supabase
        .from("ingredients")
        .select("id,name,name_bn")
        .ilike("normalized_name_bn", `${normalized}%`)
        .limit(parsed.data.limit),
      supabase
        .from("ingredient_aliases")
        .select("ingredient_id,alias,normalized_alias")
        .ilike("normalized_alias", `${normalized}%`)
        .limit(parsed.data.limit),
    ]);
    if (mainMatches.error || banglaMatches.error || aliasMatches.error)
      throw new ApiError(500, "SERVER_ERROR", "Could not search ingredients");

    const aliasIds = [...new Set(aliasMatches.data.map((item) => item.ingredient_id))];
    const aliasIngredients = aliasIds.length
      ? await supabase.from("ingredients").select("id,name,name_bn").in("id", aliasIds)
      : { data: [], error: null };
    if (aliasIngredients.error)
      throw new ApiError(500, "SERVER_ERROR", "Could not resolve ingredient suggestions");
    const namesById = new Map(
      aliasIngredients.data.map((item) => [item.id, localized(locale, item.name, item.name_bn)]),
    );
    const suggestions = new Map<
      number,
      { ingredientId: number; name: string; matchedAlias: string | null }
    >();

    // The suggestion shows the name in the reader's language; when the text they typed matched the
    // name in the other language, that name is shown beside it like an alias.
    for (const item of mainMatches.data) {
      const name = localized(locale, item.name, item.name_bn);
      suggestions.set(item.id, {
        ingredientId: item.id,
        name,
        matchedAlias: name === item.name ? null : item.name,
      });
    }
    for (const item of banglaMatches.data) {
      if (suggestions.has(item.id)) continue;
      const name = localized(locale, item.name, item.name_bn);
      suggestions.set(item.id, {
        ingredientId: item.id,
        name,
        matchedAlias: name === item.name_bn ? null : item.name_bn,
      });
    }
    for (const alias of aliasMatches.data) {
      const name = namesById.get(alias.ingredient_id);
      if (name && !suggestions.has(alias.ingredient_id)) {
        suggestions.set(alias.ingredient_id, {
          ingredientId: alias.ingredient_id,
          name,
          matchedAlias: alias.alias,
        });
      }
    }

    const data = [...suggestions.values()]
      .sort((a, b) => a.name.localeCompare(b.name, locale))
      .slice(0, parsed.data.limit);
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
