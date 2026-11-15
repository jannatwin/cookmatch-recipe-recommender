import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { optionalUser, requireAdmin } from "@/lib/auth/require-user";
import { localized } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { parseJson } from "@/lib/validation/api";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(50),
  nameBn: z.string().trim().max(50).optional(),
});

export async function GET(request: Request) {
  try {
    const { supabase } = await optionalUser(request);
    const locale = await getLocale();
    const { data, error } = await supabase.from("cuisines").select("id,name,name_bn").order("name");
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not load cuisines");
    return Response.json({
      data: data
        .map(({ id, name, name_bn }) => ({ cuisineId: id, name: localized(locale, name, name_bn) }))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const { name, nameBn } = await parseJson(request, bodySchema);
    const { data: existing, error: lookupError } = await supabase
      .from("cuisines")
      .select("id")
      .ilike("name", name.replace(/[\\%_]/g, "\\$&"))
      .limit(1);
    if (lookupError) throw new ApiError(500, "SERVER_ERROR", "Could not check existing cuisines");
    if (existing.length) throw new ApiError(409, "DUPLICATE", "This cuisine already exists");
    const { data, error } = await supabase
      .from("cuisines")
      .insert({ name, name_bn: nameBn || null })
      .select("id,name,name_bn")
      .single();
    if (error?.code === "23505") throw new ApiError(409, "DUPLICATE", "This cuisine already exists");
    if (error) throw new ApiError(400, "VALIDATION_ERROR", "Could not create cuisine");
    return Response.json({ cuisineId: data.id, name: data.name, nameBn: data.name_bn }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
