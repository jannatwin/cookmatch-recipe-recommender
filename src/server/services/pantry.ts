import { ApiError } from "@/lib/api/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { isExpiringSoon } from "./matching";

export async function listPantry(supabase: SupabaseClient<Database>, userId: string) {
  const { data: items, error } = await supabase
    .from("pantry_items")
    .select("ingredient_id,expiry_date")
    .eq("user_id", userId)
    .order("ingredient_id");
  if (error) throw new ApiError(500, "SERVER_ERROR", "Could not load pantry");

  const ids = items.map((item) => item.ingredient_id);
  if (ids.length === 0) return [];

  const { data: ingredients, error: ingredientError } = await supabase
    .from("ingredients")
    .select("id,name")
    .in("id", ids);
  if (ingredientError) throw new ApiError(500, "SERVER_ERROR", "Could not load pantry ingredients");

  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.name]));
  return items.map((item) => ({
    ingredientId: item.ingredient_id,
    name: byId.get(item.ingredient_id) ?? "Unknown ingredient",
    expiryDate: item.expiry_date,
    expiringSoon: isExpiringSoon(item.expiry_date),
  }));
}

export async function replacePantry(
  supabase: SupabaseClient<Database>,
  userId: string,
  items: Array<{ ingredientId: number; expiryDate?: string | null }>,
) {
  const payload = items.map((item) => ({
    ingredient_id: item.ingredientId,
    expiry_date: item.expiryDate ?? null,
  }));

  const { error } = await supabase.rpc("replace_pantry_items", { p_items: payload as Json });
  if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not save pantry items");
  return listPantry(supabase, userId);
}
