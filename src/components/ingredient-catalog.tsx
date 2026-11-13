"use client";

import type { PantryItem } from "@/components/pantry-item-card";

export type CatalogIngredient = { ingredientId: number; name: string };

// Every ingredient used by a published recipe; picking one adds it to the pantry input.
export function IngredientCatalog({
  ingredients,
  pantry,
  onPick,
}: {
  ingredients: CatalogIngredient[];
  pantry: PantryItem[];
  onPick: (name: string) => void;
}) {
  if (!ingredients.length) return null;
  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="text-sm font-extrabold">
        Ingredients list <span className="ml-1 font-bold text-subtle">{ingredients.length}</span>
      </h3>
      <p className="mt-1 text-sm text-muted">
        Everything our recipes use. Pick the ones you have, then press Add to pantry.
      </p>
      <ul className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-auto p-1">
        {ingredients.map((ingredient) => {
          const owned = pantry.some((item) => item.ingredientId === ingredient.ingredientId);
          return (
            <li key={ingredient.ingredientId}>
              <button
                type="button"
                disabled={owned}
                onClick={() => onPick(ingredient.name)}
                className="min-h-9 rounded-full border border-line-strong bg-white px-3 text-sm font-bold transition hover:bg-mint/60 focus-visible:outline-4 focus-visible:outline-cocoa disabled:border-transparent disabled:bg-mint disabled:text-success"
              >
                {owned && <span aria-hidden="true">✓ </span>}
                {ingredient.name}
                {owned && <span className="sr-only"> (in your pantry)</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
