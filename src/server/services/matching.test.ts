import assert from "node:assert/strict";
import { test } from "node:test";
import { isAlmostAchievable, isExpiringSoon, matchScore, normalizeIngredientName } from "./matching.ts";

test("matchScore is the percentage of required ingredients owned", () => {
  assert.equal(matchScore(3, 3), 100);
  assert.equal(matchScore(3, 5), 60);
  assert.equal(matchScore(2, 3), 66.7);
  assert.equal(matchScore(0, 2), 0);
  assert.equal(matchScore(0, 0), 0);
});

test("pantry staples count a quarter as much as other ingredients", () => {
  // Fried rice fixture: rice, egg, butter, onion + salt (staple); the user has egg, onion and salt.
  assert.equal(matchScore(3, 5, 1, 1), 52.9);
  // Owning only the staple of a four-ingredient recipe is worth very little.
  assert.equal(matchScore(1, 4, 1, 1), 7.7);
  // A full match is still 100, and a recipe made only of staples does not divide by zero.
  assert.equal(matchScore(5, 5, 2, 2), 100);
  assert.equal(matchScore(1, 2, 1, 2), 50);
  assert.equal(matchScore(0, 0, 0, 0), 0);
});

test("one or two missing ingredients is almost achievable", () => {
  assert.deepEqual([0, 1, 2, 3].map(isAlmostAchievable), [false, true, true, false]);
});

test("expiring soon covers today through the warning window only", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  assert.equal(isExpiringSoon("2026-11-10", now), true);
  assert.equal(isExpiringSoon("2026-11-13", now), true);
  assert.equal(isExpiringSoon("2026-11-14", now), false);
  assert.equal(isExpiringSoon("2026-11-09", now), false);
  assert.equal(isExpiringSoon(null, now), false);
});

test("normalizeIngredientName folds case, width and spacing", () => {
  assert.equal(normalizeIngredientName("  ONION "), "onion");
  assert.equal(normalizeIngredientName("Olive   Oil"), "olive oil");
  assert.equal(normalizeIngredientName("Ｅｇｇ"), "egg");
});
