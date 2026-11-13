export type RecentRecipe = { recipeId: number; title: string; imageUrl: string | null };

export const RECENT_RECIPES_KEY = "cookmatch:recent-recipes";
export const RECENT_RECIPES_LIMIT = 8;

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

function isRecentRecipe(value: unknown): value is RecentRecipe {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    Number.isInteger(item.recipeId) &&
    typeof item.title === "string" &&
    (item.imageUrl === null || typeof item.imageUrl === "string")
  );
}

// Recently viewed recipes live only in this browser. Storage can be missing or blocked
// (private windows, previews), so every access is guarded and failures mean "no history".
export function readRecentRecipes(store: KeyValueStore | undefined): RecentRecipe[] {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(RECENT_RECIPES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isRecentRecipe).slice(0, RECENT_RECIPES_LIMIT) : [];
  } catch {
    return [];
  }
}

export function rememberRecentRecipe(store: KeyValueStore | undefined, recipe: RecentRecipe) {
  const next = [
    recipe,
    ...readRecentRecipes(store).filter((item) => item.recipeId !== recipe.recipeId),
  ].slice(0, RECENT_RECIPES_LIMIT);
  try {
    store?.setItem(RECENT_RECIPES_KEY, JSON.stringify(next));
  } catch {
    // Quota or privacy settings: history is a convenience, so ignore.
  }
  return next;
}

export function browserStore() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
