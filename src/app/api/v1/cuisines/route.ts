import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { optionalUser, requireAdmin } from "@/lib/auth/require-user";
import { parseJson } from "@/lib/validation/api";
import { z } from "zod";

const bodySchema = z.object({ name: z.string().trim().min(1).max(50) });

export async function GET() {
  try {
    const { supabase } = await optionalUser();
    const { data, error } = await supabase.from("cuisines").select("id,name").order("name");
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not load cuisines");
    return Response.json({ data: data.map(({ id, name }) => ({ cuisineId: id, name })) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const { name } = await parseJson(request, bodySchema);
    const { data: existing, error: lookupError } = await supabase
      .from("cuisines").select("id").ilike("name", name.replace(/[\\%_]/g, "\\$&")).limit(1);
    if (lookupError) throw new ApiError(500, "SERVER_ERROR", "Could not check existing cuisines");
    if (existing.length) throw new ApiError(409, "DUPLICATE", "This cuisine already exists");
    const { data, error } = await supabase.from("cuisines").insert({ name }).select("id,name").single();
    if (error?.code === "23505") throw new ApiError(409, "DUPLICATE", "This cuisine already exists");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not create cuisine");
    return Response.json({ cuisineId: data.id, name: data.name }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
