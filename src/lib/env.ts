import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SPOONACULAR_API_KEY: z.string().min(1).optional(),
  THEMEALDB_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

export function getPublicSupabaseEnv() {
  return z
    .object({
      url: z.string().url(),
      publishableKey: z.string().min(1),
    })
    .parse({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
}
