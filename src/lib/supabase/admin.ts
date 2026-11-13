import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

// Bypasses RLS. Use only for server-side bookkeeping (the guest request limit), never for user data.
export function createAdminClient() {
  const env = getServerEnv();
  if (!env.SUPABASE_SECRET_KEY) return null;
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
