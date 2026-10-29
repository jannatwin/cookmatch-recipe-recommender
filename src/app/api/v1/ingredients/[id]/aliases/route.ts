import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/require-user";
import { parseJson } from "@/lib/validation/api";
import { normalizeIngredientName } from "@/server/services/ingredients";
import { z } from "zod";

const bodySchema = z.object({ alias: z.string().trim().min(1).max(100) });
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { supabase } = await requireAdmin();
    const ingredientId = z.coerce.number().int().positive().safeParse((await context.params).id);
    if (!ingredientId.success) throw new ApiError(400, "VALIDATION_ERROR", "Ingredient ID is invalid");
    const { alias } = await parseJson(request, bodySchema);
    const normalizedAlias = normalizeIngredientName(alias);
    const [{ data: canonical }, { data: existingAlias }] = await Promise.all([
      supabase.from("ingredients").select("id").eq("normalized_name", normalizedAlias).maybeSingle(),
      supabase.from("ingredient_aliases").select("id").eq("normalized_alias", normalizedAlias).maybeSingle(),
    ]);
    if (canonical || existingAlias) throw new ApiError(409, "DUPLICATE", "Ingredient name or alias already exists");
    const { data: ingredient, error: ingredientError } = await supabase
      .from("ingredients").select("id").eq("id", ingredientId.data).maybeSingle();
    if (ingredientError) throw new ApiError(500, "SERVER_ERROR", "Could not load ingredient");
    if (!ingredient) throw new ApiError(404, "NOT_FOUND", "Ingredient was not found");

    const { data, error } = await supabase
      .from("ingredient_aliases")
      .insert({ ingredient_id: ingredientId.data, alias, normalized_alias: normalizedAlias })
      .select("id,ingredient_id,alias")
      .single();
    if (error?.code === "23505") throw new ApiError(409, "DUPLICATE", "Ingredient alias already exists");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not create ingredient alias");
    return Response.json({ aliasId: data.id, ingredientId: data.ingredient_id, alias: data.alias }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
