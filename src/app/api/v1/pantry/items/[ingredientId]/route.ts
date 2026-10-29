import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { listPantry } from "@/server/services/pantry";
import { dateOnlySchema } from "@/lib/validation/api";
import { z } from "zod";

const paramsSchema = z.object({ ingredientId: z.coerce.number().int().positive() });
const expirySchema = z.object({
  expiryDate: dateOnlySchema.nullable(),
});

type Context = { params: Promise<{ ingredientId: string }> };

async function getIngredientId(context: Context) {
  const result = paramsSchema.safeParse(await context.params);
  if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", "Ingredient ID is invalid");
  return result.data.ingredientId;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    const ingredientId = await getIngredientId(context);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
    }
    const parsed = expirySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Expiry date is invalid", parsed.error.issues.map((issue) => ({
        field: issue.path.join("."), issue: issue.message,
      })));
    }

    const { data, error } = await supabase
      .from("pantry_items")
      .update({ expiry_date: parsed.data.expiryDate })
      .eq("user_id", user.id)
      .eq("ingredient_id", ingredientId)
      .select("ingredient_id")
      .maybeSingle();
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not update pantry ingredient");
    if (!data) throw new ApiError(404, "NOT_FOUND", "Pantry ingredient was not found");
    const updated = (await listPantry(supabase, user.id)).find((item) => item.ingredientId === ingredientId);
    return Response.json(updated);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    const ingredientId = await getIngredientId(context);
    const { data, error } = await supabase
      .from("pantry_items")
      .delete()
      .eq("user_id", user.id)
      .eq("ingredient_id", ingredientId)
      .select("ingredient_id")
      .maybeSingle();
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not remove pantry ingredient");
    if (!data) throw new ApiError(404, "NOT_FOUND", "Pantry ingredient was not found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
