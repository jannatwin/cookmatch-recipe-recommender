import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/require-user";
import { recommendationQuerySchema } from "@/lib/validation/api";

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const query = recommendationQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Recommendation filters are invalid", query.error.issues.map((issue) => ({
        field: issue.path.join("."), issue: issue.message,
      })));
    }

    let dietTagId: number | undefined;
    if (query.data.diet) {
      const { data: tag, error } = await supabase
        .from("dietary_tags")
        .select("id")
        .ilike("name", query.data.diet)
        .maybeSingle();
      if (error) throw new ApiError(500, "SERVER_ERROR", "Could not load dietary filter");
      if (!tag) throw new ApiError(400, "VALIDATION_ERROR", "Unknown dietary preference", [
        { field: "diet", issue: "no dietary tag matches this value" },
      ]);
      dietTagId = tag.id;
    }

    const { count: pantryCount, error: pantryError } = await supabase
      .from("pantry_items")
      .select("ingredient_id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (pantryError) throw new ApiError(500, "SERVER_ERROR", "Could not load pantry");
    if (!pantryCount) {
      return Response.json({
        data: [],
        hint: "Add ingredients to your pantry to get recommendations",
        pagination: { page: query.data.page, limit: query.data.limit, totalItems: 0, totalPages: 0 },
      });
    }

    const { data: rows, error } = await supabase.rpc("get_recommendations", {
      p_cuisine_id: query.data.cuisine,
      p_max_time: query.data.maxTime,
      p_diet_tag_id: dietTagId,
      p_almost_only: query.data.almostOnly === "true",
      p_min_score: query.data.minScore,
      p_warning_days: 3,
      p_page: query.data.page,
      p_limit: query.data.limit,
    });
    if (error) throw new ApiError(500, "SERVER_ERROR", "Could not calculate recommendations");

    const totalItems = rows[0]?.total_items ?? 0;
    return Response.json({
      data: rows.map((row) => ({
        recipeId: row.recipe_id,
        title: row.title,
        cuisine: row.cuisine,
        cookingTimeMin: row.cooking_time_min,
        imageUrl: row.image_url,
        dietaryTags: row.dietary_tags,
        matchScore: Number(row.match_score),
        requiredCount: row.required_count,
        haveCount: row.have_count,
        missingCount: row.missing_count,
        expiringCount: row.expiring_count,
        almostAchievable: row.almost_achievable,
        missingIngredients: row.missing_ingredients,
      })),
      pagination: {
        page: query.data.page,
        limit: query.data.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.data.limit),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
