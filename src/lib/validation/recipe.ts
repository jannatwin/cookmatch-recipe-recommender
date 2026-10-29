import { z } from "zod";

const idList = z.array(z.coerce.number().int().positive()).refine((ids) => new Set(ids).size === ids.length, {
  message: "IDs must not contain duplicates",
});

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().default(""),
  cuisineId: z.number().int().positive().nullable().optional(),
  cookingTimeMin: z.coerce.number().int().positive().max(1440),
  imageUrl: z.union([z.url(), z.literal("")]).optional().default(""),
  isPublished: z.boolean().default(false),
  dietaryTagIds: idList.default([]),
  ingredientIds: idList.min(1),
  steps: z.array(z.object({ instruction: z.string().trim().min(1).max(5000) })).min(1).max(100),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;

export function toRecipeRpcInput(recipe: RecipeInput) {
  return {
    title: recipe.title,
    description: recipe.description,
    cuisineId: recipe.cuisineId ?? null,
    cookingTimeMin: recipe.cookingTimeMin,
    imageUrl: recipe.imageUrl || null,
    isPublished: recipe.isPublished,
    ingredients: recipe.ingredientIds.map((ingredient_id) => ({ ingredient_id })),
    dietaryTags: recipe.dietaryTagIds.map((tag_id) => ({ tag_id })),
    steps: recipe.steps.map((step, index) => ({ step_number: index + 1, instruction: step.instruction })),
  };
}
