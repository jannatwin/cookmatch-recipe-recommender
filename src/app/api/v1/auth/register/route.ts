import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { parseJson, registerSchema } from "@/lib/validation/api";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, registerSchema);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.name },
        emailRedirectTo: new URL(
          "/auth/callback",
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        ).toString(),
      },
    });

    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        throw new ApiError(409, "DUPLICATE", "An account with this email already exists");
      }
      if (error.status === 429) throw new ApiError(429, "RATE_LIMITED", "Please wait before trying to register again");
      throw new ApiError(400, "VALIDATION_ERROR", "Could not create account", [
        { field: "account", issue: "Signup was rejected; check the supplied fields" },
      ]);
    }
    if (!data.user) throw new ApiError(500, "SERVER_ERROR", "Account was not created");

    return Response.json(
      {
        user: {
          userId: data.user.id,
          name: input.name,
          email: data.user.email,
          role: "user",
        },
        confirmationRequired: !data.session,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
