import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin, requireUser } from "@/lib/auth/require-user";
import { localized } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { parseJson } from "@/lib/validation/api";
import { normalizeIngredientName } from "@/server/services/ingredients";
import { z } from "zod";

const createIngredientSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    nameBn: z.string().trim().max(100).optional(),
    aliases: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  })
  .superRefine((input, context) => {
    const names = [input.name, ...input.aliases].map(normalizeIngredientName);
    if (new Set(names).size !== names.length) {
      context.addIssue({ code: "custom", message: "Ingredient name and aliases must be unique" });
    }
  });

// Ingredients used by at least one recipe the caller can see (RLS: published), for the pantry picker.
export async function GET() {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("ingredients")
      .select("id,name,name_bn,recipe_ingredients!inner(recipe_id)")
      .limit(1, { referencedTable: "recipe_ingredients" })
      .order("name")
      .limit(1000);
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not load ingredients");
    const locale = await getLocale();
    return Response.json({
      data: data
        .map(({ id, name, name_bn }) => ({ ingredientId: id, name: localized(locale, name, name_bn) }))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const input = await parseJson(request, createIngredientSchema);
    const nameBn = input.nameBn || null;
    if (nameBn) {
      const { data: taken, error: takenError } = await supabase
        .from("ingredients")
        .select("id")
        .eq("normalized_name_bn", normalizeIngredientName(nameBn))
        .maybeSingle();
      if (takenError) throw new ApiError(500, "SERVER_ERROR", "Could not check ingredient names");
      if (taken) throw new ApiError(409, "DUPLICATE", "Another ingredient already has this Bangla name");
    }
    const { data: ingredientId, error } = await supabase.rpc("create_ingredient", {
      p_name: input.name,
      p_normalized_name: normalizeIngredientName(input.name),
      p_aliases: input.aliases.map((alias) => ({ alias, normalized_alias: normalizeIngredientName(alias) })),
    });
    if (error?.code === "23505")
      throw new ApiError(409, "DUPLICATE", "Ingredient name or alias already exists");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not create ingredient");
    if (nameBn) {
      const { error: banglaError } = await supabase
        .from("ingredients")
        .update({ name_bn: nameBn })
        .eq("id", ingredientId);
      if (banglaError)
        throw new ApiError(500, "SERVER_ERROR", "Ingredient was created, but its Bangla name was not saved");
    }
    return Response.json({ ingredientId, name: input.name, nameBn, aliases: input.aliases }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
