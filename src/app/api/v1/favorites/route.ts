import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { localized } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";

// The signed-in user's saved recipes, newest first. RLS limits rows to the caller's own.
export async function GET() {
  try {
    const { supabase } = await requireUser();
    const locale = await getLocale();
    const { data, error } = await supabase
      .from("favorite_recipes")
      .select(
        "recipe_id,created_at,recipes(id,title,title_bn,image_url,cooking_time_min,cuisines(name,name_bn),recipe_ingredients(count))",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not load saved recipes");
    return Response.json({
      data: data.flatMap((row) => {
        const recipe = row.recipes;
        if (!recipe) return []; // unpublished since it was saved: RLS hides it
        return [
          {
            recipeId: recipe.id,
            title: localized(locale, recipe.title, recipe.title_bn),
            imageUrl: recipe.image_url,
            cookingTimeMin: recipe.cooking_time_min,
            cuisine: recipe.cuisines
              ? localized(locale, recipe.cuisines.name, recipe.cuisines.name_bn)
              : null,
            ingredientCount: recipe.recipe_ingredients[0]?.count ?? 0,
            savedAt: row.created_at,
          },
        ];
      }),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
