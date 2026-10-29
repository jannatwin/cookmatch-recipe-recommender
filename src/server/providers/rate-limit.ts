import { ApiError } from "@/lib/api/errors";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type SpoonacularAction = "spoonacular_search" | "spoonacular_detail";

export async function enforceSpoonacularLimit(supabase: SupabaseClient, action: SpoonacularAction) {
  const { data: allowed, error } = await supabase.rpc("consume_provider_request_limit", { p_action: action });
  if (error) throw new ApiError(503, "SERVER_ERROR", "Could not verify the recipe provider request limit");
  if (!allowed) throw new ApiError(429, "RATE_LIMITED", "Spoonacular request limit reached; try again later");
}
