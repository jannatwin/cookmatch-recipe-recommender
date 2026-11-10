import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin, requireUser } from "@/lib/auth/require-user";
import { parseJson } from "@/lib/validation/api";
import { z } from "zod";

const bodySchema = z.object({ name: z.string().trim().min(1).max(50) });

export async function GET() {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("dietary_tags").select("id,name").order("name");
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not load dietary tags");
    return Response.json({ data: data.map(({ id, name }) => ({ tagId: id, name })) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const { name } = await parseJson(request, bodySchema);
    const { data: existing, error: lookupError } = await supabase
      .from("dietary_tags").select("id").ilike("name", name.replace(/[\\%_]/g, "\\$&")).limit(1);
    if (lookupError) throw new ApiError(500, "SERVER_ERROR", "Could not check existing dietary tags");
    if (existing.length) throw new ApiError(409, "DUPLICATE", "This dietary tag already exists");
    const { data, error } = await supabase.from("dietary_tags").insert({ name }).select("id,name").single();
    if (error?.code === "23505") throw new ApiError(409, "DUPLICATE", "This dietary tag already exists");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not create dietary tag");
    return Response.json({ tagId: data.id, name: data.name }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
