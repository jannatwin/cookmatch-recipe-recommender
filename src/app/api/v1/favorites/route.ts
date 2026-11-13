import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";

// The signed-in user's saved recipes, newest first. RLS limits rows to the caller's own.
export async function GET() {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("favorite_recipes")
      .select(
        "recipe_id,created_at,recipes(id,title,image_url,cooking_time_min,cuisines(name),recipe_ingredients(count))",
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
            title: recipe.title,
            imageUrl: recipe.image_url,
            cookingTimeMin: recipe.cooking_time_min,
            cuisine: recipe.cuisines?.name ?? null,
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
