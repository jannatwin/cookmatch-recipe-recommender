"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { RecipeCard } from "@/components/recipe-card";
import { buttonSecondary, EmptyState, PageHeading } from "@/components/ui";

type SavedRecipe = {
  recipeId: number;
  title: string;
  imageUrl: string | null;
  cookingTimeMin: number | null;
  cuisine: string | null;
  ingredientCount: number;
};

export function SavedRecipes() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ data: SavedRecipe[] }>("/api/v1/favorites")
      .then(({ data }) => {
        if (active) setRecipes(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load saved recipes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeading
        eyebrow="Your cookbook"
        title="Saved recipes"
        description="Recipes you have saved, newest first. Open one to see how well it matches your pantry today."
        action={
          <Link href="/recipes" className={buttonSecondary}>
            Browse recipes
          </Link>
        }
      />
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div role="status" className="rounded-3xl bg-white/60 px-5 py-10 text-center font-semibold">
          Loading saved recipes…
        </div>
      ) : recipes.length === 0 && !error ? (
        <EmptyState
          title="No saved recipes yet"
          description="Tap “Save recipe” on any recipe to keep it here for later."
          action={
            <Link href="/recipes" className={buttonSecondary}>
              Find something to save
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.recipeId}
              recipe={{
                href: `/recipes/${recipe.recipeId}`,
                title: recipe.title,
                imageUrl: recipe.imageUrl,
                cuisine: recipe.cuisine,
                cookingTimeMin: recipe.cookingTimeMin,
                requiredCount: recipe.ingredientCount,
                haveCount: 0,
                missingCount: 0,
                matchScore: 0,
                missingIngredients: [],
                providerLabel: "Saved",
                guest: true,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
