"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { browserStore, readRecentRecipes, RECENT_RECIPES_KEY, type RecentRecipe } from "@/lib/recent-recipes";
import { RecipeImage } from "@/components/ui";

const empty: RecentRecipe[] = [];
let cachedRaw: string | null = null;
let cached: RecentRecipe[] = empty;

function snapshot() {
  const store = browserStore();
  let raw: string | null = null;
  try {
    raw = store?.getItem(RECENT_RECIPES_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = readRecentRecipes(store);
  }
  return cached;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Recipes this browser opened recently. Stored locally only, so it also works for guests.
export function RecentlyViewed() {
  const recipes = useSyncExternalStore(subscribe, snapshot, () => empty);
  if (!recipes.length) return null;
  return (
    <section aria-labelledby="recently-viewed" className="mb-8">
      <h2 id="recently-viewed" className="mb-3 text-lg font-extrabold">
        Recently viewed
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-2">
        {recipes.map((recipe) => (
          <li key={recipe.recipeId} className="w-40 shrink-0">
            <Link
              href={`/recipes/${recipe.recipeId}`}
              className="block overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-clay focus-visible:outline-4 focus-visible:outline-cocoa"
            >
              <RecipeImage src={recipe.imageUrl} alt={recipe.title} className="h-24 w-full" />
              <span className="line-clamp-2 block p-2.5 text-sm font-bold leading-snug">{recipe.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
