import { apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name,role")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return Response.json({
      user: { userId: user.id, name: profile.display_name, email: user.email, role: profile.role },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
