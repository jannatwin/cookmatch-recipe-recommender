import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { listPantry, replacePantry } from "@/server/services/pantry";
import { parseJson, replacePantrySchema } from "@/lib/validation/api";
import { normalizeIngredientName, resolveIngredient, resolveIngredientNames } from "@/server/services/ingredients";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    return Response.json({ data: await listPantry(supabase, user.id) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const input = await parseJson(request, replacePantrySchema);
    const names = input.items.flatMap((item) => (item.name ? [item.name] : []));
    const resolvedNames = names.length ? await resolveIngredientNames(supabase, names) : new Map();
    const unknown = input.items.flatMap((item, index) => (
      item.name && !resolvedNames.has(normalizeIngredientName(item.name))
        ? [{ name: item.name, index }]
        : []
    ));
    if (unknown.length) {
      throw new ApiError(
        422,
        "UNKNOWN_INGREDIENT",
        "Some ingredients were not recognized",
        unknown.map(({ name, index }) => ({ field: `items[${index}].name`, issue: `no ingredient or alias matches '${name}'` })),
      );
    }

    const resolved = await Promise.all(
      input.items.map(async (item) => {
        if (item.ingredientId !== undefined) {
          const ingredient = await resolveIngredient(supabase, { ingredientId: item.ingredientId });
          return { ingredientId: ingredient.id, expiryDate: item.expiryDate };
        }
        const ingredient = resolvedNames.get(normalizeIngredientName(item.name!));
        if (!ingredient) throw new ApiError(422, "UNKNOWN_INGREDIENT", "An ingredient was not recognized");
        return { ingredientId: ingredient.id, expiryDate: item.expiryDate };
      }),
    );
    const ids = resolved.map((item) => item.ingredientId);
    if (new Set(ids).size !== ids.length) {
      throw new ApiError(409, "DUPLICATE", "The pantry contains the same ingredient more than once");
    }

    return Response.json({ data: await replacePantry(supabase, user.id, resolved) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
