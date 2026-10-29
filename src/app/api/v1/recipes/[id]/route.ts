import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin, requireUser } from "@/lib/auth/require-user";
import { parseJson } from "@/lib/validation/api";
import { recipeInputSchema, toRecipeRpcInput } from "@/lib/validation/recipe";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    const parsedId = z.coerce.number().int().positive().safeParse((await context.params).id);
    if (!parsedId.success) throw new ApiError(400, "VALIDATION_ERROR", "Recipe ID is invalid");
    const recipeId = parsedId.data;

    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("id,title,description,cuisine_id,cooking_time_min,image_url,source_url,attribution")
      .eq("id", recipeId)
      .eq("is_published", true)
      .maybeSingle();
    if (recipeError) throw new ApiError(500, "SERVER_ERROR", "Could not load recipe");
    if (!recipe) throw new ApiError(404, "NOT_FOUND", "Recipe was not found");

    const [links, steps, tags, pantry, cuisineResult] = await Promise.all([
      supabase.from("recipe_ingredients").select("ingredient_id,display_name").eq("recipe_id", recipeId),
      supabase.from("recipe_steps").select("step_number,instruction").eq("recipe_id", recipeId).order("step_number"),
      supabase.from("recipe_dietary_tags").select("tag_id").eq("recipe_id", recipeId),
      supabase.from("pantry_items").select("ingredient_id").eq("user_id", user.id),
      recipe.cuisine_id
        ? supabase.from("cuisines").select("name").eq("id", recipe.cuisine_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (links.error || steps.error || tags.error || pantry.error || cuisineResult.error) {
      throw new ApiError(500, "SERVER_ERROR", "Could not load complete recipe details");
    }

    const ingredientIds = links.data.map((link) => link.ingredient_id);
    const tagIds = tags.data.map((tag) => tag.tag_id);
    const [ingredients, dietaryTags] = await Promise.all([
      ingredientIds.length
        ? supabase.from("ingredients").select("id,name").in("id", ingredientIds)
        : Promise.resolve({ data: [], error: null }),
      tagIds.length
        ? supabase.from("dietary_tags").select("id,name").in("id", tagIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (ingredients.error || dietaryTags.error) throw new ApiError(500, "SERVER_ERROR", "Could not load recipe ingredients");

    const ingredientById = new Map(ingredients.data.map((ingredient) => [ingredient.id, ingredient]));
    const pantryIds = new Set(pantry.data.map((item) => item.ingredient_id));
    const missingIds = ingredientIds.filter((id) => !pantryIds.has(id));
    const substituteRows = missingIds.length
      ? await supabase.from("substitutes").select("ingredient_id,substitute_id,note").in("ingredient_id", missingIds)
      : { data: [], error: null };
    if (substituteRows.error) throw new ApiError(500, "SERVER_ERROR", "Could not load ingredient substitutes");
    const substituteIds = [...new Set(substituteRows.data.map((row) => row.substitute_id))];
    const substituteIngredients = substituteIds.length
      ? await supabase.from("ingredients").select("id,name").in("id", substituteIds)
      : { data: [], error: null };
    if (substituteIngredients.error) throw new ApiError(500, "SERVER_ERROR", "Could not load substitutes");
    const substituteNames = new Map(substituteIngredients.data.map((ingredient) => [ingredient.id, ingredient.name]));
    const substitutesByIngredient = new Map<number, Array<{ ingredientId: number; name: string; note: string | null }>>();
    for (const substitute of substituteRows.data) {
      const name = substituteNames.get(substitute.substitute_id);
      if (!name) continue;
      const list = substitutesByIngredient.get(substitute.ingredient_id) ?? [];
      list.push({ ingredientId: substitute.substitute_id, name, note: substitute.note });
      substitutesByIngredient.set(substitute.ingredient_id, list);
    }

    const recipeIngredients = links.data.flatMap((link) => {
      const ingredient = ingredientById.get(link.ingredient_id);
      if (!ingredient) return [];
      return [{
        ingredientId: ingredient.id,
        name: link.display_name ?? ingredient.name,
        inPantry: pantryIds.has(ingredient.id),
        ...(!pantryIds.has(ingredient.id) ? { substitutes: substitutesByIngredient.get(ingredient.id) ?? [] } : {}),
      }];
    });
    const requiredCount = recipeIngredients.length;
    const haveCount = recipeIngredients.filter((ingredient) => ingredient.inPantry).length;
    return Response.json({
      recipeId: recipe.id,
      title: recipe.title,
      description: recipe.description,
      cuisine: cuisineResult.data?.name ?? null,
      cookingTimeMin: recipe.cooking_time_min,
      imageUrl: recipe.image_url,
      sourceUrl: recipe.source_url,
      attribution: recipe.attribution,
      dietaryTags: dietaryTags.data.map((tag) => tag.name),
      ingredients: recipeIngredients,
      steps: steps.data.map((step) => ({ stepNumber: step.step_number, instruction: step.instruction })),
      matchScore: requiredCount ? Math.round((haveCount / requiredCount) * 1000) / 10 : 0,
      missingCount: requiredCount - haveCount,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { supabase } = await requireAdmin();
    const parsedId = z.coerce.number().int().positive().safeParse((await context.params).id);
    if (!parsedId.success) throw new ApiError(400, "VALIDATION_ERROR", "Recipe ID is invalid");
    const recipe = await parseJson(request, recipeInputSchema);
    const { error } = await supabase.rpc("update_recipe", {
      p_recipe_id: parsedId.data,
      p_recipe: toRecipeRpcInput(recipe),
    });
    if (error?.code === "P0002") throw new ApiError(404, "NOT_FOUND", "Recipe was not found");
    if (error?.code === "23503") throw new ApiError(404, "NOT_FOUND", "A cuisine, tag or ingredient ID does not exist");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not update recipe");
    return Response.json({ recipeId: parsedId.data, updated: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { supabase } = await requireAdmin();
    const parsedId = z.coerce.number().int().positive().safeParse((await context.params).id);
    if (!parsedId.success) throw new ApiError(400, "VALIDATION_ERROR", "Recipe ID is invalid");
    const { data, error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", parsedId.data)
      .select("id")
      .maybeSingle();
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not delete recipe");
    if (!data) throw new ApiError(404, "NOT_FOUND", "Recipe was not found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
