import { z } from "zod";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";

type Context = { params: Promise<{ recipeId: string }> };

async function parseRecipeId(context: Context) {
  const parsed = z.coerce
    .number()
    .int()
    .positive()
    .safeParse((await context.params).recipeId);
  if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Recipe ID is invalid");
  return parsed.data;
}

export async function PUT(_request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    const recipeId = await parseRecipeId(context);
    const { data: recipe, error: lookupError } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", recipeId)
      .maybeSingle();
    if (lookupError) throw new ApiError(500, "SERVER_ERROR", "Could not load recipe");
    if (!recipe) throw new ApiError(404, "NOT_FOUND", "Recipe was not found");
    const { error } = await supabase
      .from("favorite_recipes")
      .upsert(
        { user_id: user.id, recipe_id: recipeId },
        { onConflict: "user_id,recipe_id", ignoreDuplicates: true },
      );
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not save recipe");
    return Response.json({ recipeId, saved: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { supabase } = await requireUser();
    const recipeId = await parseRecipeId(context);
    const { error } = await supabase.from("favorite_recipes").delete().eq("recipe_id", recipeId);
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not remove saved recipe");
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
