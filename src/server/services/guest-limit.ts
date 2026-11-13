import "server-only";

import { ApiError } from "@/lib/api/errors";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, guestClientKey } from "@/server/services/client-key";

export const GUEST_REQUESTS_PER_MINUTE = 120;

// Best effort: limits how fast one address can page through the catalog via this API.
// shortcut: skipped when SUPABASE_SECRET_KEY is not configured (e.g. CI); set it in production.
export async function enforceGuestLimit(headers: Headers) {
  const admin = createAdminClient();
  if (!admin) return;
  const salt = getServerEnv().SUPABASE_SECRET_KEY ?? "";
  const { data: allowed, error } = await admin.rpc("consume_guest_request_limit", {
    p_client_key: guestClientKey(clientIp(headers), salt),
    p_limit: GUEST_REQUESTS_PER_MINUTE,
  });
  if (error) {
    console.error("Guest request limit check failed", error.code);
    return; // fail open: browsing must not break if the limiter is unavailable
  }
  if (!allowed)
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait a minute or sign in.");
}
