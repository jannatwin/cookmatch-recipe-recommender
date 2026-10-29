import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";

export async function GET() {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("cuisines").select("id,name").order("name");
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not load cuisines");
    return Response.json({ data: data.map(({ id, name }) => ({ cuisineId: id, name })) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
