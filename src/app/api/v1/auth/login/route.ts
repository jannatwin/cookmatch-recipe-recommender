import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { parseJson, loginSchema } from "@/lib/validation/api";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, loginSchema);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.user) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");

    const { data: profile } = await supabase.from("profiles").select("display_name,role").eq("id", data.user.id).maybeSingle();
    return Response.json({
      user: {
        userId: data.user.id,
        name: profile?.display_name ?? data.user.user_metadata.display_name ?? "CookMatch user",
        role: profile?.role ?? "user",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
