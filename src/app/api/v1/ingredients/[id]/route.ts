import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/require-user";
import { parseJson } from "@/lib/validation/api";
import { normalizeIngredientName } from "@/server/services/ingredients";
import { z } from "zod";

const bodySchema = z
  .object({ name: z.string().trim().min(1).max(100).optional(), isStaple: z.boolean().optional() })
  .refine((body) => body.name !== undefined || body.isStaple !== undefined, {
    message: "provide name or isStaple",
  });
type Context = { params: Promise<{ id: string }> };

async function getIngredientId(context: Context) {
  const result = z.coerce
    .number()
    .int()
    .positive()
    .safeParse((await context.params).id);
  if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", "Ingredient ID is invalid");
  return result.data;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { supabase } = await requireAdmin();
    const ingredientId = await getIngredientId(context);
    const { name, isStaple } = await parseJson(request, bodySchema);
    const changes: { name?: string; normalized_name?: string; is_staple?: boolean } = {};
    if (isStaple !== undefined) changes.is_staple = isStaple;
    if (name !== undefined) {
      const normalized = normalizeIngredientName(name);
      // normalized_name is unique among ingredients; aliases share the lookup namespace, so check them too.
      const { data: alias, error: aliasError } = await supabase
        .from("ingredient_aliases")
        .select("id")
        .eq("normalized_alias", normalized)
        .maybeSingle();
      if (aliasError) throw new ApiError(500, "SERVER_ERROR", "Could not check ingredient aliases");
      if (alias) throw new ApiError(409, "DUPLICATE", "Ingredient name or alias already exists");
      changes.name = name;
      changes.normalized_name = normalized;
    }

    const { data, error } = await supabase
      .from("ingredients")
      .update(changes)
      .eq("id", ingredientId)
      .select("id,name,is_staple")
      .maybeSingle();
    if (error?.code === "23505")
      throw new ApiError(409, "DUPLICATE", "Ingredient name or alias already exists");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not update ingredient");
    if (!data) throw new ApiError(404, "NOT_FOUND", "Ingredient was not found");
    return Response.json({ ingredientId: data.id, name: data.name, isStaple: data.is_staple });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { supabase } = await requireAdmin();
    const ingredientId = await getIngredientId(context);
    const { data, error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", ingredientId)
      .select("id")
      .maybeSingle();
    // recipe_ingredients references ingredients ON DELETE RESTRICT.
    if (error?.code === "23503")
      throw new ApiError(409, "IN_USE", "Ingredient is used by a recipe; remove it from those recipes first");
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not delete ingredient");
    if (!data) throw new ApiError(404, "NOT_FOUND", "Ingredient was not found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
