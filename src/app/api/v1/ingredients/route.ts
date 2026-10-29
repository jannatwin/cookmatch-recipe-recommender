import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/require-user";
import { parseJson } from "@/lib/validation/api";
import { normalizeIngredientName } from "@/server/services/ingredients";
import { z } from "zod";

const createIngredientSchema = z.object({
  name: z.string().trim().min(1).max(100),
  aliases: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
}).superRefine((input, context) => {
  const names = [input.name, ...input.aliases].map(normalizeIngredientName);
  if (new Set(names).size !== names.length) {
    context.addIssue({ code: "custom", message: "Ingredient name and aliases must be unique" });
  }
});

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const input = await parseJson(request, createIngredientSchema);
    const { data: ingredientId, error } = await supabase.rpc("create_ingredient", {
      p_name: input.name,
      p_normalized_name: normalizeIngredientName(input.name),
      p_aliases: input.aliases.map((alias) => ({ alias, normalized_alias: normalizeIngredientName(alias) })),
    });
    if (error?.code === "23505") throw new ApiError(409, "DUPLICATE", "Ingredient name or alias already exists");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not create ingredient");
    return Response.json({ ingredientId, name: input.name, aliases: input.aliases }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
