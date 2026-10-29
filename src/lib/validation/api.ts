import { z } from "zod";
import { ApiError } from "@/lib/api/errors";

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must use YYYY-MM-DD format")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "must be a valid date")
  .refine((value) => value >= new Date().toISOString().slice(0, 10), "cannot be in the past");

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const pantryItemInputSchema = z
  .object({
    ingredientId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    expiryDate: dateOnlySchema.nullable().optional(),
  })
  .refine((item) => Number(item.ingredientId !== undefined) + Number(item.name !== undefined) === 1, {
    message: "provide exactly one of ingredientId or name",
  });

export const replacePantrySchema = z.object({
  // Empty list is accepted so a user can clear their pantry.
  items: z.array(pantryItemInputSchema).max(100),
});

export const recommendationQuerySchema = z.object({
  cuisine: z.coerce.number().int().positive().optional(),
  maxTime: z.coerce.number().int().positive().max(1440).optional(),
  diet: z.string().trim().min(1).max(50).optional(),
  almostOnly: z.enum(["true", "false"]).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const ingredientSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().positive().max(20).default(10),
});

export function zodDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    issue: issue.message,
  }));
}

export async function parseJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "The request contains invalid fields", zodDetails(result.error));
  }
  return result.data;
}
