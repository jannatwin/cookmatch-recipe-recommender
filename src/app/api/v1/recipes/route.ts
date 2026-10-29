import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/require-user";
import { parseJson } from "@/lib/validation/api";
import { recipeInputSchema, toRecipeRpcInput } from "@/lib/validation/recipe";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const recipe = await parseJson(request, recipeInputSchema);
    const { data: recipeId, error } = await supabase.rpc("create_recipe", {
      p_recipe: toRecipeRpcInput(recipe),
    });
    if (error?.code === "23503") throw new ApiError(404, "NOT_FOUND", "A cuisine, tag or ingredient ID does not exist");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not create recipe");
    return Response.json({ recipeId }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
