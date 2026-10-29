import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import type { Database } from "@/types/database";

export function normalizeIngredientName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export async function resolveIngredient(
  supabase: SupabaseClient<Database>,
  input: { ingredientId?: number; name?: string },
) {
  if (input.ingredientId !== undefined) {
    const { data, error } = await supabase.from("ingredients").select("id,name").eq("id", input.ingredientId).maybeSingle();
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not look up ingredient");
    if (!data) throw new ApiError(404, "NOT_FOUND", "Ingredient was not found");
    return data;
  }

  const name = input.name?.trim();
  if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Ingredient name is required");
  const normalized = normalizeIngredientName(name);

  const [{ data: ingredient, error: ingredientError }, { data: alias, error: aliasError }] = await Promise.all([
    supabase.from("ingredients").select("id,name").eq("normalized_name", normalized).maybeSingle(),
    supabase.from("ingredient_aliases").select("ingredient_id").eq("normalized_alias", normalized).maybeSingle(),
  ]);

  if (ingredientError || aliasError) throw new ApiError(500, "SERVER_ERROR", "Could not look up ingredient");
  if (ingredient) return ingredient;
  if (alias) {
    const { data, error } = await supabase.from("ingredients").select("id,name").eq("id", alias.ingredient_id).single();
    if (error || !data) throw new ApiError(500, "SERVER_ERROR", "Ingredient alias is invalid");
    return data;
  }

  throw new ApiError(422, "UNKNOWN_INGREDIENT", `Ingredient '${name}' was not recognized`, [
    { field: "name", issue: "no ingredient or alias matches this name" },
  ]);
}

export async function resolveIngredientNames(
  supabase: SupabaseClient<Database>,
  names: string[],
) {
  const normalizedNames = [...new Set(names.map(normalizeIngredientName))];
  const [{ data: ingredients, error: ingredientsError }, { data: aliases, error: aliasesError }] = await Promise.all([
    supabase.from("ingredients").select("id,name,normalized_name").in("normalized_name", normalizedNames),
    supabase.from("ingredient_aliases").select("ingredient_id,normalized_alias").in("normalized_alias", normalizedNames),
  ]);

  if (ingredientsError || aliasesError) throw new ApiError(500, "SERVER_ERROR", "Could not look up ingredients");
  const byName = new Map((ingredients ?? []).map((item) => [item.normalized_name, { id: item.id, name: item.name }]));
  const aliasToId = new Map((aliases ?? []).map((item) => [item.normalized_alias, item.ingredient_id]));
  const aliasIds = [...new Set(aliases?.map((item) => item.ingredient_id) ?? [])];
  const aliasIngredients = aliasIds.length
    ? await supabase.from("ingredients").select("id,name").in("id", aliasIds)
    : { data: [], error: null };
  if (aliasIngredients.error) throw new ApiError(500, "SERVER_ERROR", "Could not resolve ingredient aliases");
  const byId = new Map((aliasIngredients.data ?? []).map((item) => [item.id, { id: item.id, name: item.name }]));

  return new Map(
    normalizedNames.flatMap((normalized) => {
      const result = byName.get(normalized) ?? byId.get(aliasToId.get(normalized) ?? -1);
      return result ? [[normalized, result] as const] : [];
    }),
  );
}
