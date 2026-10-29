import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/require-user";
import { parseJson } from "@/lib/validation/api";
import { z } from "zod";

const mappingSchema = z.object({
  ingredientId: z.coerce.number().int().positive(),
  substituteId: z.coerce.number().int().positive(),
  note: z.string().trim().max(255).optional().default(""),
}).refine((input) => input.ingredientId !== input.substituteId, {
  path: ["substituteId"],
  message: "An ingredient cannot substitute itself",
});

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const input = await parseJson(request, mappingSchema);
    const { error } = await supabase.from("substitutes").insert({
      ingredient_id: input.ingredientId,
      substitute_id: input.substituteId,
      note: input.note || null,
    });
    if (error?.code === "23505") throw new ApiError(409, "DUPLICATE", "Substitute mapping already exists");
    if (error?.code === "23503") throw new ApiError(404, "NOT_FOUND", "Ingredient was not found");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not create substitute mapping");
    return Response.json({
      ingredientId: input.ingredientId,
      substituteId: input.substituteId,
      note: input.note || null,
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const input = await parseJson(request, mappingSchema.pick({ ingredientId: true, substituteId: true }));
    const { data, error } = await supabase
      .from("substitutes")
      .delete()
      .eq("ingredient_id", input.ingredientId)
      .eq("substitute_id", input.substituteId)
      .select("ingredient_id")
      .maybeSingle();
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not remove substitute mapping");
    if (!data) throw new ApiError(404, "NOT_FOUND", "Substitute mapping was not found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
