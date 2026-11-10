import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/require-user";
import { z } from "zod";

const paramsSchema = z.object({ id: z.coerce.number().int().positive(), aliasId: z.coerce.number().int().positive() });
type Context = { params: Promise<{ id: string; aliasId: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const { supabase } = await requireAdmin();
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) throw new ApiError(400, "VALIDATION_ERROR", "Alias identifier is invalid");
    const { data, error } = await supabase
      .from("ingredient_aliases")
      .delete()
      .eq("id", params.data.aliasId)
      .eq("ingredient_id", params.data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not remove ingredient alias");
    if (!data) throw new ApiError(404, "NOT_FOUND", "Ingredient alias was not found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
