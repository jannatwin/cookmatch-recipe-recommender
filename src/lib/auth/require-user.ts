import { ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApiError(401, "TOKEN_INVALID", "Sign in is required");
  }

  return { supabase, user: data.user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Administrator access is required");
  }

  return { supabase, user, profile };
}
