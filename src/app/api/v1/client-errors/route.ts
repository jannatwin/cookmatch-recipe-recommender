import { z } from "zod";
import { apiErrorResponse } from "@/lib/api/errors";
import { parseJson } from "@/lib/validation/api";
import { enforceGuestLimit } from "@/server/services/guest-limit";

const reportSchema = z.object({
  kind: z.enum(["error", "unhandledrejection", "boundary"]),
  message: z.string().min(1).max(500),
  stack: z.string().max(2000).optional(),
  path: z
    .string()
    .max(300)
    .regex(/^\/[^?#]*$/, "must be a path without query or hash"),
});

// Receives browser error reports (src/lib/report-error.ts) and writes them to the server log.
// Open to guests, so it shares the per-address request limit and accepts only small, validated bodies.
export async function POST(request: Request) {
  try {
    await enforceGuestLimit(request.headers);
    const report = await parseJson(request, reportSchema);
    console.error(JSON.stringify({ event: "cookmatch_error", source: "client", ...report }));
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
