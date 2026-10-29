import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { resolveIngredient } from "@/server/services/ingredients";
import { listPantry } from "@/server/services/pantry";
import { pantryItemInputSchema, parseJson } from "@/lib/validation/api";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const input = await parseJson(request, pantryItemInputSchema);
    const ingredient = await resolveIngredient(supabase, input);
    const { error } = await supabase.from("pantry_items").insert({
      user_id: user.id,
      ingredient_id: ingredient.id,
      expiry_date: input.expiryDate ?? null,
    });
    if (error?.code === "23505") throw new ApiError(409, "DUPLICATE", "Ingredient is already in the pantry");
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not add pantry ingredient");

    const created = (await listPantry(supabase, user.id)).find((item) => item.ingredientId === ingredient.id);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
