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

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const [recipes, ingredients, aliases, cuisines, tags, recipeIngredients, recipeTags, steps, substitutes] = await Promise.all([
      supabase.from("recipes").select("id,title,description,cuisine_id,cooking_time_min,image_url,is_published").eq("source", "cookmatch").order("title"),
      supabase.from("ingredients").select("id,name").order("name"),
      supabase.from("ingredient_aliases").select("id,ingredient_id,alias").order("alias"),
      supabase.from("cuisines").select("id,name").order("name"),
      supabase.from("dietary_tags").select("id,name").order("name"),
      supabase.from("recipe_ingredients").select("recipe_id,ingredient_id"),
      supabase.from("recipe_dietary_tags").select("recipe_id,tag_id"),
      supabase.from("recipe_steps").select("recipe_id,step_number,instruction").order("step_number"),
      supabase.from("substitutes").select("ingredient_id,substitute_id,note").order("ingredient_id"),
    ]);
    if (recipes.error || ingredients.error || aliases.error || cuisines.error || tags.error
      || recipeIngredients.error || recipeTags.error || steps.error || substitutes.error
      || !recipes.data || !ingredients.data || !aliases.data || !cuisines.data || !tags.data
      || !recipeIngredients.data || !recipeTags.data || !steps.data || !substitutes.data) {
      throw new ApiError(500, "SERVER_ERROR", "Could not load the admin catalog");
    }
    const ingredientsByRecipe = groupByRecipeId(recipeIngredients.data, (row) => row.recipe_id);
    const tagsByRecipe = groupByRecipeId(recipeTags.data, (row) => row.recipe_id);
    const stepsByRecipe = groupByRecipeId(steps.data, (row) => row.recipe_id);

    return Response.json({
      recipes: recipes.data.map((recipe) => ({
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
      ingredients: ingredients.data.map(({ id, name }) => ({ ingredientId: id, name })),
      aliases: aliases.data.map(({ id, ingredient_id, alias }) => ({ aliasId: id, ingredientId: ingredient_id, alias })),
      cuisines: cuisines.data.map(({ id, name }) => ({ cuisineId: id, name })),
      dietaryTags: tags.data.map(({ id, name }) => ({ tagId: id, name })),
      substitutes: substitutes.data.map(({ ingredient_id, substitute_id, note }) => ({
        ingredientId: ingredient_id,
        substituteId: substitute_id,
        note,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
