import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/require-user";

function groupByRecipeId<T>(rows: T[], getRecipeId: (row: T) => number) {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    const recipeId = getRecipeId(row);
    const group = grouped.get(recipeId) ?? [];
    group.push(row);
    grouped.set(recipeId, group);
  }
  return grouped;
}

// PostgREST caps every response (max_rows, 1000 by default). Page until empty so the editor never
// receives a truncated recipe: saving one would delete the ingredients that were cut off.
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + 999);
    if (error || !data) throw new ApiError(500, "SERVER_ERROR", "Could not load the admin catalog");
    if (data.length === 0) return rows;
    rows.push(...data);
  }
}

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const [recipes, ingredients, aliases, cuisines, tags, recipeIngredients, recipeTags, steps, substitutes] =
      await Promise.all([
        fetchAll((from, to) =>
          supabase
            .from("recipes")
            .select("id,title,description,cuisine_id,cooking_time_min,image_url,is_published")
            .eq("source", "cookmatch")
            .order("title")
            .order("id")
            .range(from, to),
        ),
        fetchAll((from, to) =>
          supabase.from("ingredients").select("id,name,is_staple").order("name").order("id").range(from, to),
        ),
        fetchAll((from, to) =>
          supabase
            .from("ingredient_aliases")
            .select("id,ingredient_id,alias")
            .order("alias")
            .order("id")
            .range(from, to),
        ),
        fetchAll((from, to) => supabase.from("cuisines").select("id,name").order("name").range(from, to)),
        fetchAll((from, to) => supabase.from("dietary_tags").select("id,name").order("name").range(from, to)),
        fetchAll((from, to) =>
          supabase
            .from("recipe_ingredients")
            .select("recipe_id,ingredient_id")
            .order("recipe_id")
            .order("ingredient_id")
            .range(from, to),
        ),
        fetchAll((from, to) =>
          supabase
            .from("recipe_dietary_tags")
            .select("recipe_id,tag_id")
            .order("recipe_id")
            .order("tag_id")
            .range(from, to),
        ),
        fetchAll((from, to) =>
          supabase
            .from("recipe_steps")
            .select("recipe_id,step_number,instruction")
            .order("recipe_id")
            .order("step_number")
            .range(from, to),
        ),
        fetchAll((from, to) =>
          supabase
            .from("substitutes")
            .select("ingredient_id,substitute_id,note")
            .order("ingredient_id")
            .order("substitute_id")
            .range(from, to),
        ),
      ]);
    const ingredientsByRecipe = groupByRecipeId(recipeIngredients, (row) => row.recipe_id);
    const tagsByRecipe = groupByRecipeId(recipeTags, (row) => row.recipe_id);
    const stepsByRecipe = groupByRecipeId(steps, (row) => row.recipe_id);

    return Response.json({
      recipes: recipes.map((recipe) => ({
        recipeId: recipe.id,
        title: recipe.title,
        description: recipe.description ?? "",
        cuisineId: recipe.cuisine_id,
        cookingTimeMin: recipe.cooking_time_min,
        imageUrl: recipe.image_url ?? "",
        isPublished: recipe.is_published,
        ingredientIds: (ingredientsByRecipe.get(recipe.id) ?? []).map((row) => row.ingredient_id),
        dietaryTagIds: (tagsByRecipe.get(recipe.id) ?? []).map((row) => row.tag_id),
        steps: (stepsByRecipe.get(recipe.id) ?? []).map((row) => ({ instruction: row.instruction })),
      })),
      ingredients: ingredients.map(({ id, name, is_staple }) => ({
        ingredientId: id,
        name,
        isStaple: is_staple,
      })),
      aliases: aliases.map(({ id, ingredient_id, alias }) => ({
        aliasId: id,
        ingredientId: ingredient_id,
        alias,
      })),
      cuisines: cuisines.map(({ id, name }) => ({ cuisineId: id, name })),
      dietaryTags: tags.map(({ id, name }) => ({ tagId: id, name })),
      substitutes: substitutes.map(({ ingredient_id, substitute_id, note }) => ({
        ingredientId: ingredient_id,
        substituteId: substitute_id,
        note,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
