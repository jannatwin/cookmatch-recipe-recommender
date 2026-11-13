import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RECENT_RECIPES_KEY,
  RECENT_RECIPES_LIMIT,
  readRecentRecipes,
  rememberRecentRecipe,
} from "./recent-recipes.ts";

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

test("remembering a recipe puts it first and removes the older copy", () => {
  const store = memoryStore();
  rememberRecentRecipe(store, { recipeId: 1, title: "A", imageUrl: null });
  rememberRecentRecipe(store, { recipeId: 2, title: "B", imageUrl: "https://example.com/b.jpg" });
  const list = rememberRecentRecipe(store, { recipeId: 1, title: "A", imageUrl: null });
  assert.deepEqual(
    list.map((item) => item.recipeId),
    [1, 2],
  );
  assert.deepEqual(
    readRecentRecipes(store).map((item) => item.recipeId),
    [1, 2],
  );
});

test("history is capped", () => {
  const store = memoryStore();
  for (let id = 1; id <= RECENT_RECIPES_LIMIT + 3; id += 1)
    rememberRecentRecipe(store, { recipeId: id, title: `R${id}`, imageUrl: null });
  assert.equal(readRecentRecipes(store).length, RECENT_RECIPES_LIMIT);
});

test("bad, tampered or missing storage reads as empty history", () => {
  assert.deepEqual(readRecentRecipes(undefined), []);
  assert.deepEqual(readRecentRecipes(memoryStore({ [RECENT_RECIPES_KEY]: "{not json" })), []);
  assert.deepEqual(
    readRecentRecipes(
      memoryStore({ [RECENT_RECIPES_KEY]: '[{"recipeId":"x"},{"recipeId":3,"title":"C","imageUrl":null}]' }),
    ).length,
    1,
  );
  const throwing = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(readRecentRecipes(throwing), []);
  assert.doesNotThrow(() => rememberRecentRecipe(throwing, { recipeId: 1, title: "A", imageUrl: null }));
});
