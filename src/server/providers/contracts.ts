export type ProviderRecipeSummary = {
  provider: "themealdb" | "spoonacular";
  sourceId: string;
  title: string;
  imageUrl: string | null;
  usedIngredientNames: string[];
  missingIngredientNames: string[];
  sourceUrl: string | null;
};

export type ProviderRecipeDetail = ProviderRecipeSummary & {
  description: string | null;
  cuisine: string | null;
  cookingTimeMin: number | null;
  dietaryTags: string[];
  ingredients: Array<{ name: string; amount: string | null; unit: string | null }>;
  steps: string[];
  attribution: string;
};

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: "not_configured" | "rate_limited" | "unavailable" | "invalid_response",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface RecipeProvider {
  searchByIngredients(ingredients: string[], limit?: number): Promise<ProviderRecipeSummary[]>;
  getRecipe(sourceId: string): Promise<ProviderRecipeDetail | null>;
}
